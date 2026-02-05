export type Role = 'CONTROLLER' | 'PRINCIPAL';

export type AppPermission = 'READ_ONLY' | 'EDITOR' | 'OWNER';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export type EntityType = 'FAMILY' | 'HOLDING' | 'COMPANY';
export type AssetType = 'BANK' | 'PROPERTY' | 'EQUITY';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currency: string;
  net_worth: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  assets: Asset[];
}
