export type Role = 'CONTROLLER' | 'PRINCIPAL' | 'ADMIN';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}
