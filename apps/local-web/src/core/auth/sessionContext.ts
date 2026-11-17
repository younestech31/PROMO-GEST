import type { AppLanguage, AuthenticatedUser, OrganizationSummary } from '../../types/erp';

export interface SessionContextValue {
  user: AuthenticatedUser;
  organization: OrganizationSummary;
  language: AppLanguage;
}

export function isAuthenticatedSessionActive(user: AuthenticatedUser | null): user is AuthenticatedUser {
  return Boolean(user && user.isActive);
}

export function resolvePreferredLanguage(
  user: AuthenticatedUser | null,
  organization: OrganizationSummary | null
): AppLanguage {
  return user?.preferredLanguage ?? organization?.defaultLanguage ?? 'ar';
}
