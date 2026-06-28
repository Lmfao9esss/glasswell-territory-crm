export type UserRole = "owner" | "manager" | "employee";

export const roleCapabilities = {
  owner: {
    canManageOrganization: true,
    canDeleteCompanyData: true,
    canOverrideTerritoryLocks: true,
    canManageEmployees: true,
    canAssignTerritories: true,
  },
  manager: {
    canManageOrganization: false,
    canDeleteCompanyData: false,
    canOverrideTerritoryLocks: true,
    canManageEmployees: true,
    canAssignTerritories: true,
  },
  employee: {
    canManageOrganization: false,
    canDeleteCompanyData: false,
    canOverrideTerritoryLocks: false,
    canManageEmployees: false,
    canAssignTerritories: false,
  },
} as const satisfies Record<UserRole, Record<string, boolean>>;
