// frontend/src/features/auth/roleGuards.js
export const ROLE_HOME_ROUTES = {
  PATIENT: '/patient/dashboard',
  PHYSICIAN: '/doctor/dashboard',
  CMO: '/cmo/dashboard',
  ADMIN: '/admin/dashboard',
  PHARMACIST: '/doctor/dashboard',
};

export function isRoleAllowed(userRole, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  return allowedRoles.includes(userRole);
}

export function getHomeRouteForRole(role) {
  return ROLE_HOME_ROUTES[role] || '/login';
}
