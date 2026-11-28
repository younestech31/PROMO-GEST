import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement } from 'react';
import { ProjectStructureModal } from '../modules/module-c-structure';
import { apiClient, ApiError } from '../core/api/apiClient';
import { getTranslations } from '../core/localization/translations';
import type { AppLanguage, ProjectDto, ProjectStructureDto } from '../types/erp';
import { deferred, renderReact } from './testSupport/renderReact';

const project = { id: 'p1', code: 'P1', nameAr: 'مشروع', nameFr: 'Projet' } as ProjectDto;
const structure: ProjectStructureDto = {
  projectId: 'p1', buildings: [{
    id: 'b1', projectId: 'p1', code: 'B1', nameAr: 'عمارة', nameFr: 'Bâtiment', status: 'Planned',
    createdAtUtc: '', updatedAtUtc: '', concurrencyStamp: 'building-v1', floors: [{
      id: 'f1', buildingId: 'b1', floorNumber: 1, nameAr: 'طابق', nameFr: 'Étage',
      createdAtUtc: '', updatedAtUtc: '', concurrencyStamp: 'floor-v1', units: [{
        id: 'u1', floorId: 'f1', unitNumber: 'U1', unitType: 'Apartment', status: 'Planned',
        grossAreaSquareMeters: 80, netAreaSquareMeters: 70, roomsCount: 3,
        createdAtUtc: '', updatedAtUtc: '', concurrencyStamp: 'unit-v1',
      }],
    }],
  }],
};

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`structure (${language}): failed load is not an empty editable registry; retry and language are read-only`, async () => {
    const original = apiClient.getProjectStructure;
    const reads: Array<ReturnType<typeof deferred<ProjectStructureDto>>> = [];
    apiClient.getProjectStructure = () => {
      const result = deferred<ProjectStructureDto>(); reads.push(result); return result.promise;
    };
    const element = (lang = language) => createElement(ProjectStructureModal, { project, language: lang, mode: 'embedded' });
    const ui = await renderReact(element());
    try {
      await act(async () => reads[0].reject(new Error('PRIVATE-ERROR')));
      assert.ok(ui.container.querySelector('[role="alert"]'));
      assert.equal(ui.container.querySelector('form'), null);
      assert.doesNotMatch(ui.container.textContent ?? '', /PRIVATE-ERROR/);
      await ui.click(language === 'ar' ? 'إعادة تحميل الهيكل' : 'Recharger la structure');
      assert.equal(ui.container.querySelector('[aria-busy="true"]')?.getAttribute('role'), 'status');
      await act(async () => reads[1].resolve({ projectId: 'p1', buildings: [] }));
      assert.equal(ui.container.querySelector('[role="alert"]'), null);
      await ui.click(getTranslations(language).projects.createBuilding);
      await ui.change('#structure-building-code', 'DRAFT');
      await ui.render(element(language === 'ar' ? 'fr' : 'ar'));
      assert.equal((ui.container.querySelector('#structure-building-code') as HTMLInputElement).value, 'DRAFT');
      assert.equal(reads.length, 2, 'language must not refetch DTOs or discard a draft');
    } finally {
      await ui.cleanup(); apiClient.getProjectStructure = original;
    }
  });

  for (const kind of ['building', 'floor', 'unit', 'edit-unit', 'status'] as const) {
    test(`structure (${language}): ${kind} write locks context, rejects duplicate submits and preserves failed draft/stamp`, async () => {
      const original = { read: apiClient.getProjectStructure, create: apiClient.createProjectBuilding,
        floor: apiClient.createBuildingFloor, unit: apiClient.createFloorUnit,
        update: apiClient.updatePropertyUnit, status: apiClient.changePropertyUnitStatus };
      apiClient.getProjectStructure = async () => structure;
      const writes: Array<{ args: unknown[]; result: ReturnType<typeof deferred<ProjectStructureDto>> }> = [];
      const write = (...args: unknown[]) => {
        const result = deferred<ProjectStructureDto>(); writes.push({ args, result }); return result.promise;
      };
      apiClient.createProjectBuilding = write; apiClient.createBuildingFloor = write;
      apiClient.createFloorUnit = write; apiClient.updatePropertyUnit = write; apiClient.changePropertyUnitStatus = write;
      const labels = getTranslations(language).projects;
      let notifications = 0;
      const ui = await renderReact(createElement(ProjectStructureModal, {
        project, language, mode: 'embedded', onStructureChanged: () => { notifications++; },
      }));
      try {
        let selector = '#structure-building-code';
        if (kind === 'building') {
          await ui.click(labels.createBuilding);
          await ui.change(selector, 'NEW');
        } else {
          await ui.click('B1', false);
          if (kind === 'floor') {
            await ui.click(labels.addFloor);
            selector = '#structure-floor-name-fr';
            await ui.change(selector, 'NEW');
          } else {
            await ui.click('1 ·', false);
            if (kind === 'unit') {
              await ui.click(labels.addUnit);
              selector = '#structure-unit-number';
              await ui.change(selector, 'NEW');
            } else if (kind === 'edit-unit') {
              await ui.click(labels.editUnit);
              selector = '#edit-unit-number-u1';
              await ui.change(selector, 'NEW');
            }
          }
        }
        const submit = async () => {
          if (kind === 'status') await act(async () => {
            ui.button(labels.changeUnitStatus).click();
            ui.button(labels.changeUnitStatus).click();
          });
          else {
            const form = ui.container.querySelector(selector)?.closest('form');
            assert.ok(form);
            await act(async () => {
              // Same event turn: React state alone cannot guard these duplicates.
              form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
              form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
            });
          }
        };
        await submit();
        assert.equal(writes.length, 1);
        for (const control of ui.container.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select')) {
          assert.equal(control.disabled, true, `${kind}: ${control.tagName} must freeze while writing`);
        }
        await act(async () => writes[0].result.reject(new ApiError(409, 'CONCURRENCY_CONFLICT', 'Conflict')));
        assert.ok(ui.container.querySelector('[role="alert"]'));
        if (kind !== 'status') assert.equal((ui.container.querySelector(selector) as HTMLInputElement).value, 'NEW');
        assert.equal(notifications, 0);
        await submit();
        assert.equal(writes.length, 2);
        assert.deepEqual(writes[1].args, writes[0].args, 'retry retains IDs, draft and original concurrency stamp');
        if (kind === 'edit-unit' || kind === 'status') {
          assert.equal((writes[1].args.at(-1) as { expectedConcurrencyStamp: string }).expectedConcurrencyStamp, 'unit-v1');
        }
        await act(async () => writes[1].result.resolve(structure));
        assert.equal(notifications, 1);
        assert.equal(ui.container.querySelector('[role="alert"]'), null);
        if (kind !== 'status') assert.equal(ui.container.querySelector(selector), null);
      } finally {
        await ui.cleanup(); apiClient.getProjectStructure = original.read;
        apiClient.createProjectBuilding = original.create; apiClient.createBuildingFloor = original.floor;
        apiClient.createFloorUnit = original.unit; apiClient.updatePropertyUnit = original.update;
        apiClient.changePropertyUnitStatus = original.status;
      }
    });
  }

  test(`structure (${language}): project change clears draft and ignores old read/write completions`, async () => {
    const original = { read: apiClient.getProjectStructure, write: apiClient.createProjectBuilding };
    const reads: Array<ReturnType<typeof deferred<ProjectStructureDto>>> = [];
    const saved = deferred<ProjectStructureDto>();
    apiClient.getProjectStructure = () => {
      const result = deferred<ProjectStructureDto>(); reads.push(result); return result.promise;
    };
    apiClient.createProjectBuilding = () => saved.promise;
    let notifications = 0;
    const element = (id: string) => createElement(ProjectStructureModal, {
      project: { ...project, id }, language, mode: 'embedded', onStructureChanged: () => { notifications++; },
    });
    const ui = await renderReact(element('p1'));
    try {
      await ui.render(element('p2'));
      await act(async () => reads[0].resolve(structure));
      assert.doesNotMatch(ui.container.textContent ?? '', /B1/);
      await act(async () => reads[1].resolve({ projectId: 'p2', buildings: [] }));
      await ui.click(getTranslations(language).projects.createBuilding);
      await ui.change('#structure-building-code', 'OLD-DRAFT');
      await ui.submit('#structure-building-code');
      await ui.render(element('p3'));
      await act(async () => reads[2].resolve({ projectId: 'p3', buildings: [] }));
      await act(async () => saved.resolve(structure));
      assert.equal(notifications, 0, 'old write cannot notify the new project');
      assert.equal(ui.container.querySelector('#structure-building-code'), null);
      assert.doesNotMatch(ui.container.textContent ?? '', /B1|OLD-DRAFT/);
    } finally {
      await ui.cleanup(); apiClient.getProjectStructure = original.read; apiClient.createProjectBuilding = original.write;
    }
  });
}

for (const language of ['ar', 'fr'] as AppLanguage[]) {
  test(`structure (${language}): local editor transitions require Stay/Discard and never write`, async () => {
    const original = { read: apiClient.getProjectStructure, building: apiClient.createProjectBuilding,
      floor: apiClient.createBuildingFloor, unit: apiClient.createFloorUnit,
      update: apiClient.updatePropertyUnit, status: apiClient.changePropertyUnitStatus };
    const fixture = structuredClone(structure);
    fixture.buildings.push({ ...structuredClone(fixture.buildings[0]), id: 'b2', code: 'B2', floors: [] });
    fixture.buildings[0].floors.push({ ...structuredClone(fixture.buildings[0].floors[0]), id: 'f2', floorNumber: 2, units: [] });
    let writes = 0;
    let reads = 0;
    const write = async () => { writes++; return fixture; };
    apiClient.getProjectStructure = async () => { reads++; return fixture; };
    apiClient.createProjectBuilding = write; apiClient.createBuildingFloor = write;
    apiClient.createFloorUnit = write; apiClient.updatePropertyUnit = write; apiClient.changePropertyUnitStatus = write;
    const labels = getTranslations(language).projects;
    const cases = [
      { source: 'building', target: 'cancel' },
      { source: 'edit-building', target: 'building2' },
      { source: 'floor', target: 'building2' },
      { source: 'edit-floor', target: 'new-building' },
      { source: 'unit', target: 'floor2' },
      { source: 'edit-unit', target: 'new-unit' },
      { source: 'unit', target: 'edit-building' },
      { source: 'edit-unit', target: 'cancel' },
    ] as const;
    try {
      for (const scenario of cases) {
        const dirty: boolean[] = [];
        const ui = await renderReact(createElement(ProjectStructureModal, {
          project, language, mode: 'embedded', onDirtyChange: (value) => dirty.push(value),
        }));
        const icon = async (label: string) => act(async () => {
          const button = ui.container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
          assert.ok(button); button.click();
        });
        try {
          await ui.click('B1', false);
          await ui.click('1 ·', false);
          let field: string;
          switch (scenario.source) {
            case 'building': await ui.click(labels.createBuilding); field = '#structure-building-name-fr'; break;
            case 'edit-building': await icon(labels.editBuilding); field = '#structure-building-name-fr'; break;
            case 'floor': await ui.click(labels.addFloor); field = '#structure-floor-name-fr'; break;
            case 'edit-floor': await icon(labels.editFloor); field = '#structure-floor-name-fr'; break;
            case 'unit': await ui.click(labels.addUnit); field = '#structure-unit-number'; break;
            case 'edit-unit': await ui.click(labels.editUnit); field = '#edit-unit-number-u1'; break;
          }
          await ui.change(field, 'UNSAVED-DRAFT');
          assert.equal(dirty.at(-1), true, scenario.source);
          const transition = async () => {
            switch (scenario.target) {
              case 'cancel': await ui.click(language === 'ar' ? 'إلغاء' : 'Annuler'); break;
              case 'building2': await ui.click('B2', false); break;
              case 'floor2': await ui.click('2 ·', false); break;
              case 'new-building': await ui.click(labels.createBuilding); break;
              case 'new-unit': await ui.click(labels.addUnit); break;
              case 'edit-building': await icon(labels.editBuilding); break;
            }
          };
          await transition();
          assert.ok(ui.container.querySelector('#confirm-dialog-title'), `${scenario.source} -> ${scenario.target}`);
          assert.equal((ui.container.querySelector(field) as HTMLInputElement).value, 'UNSAVED-DRAFT');
          assert.equal(ui.container.querySelectorAll('form').length, 1, 'destination must not open before confirmation');
          await ui.click(language === 'ar' ? 'البقاء في النموذج' : 'Rester sur le formulaire');
          assert.equal((ui.container.querySelector(field) as HTMLInputElement).value, 'UNSAVED-DRAFT');
          assert.equal(dirty.at(-1), true);
          await transition();
          await ui.click(language === 'ar' ? 'تجاهل والمتابعة' : 'Abandonner et continuer');
          assert.equal(ui.container.querySelector('#confirm-dialog-title'), null);
          assert.equal(ui.container.querySelector(field), null, 'old editor must close after explicit discard');
          assert.equal(dirty.at(-1), false);
          assert.equal(writes, 0, 'neither Stay nor Discard may perform a write');
          if (scenario.target === 'new-unit') {
            assert.equal((ui.container.querySelector('#structure-unit-number') as HTMLInputElement).value, '');
          } else if (scenario.target === 'new-building') {
            assert.equal((ui.container.querySelector('#structure-building-name-fr') as HTMLInputElement).value, '');
          } else if (scenario.target === 'edit-building') {
            assert.equal((ui.container.querySelector('#structure-building-name-fr') as HTMLInputElement).value, 'Bâtiment');
          }
          assert.equal(reads, cases.indexOf(scenario) + 1, 'local navigation must not refetch the structure');
        } finally { await ui.cleanup(); }
      }
    } finally {
      apiClient.getProjectStructure = original.read; apiClient.createProjectBuilding = original.building;
      apiClient.createBuildingFloor = original.floor; apiClient.createFloorUnit = original.unit;
      apiClient.updatePropertyUnit = original.update; apiClient.changePropertyUnitStatus = original.status;
    }
  });
}
