import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPasswordStrength,
  validateCreateEmployee,
  validateSetupRequest,
} from './validation';
import { canManageProjectAccess, canManageUsers, canViewAuditLogs } from './permissions';
import type { AuthenticatedUser, ProjectDto } from '../types/erp';

test('Password strength requires >= 10 chars, upper, lower, and digit', () => {
  assert.equal(checkPasswordStrength('short1A').valid, false);
  assert.equal(checkPasswordStrength('alllowercase123').valid, false);
  assert.equal(checkPasswordStrength('NoDigitsHereAtAll').valid, false);
  assert.equal(checkPasswordStrength('PromoGest2026').valid, true);
});

test('Setup validation rejects mismatched passwords and invalid NIF', () => {
  const errors = validateSetupRequest(
    {
      legalName: 'SARL Promotion',
      legalForm: 'SARL',
      nif: '123',
      wilayaCode: '16',
      wilayaName: 'Alger',
      address: 'Hydra',
      defaultLanguage: 'ar',
      adminUsername: 'admin',
      adminFullName: 'Karim',
      adminEmail: 'karim@promo.dz',
      adminPassword: 'StrongPassword1',
    },
    'Mismatch1',
    'ar'
  );

  assert.ok(errors.nif);
  assert.ok(errors.confirmPassword);
  assert.equal(errors.legalName, undefined);

  const badWilaya = validateSetupRequest(
    {
      legalName: 'SARL Promotion',
      legalForm: 'SARL',
      wilayaCode: '99',
      wilayaName: 'Invalid',
      address: 'Hydra',
      defaultLanguage: 'ar',
      adminUsername: 'admin',
      adminFullName: 'Karim',
      adminEmail: 'karim@promo.dz',
      adminPassword: 'StrongPassword1',
    },
    'StrongPassword1',
    'fr'
  );
  assert.ok(badWilaya.wilayaCode);
});

test('Employee validation prevents assigning SYSTEM_ADMIN role to employees', () => {
  const errors = validateCreateEmployee(
    {
      username: 'employee1',
      fullName: 'Amine',
      email: 'amine@promo.dz',
      password: 'StrongPassword1',
      preferredLanguage: 'fr',
      roleCodes: ['SYSTEM_ADMIN'],
    },
    'fr'
  );
  assert.ok(errors.roleCodes);
});

test('Permission helpers enforce System Admin and project-level roles', () => {
  const sysAdmin: AuthenticatedUser = {
    id: '1',
    username: 'sysadmin',
    fullName: 'Admin',
    email: 'a@b.dz',
    phone: null,
    isSystemAdministrator: true,
    isActive: true,
    preferredLanguage: 'ar',
    roles: ['SYSTEM_ADMIN'],
    permissions: [],
    lastLoginAtUtc: null,
  };
  const regularUser: AuthenticatedUser = {
    ...sysAdmin,
    id: '2',
    isSystemAdministrator: false,
    roles: ['COMMERCIAL_MANAGER'],
    permissions: ['projects.read'],
  };
  const project: ProjectDto = {
    id: 'p1',
    code: 'PRJ-01',
    nameAr: 'مشروع',
    nameFr: 'Projet',
    wilayaCode: '16',
    wilayaName: 'Alger',
    municipality: 'Hydra',
    address: null,
    landTitleReference: null,
    buildingPermitNumber: null,
    buildingPermitDate: null,
    status: 'Planning',
    estimatedBudgetDzd: 1000,
    plannedBlocksCount: 1,
    plannedUnitsCount: 10,
    createdAtUtc: '2026-11-13T00:00:00Z',
    members: [],
  };

  assert.equal(canManageUsers(sysAdmin), true);
  assert.equal(canManageUsers(regularUser), false);
  assert.equal(canViewAuditLogs(regularUser), false);
  assert.equal(canManageProjectAccess(regularUser, project), false);
});
