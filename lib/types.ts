export type Role = 'CONTROLLER' | 'PRINCIPAL';

export type AppPermission = 'VIEW' | 'EDIT' | 'OWNER';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}
