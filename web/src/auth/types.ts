export type StaffRole = 'CAPACITY_OFFICER' | 'TRAVEL_AGENT' | 'ADMIN' | 'LOCAL_GUIDE';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthUser;
}

export const staffRoles: string[] = [
  'CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN', 'LOCAL_GUIDE'
];

export function isStaffUserRole(role?: string): boolean {
  if (!role) return false;
  const upper = role.toUpperCase();
  return staffRoles.includes(upper);
}

export function getRoleRedirectPath(role?: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return '/admin';
    case 'TRAVEL_AGENT':
      return '/agent-portal';
    case 'CAPACITY_OFFICER':
      return '/capacity';
    case 'LOCAL_GUIDE':
      return '/guide-portal';
    case 'TRAVELER':
      return '/my-bookings';
    default:
      return '/';
  }
}
