export type StaffRole = 'CAPACITY_OFFICER' | 'TRAVEL_AGENT' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
}

export const staffRoles: StaffRole[] = [
  'CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN',
];

export function isStaffRole(role: string): role is StaffRole {
  return staffRoles.some((allowed) => allowed === role);
}
