import type { AdministrativeUnitsReferenceDto } from '../types/erp';
import { ALGERIAN_WILAYAS } from './algerianFormat';

/**
 * Contract mirror used only by the Vite in-memory preview.
 * Production always reads the server-owned catalogue from ASP.NET Core.
 */
export const DEV_PREVIEW_ADMINISTRATIVE_REFERENCE: AdministrativeUnitsReferenceDto = {
  version: '2026-06-03-wilayas-69',
  effectiveDate: '2026-06-03',
  legalSource: 'Law 26-06 (JO 25) / Decree 26-206 (JO 40)',
  communeDatasetStatus: 'PendingOfficialVerification',
  communeLegalBaselineCount: 1541,
  communesCount: 0,
  wilayas: ALGERIAN_WILAYAS.map((wilaya) => ({
    code: wilaya.code,
    nameAr: wilaya.nameAr,
    nameFr: wilaya.nameFr,
    canonicalDisplayName: `${wilaya.nameAr} / ${wilaya.nameFr}`,
  })),
};
