export type Role = 'CONTROLLER' | 'PRINCIPAL';

export type AppPermission = 'READ_ONLY' | 'EDITOR' | 'OWNER';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}
