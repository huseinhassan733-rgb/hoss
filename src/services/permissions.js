export const ROLES = {
  admin:["*"], director:["*"], accountant:["fees","cash","accounting","reports"],
  student_affairs:["students"], controller:["grades","attendance"], archive:["archive"],
  teacher:["grades","attendance"]
};
export function can(role,module){ return ROLES[role]?.includes("*") || ROLES[role]?.includes(module); }