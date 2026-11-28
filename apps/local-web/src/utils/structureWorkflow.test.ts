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
