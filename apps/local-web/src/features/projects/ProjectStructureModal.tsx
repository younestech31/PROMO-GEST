import { useEffect, useState, type FormEvent } from 'react';
import { Building2, ChevronDown, ChevronRight, Layers3, Pencil, Plus, X } from 'lucide-react';
import type {
  AppLanguage,
  BuildingStructureDto,
  BuildingFloorDto,
  ProjectDto,
  ProjectStructureDto,
  PropertyUnitDto,
} from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { apiClient, ApiError } from '../../services/apiClient';
import { FormField, inputBaseClass } from '../../components/FormField';

interface ProjectStructureModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canManage: boolean;
  onClose: () => void;
}

const BUILDING_STATUSES = [
  { code: 'Planned', ar: 'مخططة', fr: 'Planifié' },
  { code: 'UnderConstruction', ar: 'قيد الإنجاز', fr: 'En construction' },
  { code: 'Completed', ar: 'مكتملة', fr: 'Terminé' },
  { code: 'Suspended', ar: 'معلقة', fr: 'Suspendu' },
];

const UNIT_TYPES = [
  { code: 'Apartment', ar: 'شقة', fr: 'Appartement' },
  { code: 'Shop', ar: 'محل تجاري', fr: 'Commerce' },
  { code: 'ParkingSpace', ar: 'موقف سيارة', fr: 'Place de parking' },
  { code: 'Office', ar: 'مكتب', fr: 'Bureau' },
  { code: 'Storage', ar: 'مخزن', fr: 'Dépôt' },
];

const UNIT_STATUSES = [
  { code: 'Planned', ar: 'مخططة', fr: 'Prévue' },
  { code: 'UnderConstruction', ar: 'قيد الإنجاز', fr: 'En construction' },
  { code: 'AvailableForSale', ar: 'متاحة للبيع', fr: 'Disponible à la vente' },
  { code: 'Reserved', ar: 'محجوزة', fr: 'Réservé' },
  { code: 'Sold', ar: 'مباعة', fr: 'Vendu' },
  { code: 'Delivered', ar: 'مسلمة', fr: 'Livré' },
  { code: 'Withdrawn', ar: 'مسحوبة', fr: 'Retiré' },
];

export function ProjectStructureModal({
  project,
  language,
  canManage,
  onClose,
}: ProjectStructureModalProps) {
  const t = getTranslations(language);
  const labels = t.projects;

  const [structure, setStructure] = useState<ProjectStructureDto | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [buildingForm, setBuildingForm] = useState({
    code: '',
    nameAr: '',
    nameFr: '',
    status: 'Planned',
  });
  const [floorForm, setFloorForm] = useState({
    floorNumber: 0,
    nameAr: '',
    nameFr: '',
  });
  const [unitForm, setUnitForm] = useState({
    unitNumber: '',
    unitType: 'Apartment',
    status: 'Planned',
    grossAreaSquareMeters: '',
    netAreaSquareMeters: '',
    roomsCount: '',
  });

  const loadStructure = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getProjectStructure(project.id);
      setStructure(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (language === 'ar' ? 'تعذر تحميل الهيكل العقاري للمشروع.' : 'Impossible de charger la structure du projet.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStructure();
  }, [project.id, language]);

  const selectedBuilding = structure?.buildings.find(
    (building) => building.id === selectedBuildingId
  ) ?? null;
  const selectedFloor = selectedBuilding?.floors.find(
    (floor) => floor.id === selectedFloorId
  ) ?? null;
  const selectedUnit = selectedFloor?.units.find((unit) => unit.id === editingUnitId) ?? null;
  const salesManagedUnitStatuses = ['Reserved', 'Sold', 'Delivered'];
  const unitStatusOptions = UNIT_STATUSES.filter(
    (status) => !salesManagedUnitStatuses.includes(status.code) || status.code === selectedUnit?.status
  );
  const selectedUnitHasSalesManagedStatus = Boolean(
    selectedUnit && salesManagedUnitStatuses.includes(selectedUnit.status)
  );

  const showMutationError = (err: unknown, fallbackAr: string, fallbackFr: string) => {
    setError(
      err instanceof ApiError
        ? translateApiError(err.code, err.message, language)
        : (language === 'ar' ? fallbackAr : fallbackFr)
    );
  };

  const handleCreateBuilding = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = editingBuildingId
        ? await apiClient.updateProjectBuilding(project.id, editingBuildingId, buildingForm)
        : await apiClient.createProjectBuilding(project.id, buildingForm);
      setStructure(result);

      if (!editingBuildingId) {
        const created = result.buildings.find(
          (building) => building.code === buildingForm.code.trim().toUpperCase()
        );
        if (created) {
          setSelectedBuildingId(created.id);
          setSelectedFloorId(null);
        }
      }

      setBuildingForm({ code: '', nameAr: '', nameFr: '', status: 'Planned' });
      setEditingBuildingId(null);
      setShowBuildingForm(false);
    } catch (err) {
      showMutationError(
        err,
        editingBuildingId ? 'فشل تعديل بيانات العمارة.' : 'فشل إضافة العمارة.',
        editingBuildingId ? 'Échec de la modification du bâtiment.' : 'Échec de l’ajout du bâtiment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFloor = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !selectedBuilding) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = editingFloorId
        ? await apiClient.updateBuildingFloor(
            project.id,
            selectedBuilding.id,
            editingFloorId,
            floorForm
          )
        : await apiClient.createBuildingFloor(project.id, selectedBuilding.id, floorForm);
      setStructure(result);

      if (!editingFloorId) {
        const updatedBuilding = result.buildings.find(
          (building) => building.id === selectedBuilding.id
        );
        const createdFloor = updatedBuilding?.floors.find(
          (floor) => floor.floorNumber === floorForm.floorNumber
        );
        if (createdFloor) setSelectedFloorId(createdFloor.id);
      }

      setFloorForm({ floorNumber: 0, nameAr: '', nameFr: '' });
      setEditingFloorId(null);
      setShowFloorForm(false);
    } catch (err) {
      showMutationError(
        err,
        editingFloorId ? 'فشل تعديل بيانات الطابق.' : 'فشل إضافة الطابق.',
        editingFloorId ? 'Échec de la modification de l’étage.' : 'Échec de l’ajout de l’étage.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUnit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !selectedBuilding || !selectedFloor) return;
    setError(null);
    setSubmitting(true);
    const payload = {
      unitNumber: unitForm.unitNumber,
      unitType: unitForm.unitType,
      status: unitForm.status,
      grossAreaSquareMeters: unitForm.grossAreaSquareMeters === ''
        ? null
        : Number(unitForm.grossAreaSquareMeters),
      netAreaSquareMeters: unitForm.netAreaSquareMeters === ''
        ? null
        : Number(unitForm.netAreaSquareMeters),
      roomsCount: unitForm.roomsCount === '' ? null : Number(unitForm.roomsCount),
    };
    try {
      const result = editingUnitId
        ? await apiClient.updateFloorUnit(
            project.id,
            selectedBuilding.id,
            selectedFloor.id,
            editingUnitId,
            payload
          )
        : await apiClient.createFloorUnit(
            project.id,
            selectedBuilding.id,
            selectedFloor.id,
            payload
          );
      setStructure(result);
      setUnitForm({
        unitNumber: '',
        unitType: 'Apartment',
        status: 'Planned',
        grossAreaSquareMeters: '',
        netAreaSquareMeters: '',
        roomsCount: '',
      });
      setEditingUnitId(null);
      setShowUnitForm(false);
    } catch (err) {
      showMutationError(
        err,
        editingUnitId ? 'فشل تعديل بيانات الوحدة العقارية.' : 'فشل إضافة الوحدة العقارية.',
        editingUnitId ? 'Échec de la modification de l’unité immobilière.' : 'Échec de l’ajout de l’unité immobilière.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEditBuilding = (building: BuildingStructureDto) => {
    setEditingBuildingId(building.id);
    setBuildingForm({
      code: building.code,
      nameAr: building.nameAr,
      nameFr: building.nameFr,
      status: building.status,
    });
    setShowBuildingForm(true);
    setShowFloorForm(false);
    setShowUnitForm(false);
    setEditingFloorId(null);
    setEditingUnitId(null);
    setError(null);
  };

  const openEditFloor = (floor: BuildingFloorDto) => {
    setEditingFloorId(floor.id);
    setFloorForm({
      floorNumber: floor.floorNumber,
      nameAr: floor.nameAr,
      nameFr: floor.nameFr,
    });
    setShowFloorForm(true);
    setShowBuildingForm(false);
    setShowUnitForm(false);
    setEditingBuildingId(null);
    setEditingUnitId(null);
    setError(null);
  };

  const openEditUnit = (unit: PropertyUnitDto) => {
    setEditingUnitId(unit.id);
    setUnitForm({
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      status: unit.status,
      grossAreaSquareMeters: unit.grossAreaSquareMeters?.toString() ?? '',
      netAreaSquareMeters: unit.netAreaSquareMeters?.toString() ?? '',
      roomsCount: unit.roomsCount?.toString() ?? '',
    });
    setShowUnitForm(true);
    setShowBuildingForm(false);
    setShowFloorForm(false);
    setEditingBuildingId(null);
    setEditingFloorId(null);
    setError(null);
  };

  const statusLabel = (code: string) => {
    const item = [...BUILDING_STATUSES, ...UNIT_STATUSES].find((entry) => entry.code === code);
    return item ? (language === 'ar' ? item.ar : item.fr) : code;
  };

  const unitTypeLabel = (code: string) => {
    const item = UNIT_TYPES.find((entry) => entry.code === code);
    return item ? (language === 'ar' ? item.ar : item.fr) : code;
  };

  const selectedBuildingName = (building: BuildingStructureDto) =>
    language === 'ar' ? building.nameAr : building.nameFr;
  const selectedFloorName = (floor: BuildingFloorDto) =>
    language === 'ar' ? floor.nameAr : floor.nameFr;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/60 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-structure-title"
    >
      <div className="bg-white w-full max-w-7xl max-h-[94vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id="project-structure-title" className="font-bold text-slate-900">
              {labels.structureTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              <span className="font-data">{project.code}</span> ·{' '}
              {language === 'ar' ? project.nameAr : project.nameFr}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-10 rounded bg-slate-100 animate-pulse" />
            <div className="h-10 rounded bg-slate-100 animate-pulse" />
            <div className="h-10 rounded bg-slate-100 animate-pulse" />
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
            <section className="border border-slate-200 rounded-lg min-w-0">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                  <Building2 className="w-4 h-4 text-teal-800" />
                  {labels.buildings}
                  <span className="text-xs font-data text-slate-500">({structure?.buildings.length ?? 0})</span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBuildingId(null);
                      setBuildingForm({ code: '', nameAr: '', nameFr: '', status: 'Planned' });
                      setShowBuildingForm((value) => !value);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {labels.createBuilding}
                  </button>
                )}
              </div>

              {canManage && showBuildingForm && (
                <form onSubmit={handleCreateBuilding} className="p-3 space-y-3 border-b border-slate-100 bg-slate-50/70">
                  <FormField id="structure-building-code" label={labels.buildingCode}>
                    <input
                      id="structure-building-code"
                      required
                      value={buildingForm.code}
                      onChange={(event) => setBuildingForm((form) => ({ ...form, code: event.target.value }))}
                      className={inputBaseClass}
                      dir="ltr"
                    />
                  </FormField>
                  <FormField id="structure-building-name-ar" label={labels.buildingNameAr}>
                    <input
                      id="structure-building-name-ar"
                      value={buildingForm.nameAr}
                      onChange={(event) => setBuildingForm((form) => ({ ...form, nameAr: event.target.value }))}
                      className={inputBaseClass}
                    />
                  </FormField>
                  <FormField id="structure-building-name-fr" label={labels.buildingNameFr}>
                    <input
                      id="structure-building-name-fr"
                      value={buildingForm.nameFr}
                      onChange={(event) => setBuildingForm((form) => ({ ...form, nameFr: event.target.value }))}
                      className={inputBaseClass}
                      dir="ltr"
                    />
                  </FormField>
                  <FormField id="structure-building-status" label={labels.buildingStatus}>
                    <select
                      id="structure-building-status"
                      value={buildingForm.status}
                      onChange={(event) => setBuildingForm((form) => ({ ...form, status: event.target.value }))}
                      className={inputBaseClass}
                    >
                      {BUILDING_STATUSES.map((status) => (
                        <option key={status.code} value={status.code}>
                          {language === 'ar' ? status.ar : status.fr}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowBuildingForm(false); setEditingBuildingId(null); }}
                      className="text-xs px-3 py-2 border rounded border-slate-200"
                    >
                      {t.users.cancel}
                    </button>
                    <button type="submit" disabled={submitting} className="text-xs px-3 py-2 rounded bg-teal-800 text-white disabled:opacity-60">
                      {editingBuildingId ? labels.saveStructure : labels.createBuilding}
                    </button>
                  </div>
                </form>
              )}

              <div className="p-2 space-y-1">
                {!structure?.buildings.length ? (
                  <p className="text-xs text-slate-500 p-4 text-center">{labels.structureEmpty}</p>
                ) : structure.buildings.map((building) => (
                  <div
                    key={building.id}
                    className={`rounded-md border px-2 py-2 flex items-center gap-2 ${selectedBuildingId === building.id ? 'border-teal-700 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBuildingId(building.id);
                        setSelectedFloorId(null);
                        setShowFloorForm(false);
                        setShowUnitForm(false);
                        setEditingFloorId(null);
                        setEditingUnitId(null);
                      }}
                      className="flex-1 min-w-0 text-start flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800 truncate">
                          <span className="font-data">{building.code}</span> · {selectedBuildingName(building)}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {building.floors.length} {labels.floors} · {statusLabel(building.status)}
                        </span>
                      </span>
                      {selectedBuildingId === building.id ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        aria-label={labels.editBuilding}
                        title={labels.editBuilding}
                        onClick={() => openEditBuilding(building)}
                        className="shrink-0 rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-white"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-slate-200 rounded-lg min-w-0">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                  <Layers3 className="w-4 h-4 text-teal-800" />
                  {labels.floors}
                </div>
                {canManage && selectedBuilding && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFloorId(null);
                      setFloorForm({ floorNumber: 0, nameAr: '', nameFr: '' });
                      setShowFloorForm((value) => !value);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {labels.addFloor}
                  </button>
                )}
              </div>

              {!selectedBuilding ? (
                <p className="text-xs text-slate-500 p-5 text-center">{language === 'ar' ? 'اختر عمارة لعرض طوابقها.' : 'Sélectionnez un bâtiment pour afficher ses étages.'}</p>
              ) : (
                <>
                  {canManage && showFloorForm && (
                    <form onSubmit={handleCreateFloor} className="p-3 space-y-3 border-b border-slate-100 bg-slate-50/70">
                      <FormField id="structure-floor-number" label={labels.floorNumber}>
                        <input
                          id="structure-floor-number"
                          type="number"
                          min="-10"
                          max="200"
                          required
                          value={floorForm.floorNumber}
                          onChange={(event) => setFloorForm((form) => ({ ...form, floorNumber: Number(event.target.value) }))}
                          className={`${inputBaseClass} font-data`}
                          dir="ltr"
                        />
                      </FormField>
                      <FormField id="structure-floor-name-ar" label={labels.floorNameAr}>
                        <input
                          id="structure-floor-name-ar"
                          value={floorForm.nameAr}
                          onChange={(event) => setFloorForm((form) => ({ ...form, nameAr: event.target.value }))}
                          className={inputBaseClass}
                        />
                      </FormField>
                      <FormField id="structure-floor-name-fr" label={labels.floorNameFr}>
                        <input
                          id="structure-floor-name-fr"
                          value={floorForm.nameFr}
                          onChange={(event) => setFloorForm((form) => ({ ...form, nameFr: event.target.value }))}
                          className={inputBaseClass}
                          dir="ltr"
                        />
                      </FormField>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowFloorForm(false); setEditingFloorId(null); }}
                          className="text-xs px-3 py-2 border rounded border-slate-200"
                        >{t.users.cancel}</button>
                        <button type="submit" disabled={submitting} className="text-xs px-3 py-2 rounded bg-teal-800 text-white disabled:opacity-60">{editingFloorId ? labels.saveStructure : labels.addFloor}</button>
                      </div>
                    </form>
                  )}
                  <div className="p-2 space-y-1">
                    {!selectedBuilding.floors.length ? (
                      <p className="text-xs text-slate-500 p-4 text-center">{labels.noFloors}</p>
                    ) : selectedBuilding.floors.map((floor) => (
                      <div
                        key={floor.id}
                        className={`rounded-md border px-2 py-2 flex items-center gap-2 ${selectedFloorId === floor.id ? 'border-teal-700 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFloorId(floor.id)}
                          className="flex-1 min-w-0 text-start flex items-center justify-between gap-2"
                        >
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">
                              <span className="font-data">{floor.floorNumber}</span> · {selectedFloorName(floor)}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">{floor.units.length} {labels.units}</span>
                          </span>
                          {selectedFloorId === floor.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            aria-label={labels.editFloor}
                            title={labels.editFloor}
                            onClick={() => openEditFloor(floor)}
                            className="shrink-0 rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-white"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="border border-slate-200 rounded-lg min-w-0">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="font-semibold text-sm text-slate-800">{labels.units}</div>
                {selectedFloor && (
                  <button
                    type="button"
                    onClick={() => setShowUnitForm((value) => !value)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {labels.addUnit}
                  </button>
                )}
              </div>

              {!selectedFloor ? (
                <p className="text-xs text-slate-500 p-5 text-center">{language === 'ar' ? 'اختر طابقاً لعرض وحداته العقارية.' : 'Sélectionnez un étage pour afficher ses unités.'}</p>
              ) : (
                <>
                  {showUnitForm && (
                    <form onSubmit={handleCreateUnit} className="p-3 space-y-3 border-b border-slate-100 bg-slate-50/70">
                      <FormField id="structure-unit-number" label={labels.unitNumber}>
                        <input
                          id="structure-unit-number"
                          required
                          value={unitForm.unitNumber}
                          onChange={(event) => setUnitForm((form) => ({ ...form, unitNumber: event.target.value }))}
                          className={inputBaseClass}
                          dir="ltr"
                        />
                      </FormField>
                      <FormField id="structure-unit-type" label={labels.unitType}>
                        <select
                          id="structure-unit-type"
                          value={unitForm.unitType}
                          onChange={(event) => setUnitForm((form) => ({ ...form, unitType: event.target.value }))}
                          className={inputBaseClass}
                        >
                          {UNIT_TYPES.map((type) => (
                            <option key={type.code} value={type.code}>{language === 'ar' ? type.ar : type.fr}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField id="structure-unit-status" label={labels.unitStatus}>
                        <select
                          id="structure-unit-status"
                          value={unitForm.status}
                          onChange={(event) => setUnitForm((form) => ({ ...form, status: event.target.value }))}
                          className={inputBaseClass}
                        >
                          {UNIT_STATUSES.map((status) => (
                            <option key={status.code} value={status.code}>{language === 'ar' ? status.ar : status.fr}</option>
                          ))}
                        </select>
                      </FormField>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField id="structure-unit-gross" label={labels.grossArea}>
                          <input
                            id="structure-unit-gross"
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitForm.grossAreaSquareMeters}
                            onChange={(event) => setUnitForm((form) => ({ ...form, grossAreaSquareMeters: event.target.value }))}
                            className={`${inputBaseClass} font-data`}
                            dir="ltr"
                          />
                        </FormField>
                        <FormField id="structure-unit-net" label={labels.netArea}>
                          <input
                            id="structure-unit-net"
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitForm.netAreaSquareMeters}
                            onChange={(event) => setUnitForm((form) => ({ ...form, netAreaSquareMeters: event.target.value }))}
                            className={`${inputBaseClass} font-data`}
                            dir="ltr"
                          />
                        </FormField>
                      </div>
                      <FormField id="structure-unit-rooms" label={labels.roomsCount}>
                        <input
                          id="structure-unit-rooms"
                          type="number"
                          min="0"
                          max="20"
                          value={unitForm.roomsCount}
                          onChange={(event) => setUnitForm((form) => ({ ...form, roomsCount: event.target.value }))}
                          className={`${inputBaseClass} font-data`}
                          dir="ltr"
                        />
                      </FormField>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowUnitForm(false)} className="text-xs px-3 py-2 border rounded border-slate-200">{language === 'ar' ? 'إلغاء' : 'Annuler'}</button>
                        <button type="submit" disabled={submitting} className="text-xs px-3 py-2 rounded bg-teal-800 text-white disabled:opacity-60">{labels.addUnit}</button>
                      </div>
                    </form>
                  )}
                  <div className="p-2 space-y-1">
                    {!selectedFloor.units.length ? (
                      <p className="text-xs text-slate-500 p-4 text-center">{labels.noUnits}</p>
                    ) : selectedFloor.units.map((unit) => (
                      <div key={unit.id} className="rounded-md border border-slate-100 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-data font-semibold text-sm text-slate-900">{unit.unitNumber}</span>
                          <span className="text-[11px] text-slate-600">{statusLabel(unit.status)}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{unitTypeLabel(unit.unitType)}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                          {unit.grossAreaSquareMeters !== null && <span>{labels.grossArea}: <span className="font-data">{unit.grossAreaSquareMeters}</span></span>}
                          {unit.netAreaSquareMeters !== null && <span>{labels.netArea}: <span className="font-data">{unit.netAreaSquareMeters}</span></span>}
                          {unit.roomsCount !== null && <span>{labels.roomsCount}: <span className="font-data">{unit.roomsCount}</span></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
