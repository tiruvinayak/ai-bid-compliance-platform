import type { UserRole } from '../types';

const GOVERNMENT_ROLES: UserRole[] = ['GOVERNMENT OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER'];

export const isGovernmentRole = (role: string | null | undefined): boolean => {
  return GOVERNMENT_ROLES.includes(role as UserRole);
};

export const isBidderRole = (role: string | null | undefined): boolean => role === 'USER';

export const homePathForRole = (role: UserRole | string | null | undefined): string => {
  if (role === 'USER') return '/user/dashboard';
  if (role === 'CENTRAL_ADMIN' || role === 'SECTOR_USER') return '/government';
  if (role === 'GOVERNMENT OFFICER') return '/dashboard';
  return '/login';
};

export const normalizeAuthRole = (value: unknown): UserRole | null => {
  const role = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (role === 'USER' || role === 'BIDDER') return 'USER';
  if (role === 'GOVERNMENT_OFFICER' || role === 'GOVT_OFFICER' || role === 'OFFICER') {
    return 'GOVERNMENT OFFICER';
  }
  if (role === 'CENTRAL_ADMIN' || role === 'ADMIN' || role === 'GOVERNMENT_ADMIN') {
    return 'CENTRAL_ADMIN';
  }
  if (role === 'SECTOR_USER' || role === 'SECTOR') return 'SECTOR_USER';
  return null;
};

export const roleConsoleLabel = (role: UserRole | string): string => {
  switch (role) {
    case 'USER':
      return 'BIDDER APPLICANT';
    case 'CENTRAL_ADMIN':
      return 'CENTRAL GOVERNMENT';
    case 'SECTOR_USER':
      return 'SECTOR CONSOLE';
    default:
      return 'GOVT AUDIT OFFICER';
  }
};
