# **Vexel: Unified Data & API Contract**

Excellent. I have registered your architectural decisions. We are proceeding with dedicated administrative tables , an immutable base currency after setup , a many-to-many junction table for fractional ownership , pre-computed IRR for dashboard performance , and dedicated lookup tables for categories.

As your Principal Data & API Architect, I am enforcing the strict decoupling of our database storage from the frontend JSON consumption. Below is the Data & API Contract, organized by our primary domain entities.

---

## **Phase 1 Implementation (Current Reality – Identity & Auth)**

The following reflects what is **actually implemented** at Phase 1 completion. Code and migrations are the source of truth.

### Authentication (Supabase Auth + Resend)

- **Identity provider:** Supabase Auth (`auth.users`). Passwords and sessions are managed by Supabase; the application does not store or handle password hashes.
- **Transactional email:** Password reset (and any other auth emails) are sent via Supabase’s email configuration (e.g. Resend). No application code sends email directly; no secrets are documented here.

### public.users table (PostgreSQL, Supabase)

Synced from Supabase Auth for app use. Schema as implemented in `supabase/migrations/`:

| Column       | Type         | Notes |
| ------------ | ------------ | ----- |
| id           | uuid PK      | References `auth.users(id)` ON DELETE CASCADE |
| email        | text NOT NULL UNIQUE | |
| first_name   | text NOT NULL | |
| last_name    | text NOT NULL | |
| role         | text NOT NULL DEFAULT 'viewer' | CHECK (role IN ('admin', 'editor', 'viewer', 'guest')) |
| created_at   | timestamptz NOT NULL DEFAULT now() |
| updated_at   | timestamptz NOT NULL DEFAULT now() |

**No `password_hash`** — credentials live only in `auth.users`.

### Sync from Auth to public.users

- **Trigger:** `on_auth_user_created` AFTER INSERT on `auth.users` runs `public.handle_new_auth_user()`.
- **Function:** `handle_new_auth_user()` (SECURITY DEFINER) inserts into `public.users` using `new.id`, `new.email`, and `new.raw_user_meta_data->>'first_name'` / `'last_name'`, default role `'viewer'`. Uses `ON CONFLICT (id) DO UPDATE` so profile updates (e.g. email/name) are reflected.
- **App sign-up:** Server action `signUp` calls Supabase `auth.signUp()` with user_metadata (first_name, last_name); the trigger creates the `public.users` row. No separate app-level insert.

### RLS on public.users (Phase 1)

- **Enabled:** RLS is on for `public.users`.
- **Policies:**
  - **Select:** User can read only the row where `auth.uid() = id`.
  - **Insert:** User can insert only the row where `auth.uid() = id` (used when trigger runs in context of signup flow; trigger uses SECURITY DEFINER so it can insert regardless).
  - **Update:** User can update only the row where `auth.uid() = id`.
- **Not implemented in Phase 1:** No admin/editor “read all users” policy; no DELETE policy (only Supabase Auth can remove users via `auth.users` cascade).

### API / DTOs (Phase 1)

- No `/api/v1/settings` or `/api/v1/users/me` yet. Session user is obtained via `getCurrentUser()` (Supabase `auth.getUser()`). Profile data (e.g. from `public.users`) for “current user” will be added in Phase 2 when those API routes or equivalent are implemented.

---

## **Domain 1: The Identity & Configuration Domain**

This domain handles the multi-user access levels, global system parameters, and ensures that the base currency is locked in at the database level once the organization is initialized.

*Phase 1 implements only Supabase Auth + `public.users` sync and RLS as above. The schema and policies below are the **target** for Phase 2+ (e.g. organization_settings, role-based CREATE/DELETE on users).*

### **1\. Database Schema (Prisma)**

Code snippet

// schema.prisma

model users {  
  id            String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  email         String   @unique  
  password\_hash String   // STRICTLY HIDDEN from frontend  
  first\_name    String  
  last\_name     String  
  role          user\_roles @default(viewer)  
  created\_at    DateTime @default(now())  
  updated\_at    DateTime @updatedAt

  @@index(\[email\])  
}

enum user\_roles {  
  admin   // Full access   
  editor  // Create/edit, no delete   
  viewer  // Read-only (V2 prep)   
  guest   // Limited (V2 prep)   
}

model organization\_settings {  
  id                   String   @id @default("singleton") // Only one row ever exists  
  organization\_name    String  
  logo\_url             String?  
  base\_currency        String   @db.Char(3) // e.g., "EUR". Locked after creation.   
  fiscal\_year\_start    Int      @default(1) // 1 \= January \[cite: 257\]  
  is\_currency\_locked   Boolean  @default(false)  
  updated\_at           DateTime @updatedAt  
  updated\_by           String   @db.Uuid // Relation to users.id  
}

### **2\. Security Policies (RLS & Access Control)**

* **users table:** \* CREATE/DELETE: Strictly limited to the admin role.  
  * READ: Authenticated users can read their own row. admin and editor can read all rows to assign tasks or ownership.  
* **organization\_settings table:**  
  * UPDATE: Only admin role can update.  
  * **Lock Constraint:** Application layer MUST reject any UPDATE to base\_currency if is\_currency\_locked \== true.

### **3\. API Route Registry & DTOs (TypeScript View Models)**

* GET /api/v1/settings \- Fetches global config.  
* GET /api/v1/users/me \- Fetches the current session user.

TypeScript

// DTOs (Strictly camelCase)

export interface OrganizationSettingsDTO {  
  orgName: string;            // Mapped from DB: organization\_name  
  logoUrl: string | null;     // Mapped from DB: logo\_url  
  baseCurrency: string;       // Mapped from DB: base\_currency   
  isCurrencyLocked: boolean;  // Mapped from DB: is\_currency\_locked  
  fiscalMonthStart: number;   // Mapped from DB: fiscal\_year\_start \[cite: 257\]  
}

export interface UserProfileDTO {  
  id: string;  
  email: string;  
  fullName: string;           // Computed from DB: first\_name \+ ' ' \+ last\_name  
  role: 'admin' | 'editor' | 'viewer' | 'guest'; // Mapped from DB enum   
  // NOTICE: password\_hash is completely stripped.  
}

### **4\. Input Validation (Zod)**

TypeScript

import { z } from 'zod';

export const updateSettingsSchema \= z.object({  
  orgName: z.string().min(2).max(100),  
  logoUrl: z.string().url().optional().nullable(),  
  fiscalMonthStart: z.number().int().min(1).max(12),  
  // baseCurrency intentionally excluded; cannot be updated via standard PUT  
});

### **5\. Static JSON Mock (Frontend Consumption)**

JSON

{  
  "settings": {  
    "orgName": "Planner Family Office",  
    "logoUrl": "https://assets.plannerfamily.com/logo-v1.png",  
    "baseCurrency": "EUR",  
    "isCurrencyLocked": true,  
    "fiscalMonthStart": 1  
  },  
  "currentUser": {  
    "id": "a1b2c3d4-e5f6-7890",  
    "email": "principal@plannerfamily.com",  
    "fullName": "Álvaro Planner",  
    "role": "admin"  
  }  
}

---

## **Domain 2: The Asset Core Domain**

This domain handles the core investment positions, categorizations, custodians, and the complex many-to-many ownership structures required for modern family offices.

### **1\. Database Schema (Prisma)**

Code snippet

model asset\_categories {  
  id            String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name          String   @unique // e.g. "Financiera", "Inmuebles" \[cite: 44\]  
  color\_hex     String   @default("\#CCCCCC") // For UI badges \[cite: 86\]  
  is\_archived   Boolean  @default(false) // Soft delete \[cite: 261\]  
  assets        assets\[\]  
}

model custodians {  
  id            String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name          String   // e.g., "Julius Bär" \[cite: 63\]  
  type          String   // Bank / Fund Manager / Broker \[cite: 63\]  
  logo\_url      String?  \[cite: 63\]  
  assets        assets\[\]  
}

model owners {  
  id            String         @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name          String         // e.g., "Lucía", "Asset Holding Ltd" \[cite: 60\]  
  type          String         // Individual / Company / Trust \[cite: 60\]  
  tax\_id        String?        \[cite: 60\]  
  assets        asset\_owners\[\]   
}

model assets {  
  id                  String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name                String   \[cite: 44\]  
  category\_id         String   @db.Uuid // Relation to asset\_categories  
  status              String   @default("active") // active | closed \[cite: 44\]  
  custodian\_id        String?  @db.Uuid // Nullable for non-banked assets  
  native\_currency     String   @db.Char(3) \[cite: 44\]  
  ticker\_isin         String?  \[cite: 44\]  
  notes               String?  @db.Text \[cite: 44\]  
  created\_at          DateTime @default(now())

  category            asset\_categories @relation(fields: \[category\_id\], references: \[id\])  
  custodian           custodians?      @relation(fields: \[custodian\_id\], references: \[id\])  
  owners              asset\_owners\[\]  
  logs                asset\_logs\[\]  
    
  @@index(\[status\])  
  @@index(\[category\_id\])  
}

// The Junction Table solving the fractional ownership gap  
model asset\_owners {  
  asset\_id             String   @db.Uuid  
  owner\_id             String   @db.Uuid  
  ownership\_percentage Decimal  @db.Decimal(5,2) // e.g. 50.00 for joint

  asset                assets   @relation(fields: \[asset\_id\], references: \[id\], onDelete: Cascade)  
  owner                owners   @relation(fields: \[owner\_id\], references: \[id\], onDelete: Cascade)

  @@id(\[asset\_id, owner\_id\])  
}

// Background Snapshot Table (Real-time dashboard performance solution) \[cite: 68\]  
model asset\_logs {  
  id               String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  asset\_id         String   @db.Uuid  
  snapshot\_date    DateTime // First day of month \[cite: 70\]  
  market\_value     Decimal  @db.Decimal(19,4) \[cite: 70\]  
  net\_invested     Decimal  @db.Decimal(19,4) \[cite: 70\]  
  irr\_to\_date      Decimal? @db.Decimal(8,4)  // Pre-computed XIRR \[cite: 70\]  
    
  asset            assets   @relation(fields: \[asset\_id\], references: \[id\], onDelete: Cascade)

  @@unique(\[asset\_id, snapshot\_date\])  
}

### **2\. Security Policies (RLS & Access Control)**

* **assets table:**  
  * CREATE/UPDATE: Allowed for admin and editor.  
  * DELETE: Strictly admin only.  
* **asset\_logs table:**  
  * CREATE/UPDATE/DELETE: Strictly restricted to the secure backend Cron/Job worker. End-users only have READ access.

### **3\. API Route Registry & DTOs (TypeScript View Models)**

* GET /api/v1/assets \- Returns the primary list view.  
* GET /api/v1/assets/:id \- Returns data for the slide-out drawer.

TypeScript

export interface AssetListDTO {  
  id: string;  
  name: string;                           // Mapped from DB: assets.name \[cite: 81\]  
  categoryName: string;                   // Flattened from relation: asset\_categories.name \[cite: 86\]  
  categoryColor: string;                  // Flattened from relation: asset\_categories.color\_hex \[cite: 86\]  
  custodianName: string | null;           // Flattened from relation: custodians.name  
  jointOwnerNames: string\[\];              // Computed: Array mapped from asset\_owners junction \[cite: 91\]  
  status: 'active' | 'closed';            // Mapped from DB: assets.status \[cite: 97\]  
    
  // The following fields are aggregated by the Backend API from the most recent asset\_logs \[cite: 68\]  
  // or computed dynamically via SQL views. They are NOT stored directly on the asset table.  
  netInvestedBase: number;                // Computed \[cite: 82\]  
  marketValueBase: number;                // Computed \[cite: 83\]  
  unrealisedGainBase: number;             // Computed (marketValueBase \- netInvestedBase) \[cite: 84\]  
  unrealisedGainPct: number;              // Computed ((Gain / Net Invested) \* 100\) \[cite: 84\]  
  currentIrrPct: number | null;           // Fetched from latest asset\_logs.irr\_to\_date \[cite: 85, 284\]  
  lastValuationDate: string | null;       // ISO Date \[cite: 87\]  
}

### **4\. Input Validation (Zod)**

TypeScript

export const createAssetSchema \= z.object({  
  name: z.string().min(1).max(150),  
  categoryId: z.string().uuid(),  
  nativeCurrency: z.string().length(3),  
  custodianId: z.string().uuid().optional().nullable(),  
  tickerIsin: z.string().optional().nullable(),  
  notes: z.string().optional(),  
  // Requires at least one owner with total percentage \= 100  
  owners: z.array(z.object({  
    ownerId: z.string().uuid(),  
    percentage: z.number().positive().max(100)  
  })).min(1).refine(  
    (owners) \=\> owners.reduce((sum, o) \=\> sum \+ o.percentage, 0) \=== 100,   
    { message: "Total ownership percentage must equal 100." }  
  )  
});

### **5\. Static JSON Mock (Frontend Consumption)**

JSON

{  
  "assets": \[  
    {  
      "id": "f8a9d2c1-4e7b-4a33-912c-b5f8c6e7a1d2",  
      "name": "Global Tech Fund III",  
      "categoryName": "Alternativa",  
      "categoryColor": "\#3B82F6",  
      "custodianName": "Julius Bär",  
      "jointOwnerNames": \["Álvaro", "Lucía"\],  
      "status": "active",  
      "netInvestedBase": 250000.00,  
      "marketValueBase": 315000.00,  
      "unrealisedGainBase": 65000.00,  
      "unrealisedGainPct": 26.00,  
      "currentIrrPct": 14.25,  
      "lastValuationDate": "2026-02-28T00:00:00Z"  
    }  
  \],  
  "summaryTotals": {  
    "totalNetInvested": 250000.00,  
    "totalMarketValue": 315000.00,  
    "totalUnrealisedGain": 65000.00  
  }  
}

---

This domain requires extreme precision, as it handles the core ledger of all money movements across the family office. We must strictly enforce the rule that a transaction belongs to *either* an asset or a liability, but never both. Furthermore, we will establish a dedicated liability\_categories table to match the robust setup we created for assets.

---

## **Domain 3: The Liabilities & Transactions Domain**

### **1\. Database Schema (Prisma)**

Code snippet

// schema.prisma

model liability\_categories {  
  id            String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name          String   @unique // e.g., "Préstamo personal", "Hipoteca"  
  color\_hex     String   @default("\#EF4444")  
  is\_archived   Boolean  @default(false)  
  liabilities   liabilities\[\]  
}

model liabilities {  
  id               String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name             String   // e.g., "Préstamo Grupo Planner"  
  category\_id      String   @db.Uuid  
  custodian\_id     String   @db.Uuid  
  native\_currency  String   @db.Char(3)  
  credit\_limit     Decimal  @db.Decimal(19,4)  
  interest\_rate    Decimal  @db.Decimal(5,2) // Annual rate %  
  start\_date       DateTime @db.Date  
  maturity\_date    DateTime @db.Date  
  notes            String?  @db.Text  
  created\_at       DateTime @default(now())

  category         liability\_categories @relation(fields: \[category\_id\], references: \[id\])  
  custodian        custodians           @relation(fields: \[custodian\_id\], references: \[id\])  
  owners           liability\_owners\[\]  
  transactions     transactions\[\]  
  logs             liability\_logs\[\]

  @@index(\[category\_id\])  
}

// Maintaining structural parity with assets for joint obligations  
model liability\_owners {  
  liability\_id         String   @db.Uuid  
  owner\_id             String   @db.Uuid  
  obligation\_percentage Decimal @db.Decimal(5,2)

  liability            liabilities @relation(fields: \[liability\_id\], references: \[id\], onDelete: Cascade)  
  owner                owners      @relation(fields: \[owner\_id\], references: \[id\], onDelete: Cascade)

  @@id(\[liability\_id, owner\_id\])  
}

enum transaction\_types {  
  contribution  
  withdrawal  
  income  
  expense  
  disposition  
  amortisation  
  other  
}

model transactions {  
  id               String            @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  transaction\_date DateTime          @db.Date  
  type             transaction\_types  
  amount           Decimal           @db.Decimal(19,4) // Always positive  
  currency         String            @db.Char(3)  
  fx\_rate          Decimal           @db.Decimal(10,6)  
  amount\_base      Decimal           @db.Decimal(19,4) // Computed: amount \* fx\_rate  
    
  // Polymorphic relationship implemented via nullable foreign keys  
  asset\_id         String?           @db.Uuid  
  liability\_id     String?           @db.Uuid  
    
  description      String  
  notes            String?           @db.Text  
  created\_at       DateTime          @default(now())

  asset            assets?           @relation(fields: \[asset\_id\], references: \[id\])  
  liability        liabilities?      @relation(fields: \[liability\_id\], references: \[id\])

  @@index(\[asset\_id\])  
  @@index(\[liability\_id\])  
  @@index(\[transaction\_date\])  
}

// Point-in-time balance snapshots for the liability timeline chart  
model liability\_logs {  
  id               String   @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  liability\_id     String   @db.Uuid  
  snapshot\_date    DateTime @db.Date  
  balance          Decimal  @db.Decimal(19,4)  
    
  liability        liabilities @relation(fields: \[liability\_id\], references: \[id\], onDelete: Cascade)

  @@unique(\[liability\_id, snapshot\_date\])  
}

### **2\. Security Policies (RLS & Access Control)**

* **transactions table:**  
  * CREATE/UPDATE: admin and editor roles can record movements.  
  * DELETE: admin only.  
  * *Database Check Constraint:* We must apply a strict constraint at the DB level (e.g., CHECK ((asset\_id IS NULL) \<\> (liability\_id IS NULL))) to guarantee a transaction points to one, and exactly one, entity type.  
* **liabilities table:**  
  * Similar to assets, restricted editing to admin and editor, with deletion strictly reserved for admin.

### **3\. API Route Registry & DTOs (TypeScript View Models)**

* GET /api/v1/liabilities \- Fetches the grouped/filtered list view.  
* GET /api/v1/transactions \- Fetches the global ledger across all entities.

TypeScript

// DTOs (Strictly camelCase)

export interface LiabilityListDTO {  
  id: string;  
  name: string;                           // Mapped from DB: liabilities.name  
  categoryName: string;                   // Flattened from relation  
  custodianName: string;                  // Flattened from relation  
  creditLimitBase: number;                // Converted using daily FX  
  interestRate: number;                   // Mapped from DB: interest\_rate  
  maturityDate: string;                   // ISO Date  
    
  // Computed dynamically by the API based on transaction SUMs  
  grossDispositionsBase: number;          // Computed  
  grossRepaymentsBase: number;            // Computed   
  netBalanceBase: number;                 // Computed: Dispositions \- Repayments  
  pctPending: number;                     // Computed: (netBalanceBase / creditLimitBase) \* 100  
}

export interface TransactionDTO {  
  id: string;  
  date: string;                           // Mapped from DB: transaction\_date  
  type: 'contribution' | 'withdrawal' | 'income' | 'expense' | 'disposition' | 'amortisation' | 'other';  
  amountNative: number;                   // Mapped from DB: amount  
  nativeCurrency: string;                 // Mapped from DB: currency  
  fxRate: number;                         // Mapped from DB: fx\_rate  
  amountBase: number;                     // Mapped from DB: amount\_base  
  description: string;  
    
  // Flattened Context Links  
  linkedEntityId: string;                 // Mapped from asset\_id OR liability\_id  
  linkedEntityName: string;               // Fetched via JOIN  
  linkedEntityType: 'asset' | 'liability';   
}

### **4\. Input Validation (Zod)**

TypeScript

import { z } from 'zod';

export const createTransactionSchema \= z.object({  
  date: z.string().datetime(), // Enforces ISO 8601  
  type: z.enum(\['contribution', 'withdrawal', 'income', 'expense', 'disposition', 'amortisation', 'other'\]),  
  amount: z.number().positive(), // The DB requires positive amounts; direction is inferred from 'type'  
  currency: z.string().length(3),  
  fxRate: z.number().positive(),  
  description: z.string().min(1).max(255),  
  assetId: z.string().uuid().optional(),  
  liabilityId: z.string().uuid().optional(),  
  notes: z.string().optional()  
}).refine(  
  // The XOR rule: exactly one must be provided, but not both  
  (data) \=\> (data.assetId ? 1 : 0) \+ (data.liabilityId ? 1 : 0) \=== 1,  
  { message: "A transaction must be linked to either an asset or a liability, but not both." }  
);

### **5\. Static JSON Mock (Frontend Consumption)**

JSON

{  
  "liabilities": \[  
    {  
      "id": "b2c3d4e5-f6a7-8901-b2c3-d4e5f6a78901",  
      "name": "Hipoteca Chalet Madrid",  
      "categoryName": "Hipotecas",  
      "custodianName": "Bankinter",  
      "creditLimitBase": 500000.00,  
      "interestRate": 2.95,  
      "maturityDate": "2040-06-15T00:00:00Z",  
      "grossDispositionsBase": 500000.00,  
      "grossRepaymentsBase": 125000.00,  
      "netBalanceBase": 375000.00,  
      "pctPending": 75.00  
    }  
  \],  
  "transactions": \[  
    {  
      "id": "c3d4e5f6-a7b8-9012-c3d4-e5f6a7b89012",  
      "date": "2026-03-01T00:00:00Z",  
      "type": "amortisation",  
      "amountNative": 2500.00,  
      "nativeCurrency": "EUR",  
      "fxRate": 1.000000,  
      "amountBase": 2500.00,  
      "description": "Cuota mensual hipoteca",  
      "linkedEntityId": "b2c3d4e5-f6a7-8901-b2c3-d4e5f6a78901",  
      "linkedEntityName": "Hipoteca Chalet Madrid",  
      "linkedEntityType": "liability"  
    }  
  \]  
}

## **Domain 4: The Valuations Domain**

This domain handles the point-in-time snapshots of an asset's market value, which build the performance timeline.

### **1\. Database Schema (Prisma)**

Code snippet

// schema.prisma

enum valuation\_sources {  
  manual  
  market\_feed  
  document\_upload  
}

model valuations {  
  id               String            @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  asset\_id         String            @db.Uuid  
  valuation\_date   DateTime          @db.Date  
  market\_value     Decimal           @db.Decimal(19,4)  
  currency         String            @db.Char(3)  
  fx\_rate          Decimal           @db.Decimal(10,6) // Locked historical rate  
  value\_base       Decimal           @db.Decimal(19,4) // Computed and stored: market\_value \* fx\_rate  
  source           valuation\_sources @default(manual)  
  notes            String?           @db.Text  
  document\_id      String?           @db.Uuid // Nullable link to source file  
  created\_at       DateTime          @default(now())

  asset            assets            @relation(fields: \[asset\_id\], references: \[id\], onDelete: Cascade)  
  document         documents?        @relation(fields: \[document\_id\], references: \[id\], onDelete: SetNull)

  @@index(\[asset\_id\])  
  @@index(\[valuation\_date\])  
}

### **2\. Security Policies (RLS & Access Control)**

* **valuations table:**  
  * CREATE/UPDATE: admin and editor roles can manually record or trigger a market fetch.  
  * DELETE: Only admin can delete a valuation snapshot.  
  * SYSTEM: The background market data feed service has secure system-level write access to insert market\_feed records.

### **3\. API Route Registry & DTOs (TypeScript View Models)**

* GET /api/v1/assets/:assetId/valuations \- Fetches the valuation history for the charts tab.  
* POST /api/v1/valuations \- Adds a manual snapshot or confirms an AI-extracted one.

TypeScript

// DTOs (Strictly camelCase)

export interface ValuationDTO {  
  id: string;  
  valuationDate: string;              // Mapped from DB: valuation\_date (ISO String)  
  marketValueNative: number;          // Mapped from DB: market\_value  
  nativeCurrency: string;             // Mapped from DB: currency  
  valueBase: number;                  // Mapped from DB: value\_base  
  source: 'manual' | 'market\_feed' | 'document\_upload'; // Mapped from DB: source  
  notes: string | null;               // Mapped from DB: notes  
    
  // Flattened Context  
  assetId: string;  
  sourceDocumentId: string | null;    // Mapped from DB: document\_id  
  sourceDocumentName: string | null;  // Fetched via JOIN to documents table  
}

### **4\. Input Validation (Zod)**

TypeScript

import { z } from 'zod';

export const createValuationSchema \= z.object({  
  assetId: z.string().uuid(),  
  valuationDate: z.string().datetime(),  
  marketValue: z.number().positive(),  
  currency: z.string().length(3),  
  fxRate: z.number().positive(),  
  source: z.enum(\['manual', 'market\_feed', 'document\_upload'\]),  
  notes: z.string().optional(),  
  documentId: z.string().uuid().optional().nullable()  
});

### **5\. Static JSON Mock (Frontend Consumption)**

JSON

{  
  "valuations": \[  
    {  
      "id": "e5f6a7b8-9012-c3d4-e5f6-a7b89012c3d4",  
      "valuationDate": "2026-03-01T00:00:00Z",  
      "marketValueNative": 315000.00,  
      "nativeCurrency": "EUR",  
      "valueBase": 315000.00,  
      "source": "document\_upload",  
      "notes": "Q1 2026 statement valuation",  
      "assetId": "f8a9d2c1-4e7b-4a33-912c-b5f8c6e7a1d2",  
      "sourceDocumentId": "d4e5f6a7-b890-12c3-d4e5-f6a7b89012c3",  
      "sourceDocumentName": "Julius\_Baer\_Q1\_2026.pdf"  
    }  
  \]  
}

---

## **Domain 5: The Documents Domain**

This domain serves as the central file repository. Because a single PDF report from a bank might detail multiple stock positions, a mortgage, and several cash transfers, we must use junction tables to link a single document to multiple entities.

### **1\. Database Schema (Prisma)**

Code snippet

enum document\_types {  
  bank\_report  
  tax\_document  
  legal  
  valuation  
  other  
}

model documents {  
  id               String         @id @default(dbgenerated("gen\_random\_uuid()")) @db.Uuid  
  name             String         // Display name \[cite: 66\]  
  file\_url         String         // S3 or Cloud Storage URI (internal)  
  document\_date    DateTime       @db.Date  
  type             document\_types  
  custodian\_id     String?        @db.Uuid // Nullable issuing institution \[cite: 66\]  
  notes            String?        @db.Text  
  created\_at       DateTime       @default(now())  
  uploaded\_by      String         @db.Uuid // Relation to users.id

  custodian        custodians?    @relation(fields: \[custodian\_id\], references: \[id\])  
    
  // Inverse relations for junction tables  
  assets           document\_assets\[\]  
  liabilities      document\_liabilities\[\]  
  transactions     document\_transactions\[\]  
  valuations       valuations\[\]   // 1 Document can have many Valuations \[cite: 54\]

  @@index(\[custodian\_id\])  
  @@index(\[type\])  
}

// Junction Tables for Many-to-Many entity linking \[cite: 215\]  
model document\_assets {  
  document\_id String @db.Uuid  
  asset\_id    String @db.Uuid  
  @@id(\[document\_id, asset\_id\])  
}

model document\_liabilities {  
  document\_id  String @db.Uuid  
  liability\_id String @db.Uuid  
  @@id(\[document\_id, liability\_id\])  
}

model document\_transactions {  
  document\_id    String @db.Uuid  
  transaction\_id String @db.Uuid  
  @@id(\[document\_id, transaction\_id\])  
}

### **2\. Security Policies (RLS & Access Control)**

* **documents table:**  
  * CREATE: admin and editor can upload.  
  * READ: admin and editor can view and download all documents. (V2: Viewers/Guests will have restricted document access ).  
  * DELETE: admin only. *Note: Deleting a document cascade-deletes its junction table entries, but sets document\_id to NULL in the valuations table to preserve the financial record.*

### **3\. API Route Registry & DTOs (TypeScript View Models)**

* GET /api/v1/documents \- Fetches the searchable library.  
* POST /api/v1/documents/upload \- Handles file upload and metadata assignment.

TypeScript

export interface DocumentLibraryDTO {  
  id: string;  
  name: string;                           // Mapped from DB: name  
  fileUrl: string;                        // Signed URL generated by API for frontend download/preview \[cite: 207\]  
  documentDate: string;                   // Mapped from DB: document\_date  
  type: 'bank\_report' | 'tax\_document' | 'legal' | 'valuation' | 'other';  
  custodianName: string | null;           // Flattened from relation  
    
  // Computed Counts for the list view \[cite: 199, 200\]  
  linkedAssetsCount: number;  
  linkedLiabilitiesCount: number;  
    
  // Detailed arrays for the drawer view \[cite: 209, 210\]  
  linkedAssets: Array\<{ id: string, name: string }\>;  
  linkedLiabilities: Array\<{ id: string, name: string }\>;  
  linkedTransactions: Array\<{ id: string, description: string }\>;  
}

### **4\. Input Validation (Zod)**

TypeScript

export const uploadDocumentSchema \= z.object({  
  name: z.string().min(1).max(255),  
  documentDate: z.string().datetime(),  
  type: z.enum(\['bank\_report', 'tax\_document', 'legal', 'valuation', 'other'\]),  
  custodianId: z.string().uuid().optional().nullable(),  
  notes: z.string().optional(),  
    
  // Optional arrays of linked entity IDs passed at upload time \[cite: 215\]  
  assetIds: z.array(z.string().uuid()).optional(),  
  liabilityIds: z.array(z.string().uuid()).optional(),  
  transactionIds: z.array(z.string().uuid()).optional()  
});

### **5\. Static JSON Mock (Frontend Consumption)**

JSON

{  
  "documents": \[  
    {  
      "id": "d4e5f6a7-b890-12c3-d4e5-f6a7b89012c3",  
      "name": "Julius\_Baer\_Q1\_2026.pdf",  
      "fileUrl": "https://storage.plannerfamily.com/signed-url-uuid",  
      "documentDate": "2026-03-31T00:00:00Z",  
      "type": "bank\_report",  
      "custodianName": "Julius Bär",  
      "linkedAssetsCount": 2,  
      "linkedLiabilitiesCount": 0,  
      "linkedAssets": \[  
        { "id": "f8a9d2c1-4e7b-4a33-912c-b5f8c6e7a1d2", "name": "Global Tech Fund III" },  
        { "id": "a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890", "name": "JB Swiss Equities" }  
      \],  
      "linkedLiabilities": \[\],  
      "linkedTransactions": \[\]  
    }  
  \]  
}

---

