export type Role = 'CONTROLLER' | 'PRINCIPAL';

export type AppPermission = 'READ_ONLY' | 'EDITOR' | 'OWNER';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
  notification_settings: {
    airlock_ready: boolean;
    governance_alert: boolean;
  };
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

export interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type AirlockStatus = 'QUEUED' | 'PROCESSING' | 'REVIEW_NEEDED' | 'READY_TO_COMMIT' | 'ERROR';
export type TrafficLight = 'RED' | 'YELLOW' | 'GREEN';

export interface AirlockItem {
  id: string;
  asset_id: string | null;
  file_path: string;
  status: AirlockStatus;
  ai_payload: Record<string, any>;
  confidence_score: number | null;
  traffic_light: TrafficLight | null;
  created_at: string;
  contact_id?: string | null;
  contact?: Contact | null;
}

export type GhostStatus = 'PENDING' | 'MATCHED' | 'OVERDUE' | 'VOIDED';

export interface GhostEntry {
  id: string;
  asset_id: string;
  expected_date: string;
  expected_amount: number;
  description: string;
  recurrence_rule?: string | null;
  status: GhostStatus;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface LedgerLine {
  id: string;
  transaction_id: string;
  asset_id: string;
  amount: number;
  type: LedgerEntryType;
  group_id?: string;
  asset?: Asset;
}

export interface LedgerTransaction {
  id: string;
  description: string;
  date: string;
  external_reference_id?: string | null;
  created_at: string;
  lines: LedgerLine[];
  contact_id?: string | null;
  contact?: Contact | null;
}

export interface GroupedTransaction {
  id: string;
  description: string;
  date: string;
  total_amount: number;
  items: LedgerTransaction[];
}

export type LedgerViewItem = LedgerTransaction | GroupedTransaction;
