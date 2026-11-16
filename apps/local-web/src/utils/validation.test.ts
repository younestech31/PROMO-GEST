import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPasswordStrength,
  PASSWORD_MAX_LENGTH,
  validateCreateEmployee,
  validateLoginRequest,
  validateSetupRequest,
} from './validation';
import {
  canManageProjectAccess,
  canManageProjectCustomers,
  canManageProjectSalesReservations,
  canManageProjectStructure,
  canManageProjects,
  canReadProjectCustomers,
  canReadProjectDocuments,
  canReadProjectSalesReservations,
  canUploadProjectDocuments,
  canManageUsers,
  canViewAuditLogs,
} from './permissions';
import type { AuthenticatedUser, ProjectDto } from '../types/erp';

test('Password strength requires >= 10 and <= 128 chars, upper, lower, and digit', () => {
  assert.equal(checkPasswordStrength('short1A').valid, false);
  assert.equal(checkPasswordStrength('alllowercase123').valid, false);
  assert.equal(checkPasswordStrength('NoDigitsHereAtAll').valid, false);
  assert.equal(checkPasswordStrength('PromoGest2026').valid, true);
  const maxValid = 'Aa1' + 'x'.repeat(PASSWORD_MAX_LENGTH - 3);
  assert.equal(checkPasswordStrength(maxValid).valid, true);
  const overMax = 'Aa1' + 'x'.repeat(PASSWORD_MAX_LENGTH - 2);
  assert.equal(overMax.length, PASSWORD_MAX_LENGTH + 1);
  assert.equal(checkPasswordStrength(overMax).valid, false);
  assert.equal(checkPasswordStrength(overMax).maxLength, false);
});

test('Validation rejects passwords exceeding 128 characters across setup, login, and user creation', () => {
  const overMax = 'Aa1' + 'x'.repeat(PASSWORD_MAX_LENGTH - 2);

  const setupErrors = validateSetupRequest(
    {
      legalName: 'SARL Promotion',
      legalForm: 'SARL',
      wilayaCode: '16',
      wilayaName: 'Alger',
      address: 'Hydra',
      defaultLanguage: 'ar',
      adminUsername: 'admin',
      adminFullName: 'Karim',
      adminEmail: 'karim@promo.dz',
      adminPassword: overMax,
    },
    overMax,
    'ar'
  );
  assert.ok(setupErrors.adminPassword);

  const loginErrors = validateLoginRequest(
    { usernameOrEmail: 'karim', password: overMax },
    'fr'
  );
  assert.ok(loginErrors.password);

  const empErrors = validateCreateEmployee(
    {
      username: 'employee1',
      fullName: 'Amine',
      email: 'amine@promo.dz',
      password: overMax,
      preferredLanguage: 'fr',
      roleCodes: ['SITE_ENGINEER'],
    },
    'fr'
  );
  assert.ok(empErrors.password);
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

  const validNewWilaya = validateSetupRequest(
    {
      legalName: 'SARL Promotion',
      legalForm: 'SARL',
      wilayaCode: '69',
      wilayaName: 'الأبيض سيدي الشيخ',
      address: 'Centre',
      defaultLanguage: 'ar',
      adminUsername: 'admin',
      adminFullName: 'Karim',
      adminEmail: 'karim@promo.dz',
      adminPassword: 'StrongPassword1',
    },
    'StrongPassword1',
    'ar'
  );
  assert.equal(validNewWilaya.wilayaCode, undefined);
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
    actualBuildingsCount: 0,
    actualUnitsCount: 0,
    createdAtUtc: '2026-11-13T00:00:00Z',
    concurrencyStamp: 'project-version-1',
    members: [],
  };

  assert.equal(canManageUsers(sysAdmin), true);
  assert.equal(canManageUsers(regularUser), false);
  assert.equal(canViewAuditLogs(regularUser), false);
  assert.equal(canManageProjectAccess(regularUser, project), false);

  const projectDirectorWithoutMembership: AuthenticatedUser = {
    ...regularUser,
    permissions: [
      'projects.read',
      'projects.manage',
      'projects.access.manage',
      'projects.structure.manage',
      'files.read',
      'files.write',
      'customers.read',
      'customers.manage',
      'sales.reservations.read',
      'sales.reservations.manage',
    ],
  };

  // Organization-level action permissions never substitute for explicit project membership.
  assert.equal(canManageProjects(projectDirectorWithoutMembership, project), false);
  assert.equal(canManageProjectAccess(projectDirectorWithoutMembership, project), false);
  assert.equal(canManageProjectStructure(projectDirectorWithoutMembership, project), false);
  assert.equal(canReadProjectDocuments(projectDirectorWithoutMembership, project), false);
  assert.equal(canUploadProjectDocuments(projectDirectorWithoutMembership, project), false);
  assert.equal(canReadProjectCustomers(projectDirectorWithoutMembership, project), false);
  assert.equal(canManageProjectCustomers(projectDirectorWithoutMembership, project), false);
  assert.equal(canReadProjectSalesReservations(projectDirectorWithoutMembership, project), false);
  assert.equal(canManageProjectSalesReservations(projectDirectorWithoutMembership, project), false);

  const assignedProject: ProjectDto = {
    ...project,
    members: [{
      id: 'membership-1',
      userId: projectDirectorWithoutMembership.id,
      username: projectDirectorWithoutMembership.username,
      fullName: projectDirectorWithoutMembership.fullName,
      roleInProject: 'ProjectManager',
      canViewFinancials: true,
      canManageSales: true,
      canManageConstruction: true,
      canManageDocuments: true,
      assignedAtUtc: '2026-11-15T10:00:00Z',
    }],
  };
  assert.equal(canManageProjects(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canManageProjectAccess(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canManageProjectStructure(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canReadProjectDocuments(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canUploadProjectDocuments(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canReadProjectCustomers(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canManageProjectCustomers(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canReadProjectSalesReservations(projectDirectorWithoutMembership, assignedProject), true);
  assert.equal(canManageProjectSalesReservations(projectDirectorWithoutMembership, assignedProject), true);

  // Even as ProjectManager with CanManageConstruction, structure edits require projects.structure.manage.
  const withoutStructurePerm: AuthenticatedUser = {
    ...projectDirectorWithoutMembership,
    permissions: projectDirectorWithoutMembership.permissions.filter((p) => p !== 'projects.structure.manage'),
  };
  assert.equal(canManageProjectStructure(withoutStructurePerm, assignedProject), false);
});
