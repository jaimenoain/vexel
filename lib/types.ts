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

export type AirlockStatus = 'QUEUED' | 'PROCESSING' | 'REVIEW_NEEDED' | 'READY_TO_COMMIT';
export type TrafficLight = 'RED' | 'YELLOW' | 'GREEN';

export interface AirlockItem {
  id: string;
  asset_id: string;
  file_path: string;
  status: AirlockStatus;
  ai_payload: Record<string, any>;
  confidence_score: number | null;
  traffic_light: TrafficLight | null;
  created_at: string;
}
