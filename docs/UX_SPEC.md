# **Vexel: Frontend Architecture & UX Spec**

As the Principal Frontend Architect, I am establishing the strict UI and frontend technical foundation for the Vexel platform. This platform serves High Net Worth Individuals (HNWIs) and small family offices, demanding high clarity, instantaneous performance, and absolute data integrity.

You **MUST** adhere to the following technological boundaries. "Artisanal" state management or styling is strictly **FORBIDDEN**.

* **State:** Domain data **MUST** be fetched via React Query. View states (e.g., active tabs, open drawers, filters) **MUST** be driven by URL Search Parameters. Global state (Zustand) is strictly limited to ephemeral UI preferences (e.g., sidebar toggles).  
* **Styling:** Raw CSS is **FORBIDDEN**. You **MUST** use Tailwind CSS semantic tokens and Shadcn/UI primitives.

---

### **1\. Design System & Global Tokens**

The visual language emphasizes financial clarity. The design system relies on strict token mapping rather than arbitrary hex codes.

**Global Tailwind Tokens (tailwind.config.ts)**

* background: hsl(var(--background)) \- Deep, clean neutral for the primary canvas.  
* foreground: hsl(var(--foreground)) \- High-contrast text for ultimate legibility.  
* primary: Mapped to a subdued, trustworthy financial blue.  
* destructive: Mapped to \#EF4444 for negative balances, liability types , and destructive actions (Admin deletes).  
* asset-alternativa: Mapped to \#3B82F6 for specific category badges.

**Required Shadcn/UI Primitives ("Lego Bricks")**

You **MUST** initialize and strictly utilize the following Radix-backed components:

* AppSidebar: For the persistent left navigation.  
* Sheet: Critical for the right-side sliding detail drawers (Assets, Liabilities, Documents).  
* DataTable (TanStack Table integration): For all primary entity list views, supporting sorting, filtering, and grouping.  
* Tabs: Essential for navigating the sub-views within detail drawers (Summary, Transactions, Valuations, Charts, Documents).  
* Badge: For status indicators (Active/Closed) and colored category types.  
* Form (React Hook Form \+ Zod): For all data entry, strictly tied to our Zod validation schemas.

---

### **2\. File System & Routing Structure**

The app/ directory **MUST** utilize Next.js 14 Route Groups to isolate authentication from the core application layout. Detail drawers are triggered via URL search parameters (e.g., ?assetId=123) on the index pages to ensure deep-linking and state preservation.

Plaintext

src/  
├── app/  
│   ├── (auth)/  
│   │   ├── layout.tsx             // Centered minimalist login wrapper  
│   │   └── login/page.tsx         // Authentication entry point \[cite: 617\]  
│   ├── (app)/  
│   │   ├── layout.tsx             // Injects \<AppSidebar\> and main content container   
│   │   ├── dashboard/page.tsx     // Top-level net worth & charts \[cite: 797\]  
│   │   ├── assets/page.tsx        // Assets list; ?assetId triggers \<AssetDrawer\> \[cite: 656, 688\]  
│   │   ├── liabilities/page.tsx   // Liabilities list; ?liabilityId triggers \<LiabilityDrawer\> \[cite: 722, 729\]  
│   │   ├── transactions/page.tsx  // Global ledger view \[cite: 745\]  
│   │   ├── documents/page.tsx     // Filterable library; ?documentId triggers \<DocumentDrawer\> \[cite: 771\]  
│   │   ├── entities/page.tsx      // Custodians and Owners management \[cite: 815\]  
│   │   └── settings/page.tsx      // Global config, users, types (Admin only) \[cite: 831, 832\]  
├── components/  
│   ├── ui/                        // Generated Shadcn/UI primitives  
│   ├── layout/                    // Sidebar, Topbar, Drawers  
│   └── domain/                    // Domain-specific composites (e.g., AssetSummaryCard)  
├── lib/  
│   ├── api/                       // React Query hooks and Server Actions  
│   ├── dtos/                      // TypeScript View Models (e.g., AssetListDTO) \[cite: 161\]  
│   └── schemas/                   // Zod validation schemas \[cite: 180, 345, 447\]

---

### **Phase 2: Vertical UI Specification**

#### **Feature 1: Assets Management (/app/(app)/assets/page.tsx)**

##### **1\. UX Mental Model & Journey**

The Assets feature acts as the central command center for the family office's investment portfolio. The user journey prioritizes dense, scannable data. The user lands on a comprehensive data table displaying all active positions. Clicking a specific asset row **MUST NOT** navigate away from this context; instead, it triggers a URL-driven slide-out drawer (Sheet) from the right. This allows the user to drill down into the asset's summary, historical transactions, valuation snapshots, and linked documents, while maintaining spatial awareness of the broader portfolio.

##### **2\. Route & Component Tree**

This structure enforces the strict decoupling of view state (URL) and domain data (React Query). ASCII wireframes are **FORBIDDEN**; you **MUST** follow this exact DOM hierarchy and DTO mapping.

* AssetsRoute (/app/(app)/assets/page.tsx)  
  * AssetsHeader  
    * PageTitle \<- Mapped to \-\> Static ("Assets")  
    * AddAssetButton \-\> Triggers AddAssetModal  
  * AssetsToolbar (State driven entirely by URL Search Params)  
    * Tabs (View state: ?type=) \<- Mapped to \-\> AssetListDTO.categoryName  
    * FilterMenu (State: ?custodian=, ?owner=, ?status=)  
  * AssetsDataTable (TanStack Table \+ Shadcn Table)  
    * Row \<- Mapped to \-\> AssetListDTO\[\]  
      * Cell\[Name\] \<- Mapped to \-\> AssetListDTO.name  
      * Cell\[NetInvested\] \<- Mapped to \-\> AssetListDTO.netInvestedBase (Formatted as Base Currency)  
      * Cell\[MarketValue\] \<- Mapped to \-\> AssetListDTO.marketValueBase (Formatted as Base Currency)  
      * Cell\[UnrealisedGain\] \<- Mapped to \-\> AssetListDTO.unrealisedGainBase & AssetListDTO.unrealisedGainPct  
      * Cell\[IRR\] \<- Mapped to \-\> AssetListDTO.currentIrrPct  
      * Cell\[TypeBadge\] (Shadcn Badge using style={{ backgroundColor: categoryColor }}) \<- Mapped to \-\> AssetListDTO.categoryName & categoryColor  
      * Cell\[LastValuation\] \<- Mapped to \-\> AssetListDTO.lastValuationDate  
  * AssetDetailDrawer (Shadcn Sheet, rendered if ?assetId=UUID is present)  
    * SheetHeader  
      * SheetTitle \<- Mapped to \-\> AssetListDTO.name  
      * EntityLinks \<- Mapped to \-\> AssetListDTO.custodianName & AssetListDTO.jointOwnerNames  
    * Tabs (State driven by ?assetTab=)  
      * TabsContent\[value="summary"\] \-\> Renders AssetSummaryView  
      * TabsContent\[value="transactions"\] \-\> Renders AssetTransactionsView  
      * TabsContent\[value="valuations"\] \-\> Renders AssetValuationsView  
      * TabsContent\[value="charts"\] \-\> Renders AssetChartsView  
      * TabsContent\[value="documents"\] \-\> Renders AssetDocumentsView  
  * TotalsFooter (Sticky Shadcn TableRow)  
    * Cell\[TotalNetInvested\] \<- Mapped to \-\> SummaryTotals.totalNetInvested  
    * Cell\[TotalMarketValue\] \<- Mapped to \-\> SummaryTotals.totalMarketValue

##### **3\. Interaction & Mutation Schema (The Bridge)**

Every state change or data mutation **MUST** route through the strict mechanisms defined below.

* **View & Filter Interaction:**  
  * *Action:* User clicks the "Alternativa" tab.  
  * *Mechanism:* Update URL to /assets?category=Alternativa. AssetsDataTable automatically filters the React Query cache or triggers a new fetch depending on pagination strategy.  
* **Drawer Interaction:**  
  * *Action:* User clicks the "Global Tech Fund III" row.  
  * *Mechanism:* Update URL to /assets?assetId=f8a9d2c1-4e7b-4a33-912c-b5f8c6e7a1d2. The AssetDetailDrawer reads this ID, opens, and triggers a focused useQuery for deep asset data.  
* **Create Asset Mutation:**  
  * *Action:* User submits the AddAssetModal form.  
  * *Validation Bridge:* The form **MUST** use react-hook-form strictly bound to the backend's createAssetSchema (Zod) .  
  * *Server Action:* createAsset(data: z.infer\<typeof createAssetSchema\>).

##### **4\. Finite State Machine (FSM)**

You **MUST** handle non-ideal states explicitly using the following rules:

* **Loading State:** Standard spinners are **FORBIDDEN** for primary data fetches. You **MUST** use Shadcn Skeleton components mirroring the exact height and layout of the AssetsDataTable rows and the AssetDetailDrawer header.  
* **Empty State:** If AssetListDTO\[\] returns empty, render a Shadcn EmptyState component with an Inbox icon, subdued text ("No assets found matching current filters"), and a prominent call-to-action button ("Clear Filters" or "Add Asset").  
* **Error State:** If the data fetch fails, render an inline error boundary over the table area with a destructive coloured retry button. If a mutation (e.g., createAsset) fails, you **MUST** trigger a Shadcn Toast with variant="destructive".  
* **Optimistic UI:** When a user creates a new asset, you **SHOULD** optimistically inject a temporary row into the React Query cache using queryClient.setQueryData before awaiting the server response, styling it slightly faded to indicate a pending state.

##### **5\. Microcopy Table**

"Lorem Ipsum" is **FORBIDDEN**. Use the exact terminology specified below.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Assets | Activos |
| **Primary Action Button** | Add Asset | Añadir Activo |
| **Search Placeholder** | Search assets, tickers, or custodians... | Buscar activos, tickers o custodios... |
| **Table Column: Net Invested** | Net Invested | Inversión Neta |
| **Table Column: Unrealised Gain** | Unrealised Gain / Loss | Plusvalía / Minusvalía |
| **Empty State (No Data)** | You haven't added any assets yet. | Aún no has añadido ningún activo. |
| **Drawer Tab: Summary** | Summary | Resumen |
| **Drawer Tab: Valuations** | Valuations | Valoraciones |
| **Delete Warning (Admin)** | Are you sure? This will permanently delete this asset and all linked history. | ¿Estás seguro? Esto eliminará permanentemente este activo y todo su historial. |

---

#### **Feature 2: Liabilities Management (/app/(app)/liabilities/page.tsx)**

##### **1\. UX Mental Model & Journey**

While the Assets view is focused on growth and performance, the Liabilities feature is the risk and obligation control center. The user journey prioritizes visibility into debt burdens, interest rates, and maturity timelines. Users land on a clean, sortable data table of active debts. Clicking a liability row **MUST** trigger a slide-out drawer (Sheet) via a URL parameter. This drawer provides deep context—amortization summaries, payment history (transactions), and loan agreements (documents)—without losing sight of the total debt portfolio.

##### **2\. Route & Component Tree**

You **MUST** follow this strict DOM hierarchy. State **MUST** be driven by the URL, and data **MUST** map explicitly to the backend DTO.

* LiabilitiesRoute (/app/(app)/liabilities/page.tsx)  
  * LiabilitiesHeader  
    * PageTitle \<- Mapped to \-\> Static ("Liabilities")  
    * AddLiabilityButton \-\> Triggers AddLiabilityModal  
  * LiabilitiesToolbar (State driven entirely by URL Search Params)  
    * Tabs (View state: ?type=) \<- Mapped to \-\> LiabilityListDTO.categoryName (e.g., Mortgage, Lombard Loan)  
    * FilterMenu (State: ?creditor=, ?status=)  
  * LiabilitiesDataTable (TanStack Table \+ Shadcn Table)  
    * Row \<- Mapped to \-\> LiabilityListDTO\[\]  
      * Cell\[Name\] \<- Mapped to \-\> LiabilityListDTO.name  
      * Cell\[OriginalAmount\] \<- Mapped to \-\> LiabilityListDTO.originalAmountBase (Formatted as Base Currency)  
      * Cell\[OutstandingBalance\] \<- Mapped to \-\> LiabilityListDTO.outstandingBalanceBase (Formatted as Base Currency)  
      * Cell\[InterestRate\] \<- Mapped to \-\> LiabilityListDTO.interestRatePct (Formatted as %)  
      * Cell\[MaturityDate\] \<- Mapped to \-\> LiabilityListDTO.maturityDate  
      * Cell\[TypeBadge\] (Shadcn Badge with destructive/warning hues) \<- Mapped to \-\> LiabilityListDTO.categoryName  
  * LiabilityDetailDrawer (Shadcn Sheet, rendered if ?liabilityId=UUID is present)  
    * SheetHeader  
      * SheetTitle \<- Mapped to \-\> LiabilityDetailDTO.name  
      * EntityLinks \<- Mapped to \-\> LiabilityDetailDTO.creditorName  
    * Tabs (State driven by ?liabilityTab=)  
      * TabsContent\[value="summary"\] \-\> Renders LiabilitySummaryView (Terms, Next Payment Date)  
      * TabsContent\[value="transactions"\] \-\> Renders LiabilityTransactionsView (Payment history)  
      * TabsContent\[value="documents"\] \-\> Renders LiabilityDocumentsView (Contracts, Statements)  
  * TotalsFooter (Sticky Shadcn TableRow)  
    * Cell\[TotalOutstanding\] \<- Mapped to \-\> SummaryTotals.totalLiabilitiesBase (Formatted as Base Currency, styled with text-destructive)

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **View & Filter Interaction:**  
  * *Action:* User filters by "Mortgage" category.  
  * *Mechanism:* Update URL to /liabilities?category=Mortgage. LiabilitiesDataTable automatically filters the React Query cache.  
* **Drawer Interaction:**  
  * *Action:* User clicks the "Lombard Loan A" row.  
  * *Mechanism:* Update URL to /liabilities?liabilityId=a1b2c3d4-e5f6.... The LiabilityDetailDrawer reads this ID, opens, and triggers a focused useQuery for the specific liability's details.  
* **Create Liability Mutation:**  
  * *Action:* User submits the AddLiabilityModal form.  
  * *Validation Bridge:* The form **MUST** use react-hook-form strictly bound to the backend's createLiabilitySchema (Zod).  
  * *Server Action:* createLiability(data: z.infer\<typeof createLiabilitySchema\>).

##### **4\. Finite State Machine (FSM)**

* **Loading State:** You **MUST** use Shadcn Skeleton rows mimicking the table structure. Do not use generic spinners.  
* **Empty State:** If LiabilityListDTO\[\] is empty, display a Shadcn EmptyState component. It should convey a positive or neutral tone ("No active liabilities") rather than a missing data error, with an "Add Liability" primary action.  
* **Error State:** Data fetch failures **MUST** render an inline error boundary within the table container. Mutation failures (e.g., creating a liability) **MUST** trigger a Toast with variant="destructive".  
* **Optimistic UI:** Upon submitting a new liability or a payment transaction, inject a temporary record into the React Query cache (queryClient.setQueryData) to immediately update the TotalOutstanding footer before the server confirms.

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Liabilities | Pasivos |
| **Primary Action Button** | Add Liability | Añadir Pasivo |
| **Search Placeholder** | Search liabilities, creditors... | Buscar pasivos, acreedores... |
| **Table Column: Outstanding** | Outstanding Balance | Saldo Pendiente |
| **Table Column: Interest Rate** | Interest Rate | Tipo de Interés |
| **Table Column: Maturity Date** | Maturity Date | Fecha de Vencimiento |
| **Empty State (No Data)** | You have no active liabilities. | No tienes pasivos activos. |
| **Drawer Tab: Summary** | Terms & Summary | Condiciones y Resumen |

---

#### **Feature 3: Global Transactions Ledger (/app/(app)/transactions/page.tsx)**

##### **1\. UX Mental Model & Journey**

The Transactions view is the immutable chronological ledger of the family office. Unlike the Asset or Liability views (which represent current state snapshots), this view represents *flow*. The user journey prioritizes high-speed searching, filtering by date ranges, and tracing cash flows across the entire portfolio. Users must be able to instantly filter transactions associated with a specific asset, liability, or category without losing their place. Because this table can grow to thousands of rows, pagination and infinite scroll paradigms must be strictly managed via URL parameters.

##### **2\. Route & Component Tree**

You **MUST** follow this strict DOM hierarchy. This is a read-heavy, high-density view.

* TransactionsRoute (/app/(app)/transactions/page.tsx)  
  * TransactionsHeader  
    * PageTitle \<- Mapped to \-\> Static ("Transactions")  
    * AddTransactionButton \-\> Triggers AddTransactionModal  
  * TransactionsToolbar (State driven entirely by URL Search Params)  
    * DateRangePicker (State: ?startDate=YYYY-MM-DD\&endDate=YYYY-MM-DD)  
    * FilterMenu (State: ?type=, ?assetId=, ?liabilityId=)  
    * GlobalSearch (State: ?query=)  
  * TransactionsDataTable (TanStack Table \+ Shadcn Table)  
    * Row \<- Mapped to \-\> TransactionListDTO\[\]  
      * Cell\[Date\] \<- Mapped to \-\> TransactionListDTO.transactionDate  
      * Cell\[TypeBadge\] (Shadcn Badge styling derived from type) \<- Mapped to \-\> TransactionListDTO.transactionType (e.g., Buy, Sell, Dividend, Payment)  
      * Cell\[Description\] \<- Mapped to \-\> TransactionListDTO.description  
      * Cell\[LinkedEntity\] (Clickable link routing to respective drawer) \<- Mapped to \-\> TransactionListDTO.linkedEntityName & TransactionListDTO.linkedEntityId  
      * Cell\[AmountLocal\] \<- Mapped to \-\> TransactionListDTO.amountLocal & TransactionListDTO.currencyCode  
      * Cell\[AmountBase\] \<- Mapped to \-\> TransactionListDTO.amountBase (Formatted as Base Currency, color-coded: green for inflow, red/destructive for outflow)  
  * PaginationFooter (State: ?page=, ?pageSize=)

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **View & Filter Interaction:**  
  * *Action:* User selects a date range (e.g., YTD).  
  * *Mechanism:* Update URL to /transactions?startDate=2026-01-01\&endDate=2026-12-31. TransactionsDataTable automatically triggers a fresh React Query fetch using these URL parameters as the query key variables.  
* **Cross-linking Interaction:**  
  * *Action:* User clicks the "Global Tech Fund III" badge in the LinkedEntity column.  
  * *Mechanism:* Update URL to /assets?assetId=UUID. The application transitions to the Assets route and automatically opens the Asset Detail Drawer.  
* **Create Transaction Mutation:**  
  * *Action:* User submits the AddTransactionModal form (used for manual ledger entries not tied directly to a specific asset/liability drawer action).  
  * *Validation Bridge:* The form **MUST** use react-hook-form strictly bound to the backend's createTransactionSchema (Zod).  
  * *Server Action:* createTransaction(data: z.infer\<typeof createTransactionSchema\>).

##### **4\. Finite State Machine (FSM)**

* **Loading State:** You **MUST** use Shadcn Skeleton rows mirroring the table structure.  
* **Empty State:** If TransactionListDTO\[\] is empty, render a Shadcn EmptyState. If filters are active, the copy should suggest clearing filters. If no filters are active, the copy should state the ledger is empty.  
* **Error State:** Data fetch failures **MUST** render an inline error boundary within the table container with a destructive coloured retry button.  
* **Optimistic UI:** When manually logging a transaction, inject the new record at the top of the React Query cache (queryClient.setQueryData) immediately. If the server action fails, rollback the cache and show a destructive Toast.

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Transactions | Transacciones |
| **Primary Action Button** | Add Transaction | Añadir Transacción |
| **Search Placeholder** | Search descriptions, entities... | Buscar descripciones, entidades... |
| **Table Column: Date** | Date | Fecha |
| **Table Column: Type** | Type | Tipo |
| **Table Column: Amount (Base)** | Amount (Base) | Importe (Base) |
| **Empty State (Filtered)** | No transactions match your filters. | Ninguna transacción coincide con tus filtros. |
| **Empty State (No Data)** | Your ledger is empty. | Tu libro mayor está vacío. |
| **Date Range Presets** | YTD, Last 30 Days, Last 12 Months | YTD, Últimos 30 días, Últimos 12 meses |

---

#### **Feature 4: Documents Library (/app/(app)/documents/page.tsx)**

##### **1\. UX Mental Model & Journey**

The Documents Library is the central repository for all physical and digital records (tax forms, bank reports, legal contracts). The user journey demands a highly visual, searchable, and interconnected experience. Unlike a standard file system, every document here **MUST** be contextualized by its relationships (e.g., a "K-1 Tax Form" is linked to both a specific "Asset" and "Custodian"). Users land on a filterable grid or table view. Clicking a document triggers the slide-out drawer (Sheet) to display metadata, linked entities, and a secure preview/download link without navigating away from the library context.

##### **2\. Route & Component Tree**

You **MUST** follow this strict DOM hierarchy.

* DocumentsRoute (/app/(app)/documents/page.tsx)  
  * DocumentsHeader  
    * PageTitle \<- Mapped to \-\> Static ("Documents")  
    * UploadDocumentButton \-\> Triggers UploadDocumentModal  
  * DocumentsToolbar (State driven entirely by URL Search Params)  
    * FilterMenu (State: ?type=, ?custodianId=, ?assetId=, ?liabilityId=)  
    * GlobalSearch (State: ?query=)  
  * DocumentsViewSelector (State: ?view=grid|table)  
    * *If table:* DocumentsDataTable (TanStack Table \+ Shadcn Table)  
      * Row \<- Mapped to \-\> DocumentListDTO\[\]  
        * Cell\[Name\] \<- Mapped to \-\> DocumentListDTO.name  
        * Cell\[TypeBadge\] \<- Mapped to \-\> DocumentListDTO.type (e.g., 'tax\_document', 'bank\_report')  
        * Cell\[Date\] \<- Mapped to \-\> DocumentListDTO.documentDate  
    * *If grid:* DocumentsGrid  
      * DocumentCard \<- Mapped to \-\> DocumentListDTO\[\]  
        * CardHeader\[Icon+Name\] \<- Mapped to \-\> DocumentListDTO.type & DocumentListDTO.name  
        * CardContent\[Metadata\] \<- Mapped to \-\> DocumentListDTO.documentDate  
  * DocumentDetailDrawer (Shadcn Sheet, rendered if ?documentId=UUID is present)  
    * SheetHeader  
      * SheetTitle \<- Mapped to \-\> DocumentDetailDTO.name  
      * DownloadButton \<- Mapped to \-\> DocumentDetailDTO.fileUrl  
    * MetadataSection  
      * Detail\[Date\] \<- Mapped to \-\> DocumentDetailDTO.documentDate  
      * Detail\[Type\] \<- Mapped to \-\> DocumentDetailDTO.type  
      * Detail\[Notes\] \<- Mapped to \-\> DocumentDetailDTO.notes  
    * LinkedEntitiesSection (Clickable badges routing to respective drawers)  
      * LinkedAssets \<- Mapped to \-\> DocumentDetailDTO.linkedAssets\[\]  
      * LinkedLiabilities \<- Mapped to \-\> DocumentDetailDTO.linkedLiabilities\[\]

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **View & Filter Interaction:**  
  * *Action:* User filters by "Tax Document" type and searches "2025".  
  * *Mechanism:* Update URL to /documents?type=tax\_document\&query=2025. The active view (Grid or Table) automatically triggers a fresh React Query fetch using these parameters.  
* **Drawer & Cross-linking Interaction:**  
  * *Action:* User opens a document and clicks a linked asset badge ("Global Tech Fund III").  
  * *Mechanism:* Update URL to /assets?assetId=UUID. The app transitions to the Assets route and immediately opens the Asset Detail Drawer, preserving the user's workflow.  
* **Upload Document Mutation:**  
  * *Action:* User submits the UploadDocumentModal form (handling both file binary and metadata).  
  * *Validation Bridge:* The form **MUST** use react-hook-form strictly bound to the backend's uploadDocumentSchema (Zod). Note: The schema includes optional arrays (assetIds, liabilityIds) to establish relationships at upload time.  
  * *Server Action:* uploadDocument(data: FormData) (Next.js server action parsing the multipart form, validating metadata against the Zod schema, and handling storage).

##### **4\. Finite State Machine (FSM)**

* **Loading State:** You **MUST** use Shadcn Skeleton cards (for grid view) or rows (for table view).  
* **Empty State:** If DocumentListDTO\[\] is empty, render a Shadcn EmptyState with an "Upload File" dropzone graphic and primary action button.  
* **Uploading State:** Document uploads **MUST** feature a dedicated progress toast or inline progress bar within the modal, as file I/O introduces variable latency.  
* **Error State:** If the signed URL fetch fails when attempting to download or preview a document, trigger a Toast with variant="destructive".

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Documents | Documentos |
| **Primary Action Button** | Upload Document | Subir Documento |
| **Search Placeholder** | Search document names, notes... | Buscar nombres de documentos, notas... |
| **View Toggle** | Grid / Table | Cuadrícula / Tabla |
| **Drawer: Linked Entities** | Linked To | Vinculado a |
| **Upload Modal: Drag & Drop** | Drag and drop your file here, or click to browse. | Arrastra y suelta tu archivo aquí, o haz clic para buscar. |
| **Empty State (No Data)** | Your document library is empty. | Tu biblioteca de documentos está vacía. |

---

#### **Feature 5: Executive Dashboard (/app/(app)/dashboard/page.tsx)**

##### **1\. UX Mental Model & Journey**

The Dashboard is the executive summary for the HNWI or family office principal. The user journey here is entirely analytical and read-heavy. The primary goal is immediate cognitive clarity regarding the total portfolio health. Users land on this page to answer three critical questions instantly: *What is my Net Worth? How is it distributed? How has it trended over time?* You **MUST** design this view using distinct, modular widgets (Cards) that independently fetch or compute their data, ensuring that a slow historical trend query does not block the rendering of the top-level KPI numbers.

##### **2\. Route & Component Tree**

You **MUST** follow this strict DOM hierarchy. All charts **MUST** utilize Shadcn's Chart component (a wrapper around Recharts) to ensure visual consistency with our Tailwind global tokens.

* DashboardRoute (/app/(app)/dashboard/page.tsx)  
  * DashboardHeader  
    * PageTitle \<- Mapped to \-\> Static ("Dashboard")  
    * TimeframeSelector (State driven: ?range=ytd|1y|5y|all)  
  * DashboardGrid (CSS Grid, standard Tailwind responsive layout)  
    * KPISection  
      * KPICard\[NetWorth\] \<- Mapped to \-\> DashboardSummaryDTO.totalNetWorthBase  
      * KPICard\[TotalAssets\] \<- Mapped to \-\> DashboardSummaryDTO.totalAssetsBase (Clickable \-\> routes to /assets)  
      * KPICard\[TotalLiabilities\] \<- Mapped to \-\> DashboardSummaryDTO.totalLiabilitiesBase (Clickable \-\> routes to /liabilities, styled with text-destructive)  
    * ChartSection\[Trend\]  
      * NetWorthLineChart (Shadcn Chart \+ Recharts LineChart) \<- Mapped to \-\> DashboardSummaryDTO.historicalNetWorth\[\]  
        * XAxis \<- Mapped to \-\> historicalNetWorth\[\].snapshotDate  
        * YAxis \<- Mapped to \-\> historicalNetWorth\[\].netWorthBase  
    * ChartSection\[Allocation\]  
      * AllocationDonutChart (Shadcn Chart \+ Recharts PieChart) \<- Mapped to \-\> DashboardSummaryDTO.allocationByCategory\[\]  
        * PieSlice \<- Mapped to \-\> allocationByCategory\[\].categoryName & allocationByCategory\[\].totalValueBase  
    * ChartSection\[TopPerformers\]  
      * TopAssetsList (Minimal Shadcn Table or List) \<- Mapped to \-\> DashboardSummaryDTO.topPerformingAssets\[\]  
        * Row \<- Mapped to \-\> topPerformingAssets\[\].name & topPerformingAssets\[\].unrealisedGainPct

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **View & Filter Interaction:**  
  * *Action:* User selects "1Y" from the Timeframe Selector.  
  * *Mechanism:* Update URL to /dashboard?range=1y. The NetWorthLineChart component reads this URL parameter and triggers a fresh React Query fetch for the historicalNetWorth data specifically constrained to the last 12 months.  
* **Navigation Interaction:**  
  * *Action:* User clicks the "Total Assets" KPI card.  
  * *Mechanism:* Standard Next.js \<Link\> routes the user to /assets. No complex state passing is required.

##### **4\. Finite State Machine (FSM)**

* **Loading State:** You **MUST** implement independent Shadcn Skeleton loaders for *each* widget. The KPISection will likely resolve faster than the ChartSection. Do not block the entire page rendering waiting for the slowest query.  
* **Empty State:** If the platform is newly initialized (zero assets/liabilities), the dashboard **MUST** render a global EmptyState component encouraging the user to "Set up your first asset" with a direct link to the /assets route.  
* **Error State:** You **MUST** use React Error Boundaries at the *widget level*. If the NetWorthLineChart fails to fetch, it should display an isolated error boundary with a retry button, allowing the KPISection and AllocationDonutChart to remain visible and functional.

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Dashboard | Panel de Control |
| **KPI: Net Worth** | Total Net Worth | Patrimonio Neto Total |
| **KPI: Assets** | Total Assets | Activos Totales |
| **KPI: Liabilities** | Total Liabilities | Pasivos Totales |
| **Chart Title: Trend** | Net Worth Trend | Evolución del Patrimonio |
| **Chart Title: Allocation** | Asset Allocation | Distribución de Activos |
| **List Title: Top Assets** | Top Performing Assets | Activos con Mejor Rendimiento |
| **Timeframe: YTD** | YTD | YTD (Año hasta la fecha) |
| **Timeframe: 1 Year** | 1 Year | 1 Año |
| **Empty State (New User)** | Welcome to Vexel. Add your first asset to see your wealth visualized. | Bienvenido a Vexel. Añade tu primer activo para visualizar tu patrimonio. |

---

#### **Feature 6: Custodians & Owners Management (/app/(app)/entities/page.tsx)**

##### **1\. UX Mental Model & Journey**

While assets and liabilities are the "what," Custodians and Owners represent the "where" and "who." The UX here functions as a lightweight CRM specifically tailored for counterparty risk and ownership distribution. The user journey requires understanding total exposure to a single institution (e.g., "How much of my wealth is held at Julius Baer?") or the total attribution to a specific family member/trust. The user lands on a unified directory toggleable between 'Custodians' and 'Owners'. Clicking an entity opens a slide-out drawer (Sheet) revealing contact details and, crucially, a rolled-up list of every asset and liability associated with that entity.

##### **2\. Route & Component Tree**

You **MUST** follow this strict DOM hierarchy. State is driven by URL parameters to allow deep-linking directly to a specific bank or family member's profile.

* EntitiesRoute (/app/(app)/entities/page.tsx)  
  * EntitiesHeader  
    * PageTitle \<- Mapped to \-\> Static ("Custodians & Owners")  
    * AddEntityDropdown \-\> Triggers AddCustodianModal OR AddOwnerModal  
  * EntitiesToolbar (State driven entirely by URL Search Params)  
    * Tabs (View state: ?tab=custodians|owners)  
    * GlobalSearch (State: ?query=)  
  * EntitiesDataTable (TanStack Table \+ Shadcn Table)  
    * *If ?tab=custodians:*  
      * Row \<- Mapped to \-\> CustodianListDTO\[\]  
        * Cell\[Name\] \<- Mapped to \-\> CustodianListDTO.name  
        * Cell\[Contact\] \<- Mapped to \-\> CustodianListDTO.contactName & CustodianListDTO.email  
        * Cell\[TotalAssetsCount\] \<- Mapped to \-\> CustodianListDTO.linkedAssetCount  
        * Cell\[TotalAUM\] \<- Mapped to \-\> CustodianListDTO.totalAumBase (Formatted as Base Currency)  
    * *If ?tab=owners:*  
      * Row \<- Mapped to \-\> OwnerListDTO\[\]  
        * Cell\[Name\] \<- Mapped to \-\> OwnerListDTO.name  
        * Cell\[Type\] \<- Mapped to \-\> OwnerListDTO.type (e.g., Individual, Trust, Holding Co)  
        * Cell\[AttributedValue\] \<- Mapped to \-\> OwnerListDTO.attributedNetWorthBase  
  * EntityDetailDrawer (Shadcn Sheet, rendered if ?custodianId=UUID OR ?ownerId=UUID is present)  
    * SheetHeader  
      * SheetTitle \<- Mapped to \-\> EntityDetailDTO.name  
    * Tabs (State driven by ?entityTab=)  
      * TabsContent\[value="details"\]  
        * ContactCard \<- Mapped to \-\> EntityDetailDTO.contactInfo  
      * TabsContent\[value="portfolio"\]  
        * LinkedAssetsTable \<- Mapped to \-\> EntityDetailDTO.assets\[\] (Clickable rows updating URL to /assets?assetId=...)  
        * LinkedLiabilitiesTable \<- Mapped to \-\> EntityDetailDTO.liabilities\[\] (Clickable rows updating URL to /liabilities?liabilityId=...)

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **View & Filter Interaction:**  
  * *Action:* User toggles from Custodians to Owners.  
  * *Mechanism:* Update URL to /entities?tab=owners. The EntitiesDataTable swaps column definitions and triggers a fresh React Query fetch for the OwnerListDTO.  
* **Cross-linking Interaction:**  
  * *Action:* Inside the Julius Baer drawer, user clicks on "Global Tech Fund III".  
  * *Mechanism:* Update URL to /assets?assetId=UUID. The application transitions seamlessly to the Assets route and automatically opens the Asset Detail Drawer, preserving relational navigation.  
* **Create Entity Mutation:**  
  * *Action:* User submits the AddCustodianModal form.  
  * *Validation Bridge:* The form **MUST** use react-hook-form strictly bound to the backend's createCustodianSchema (Zod).  
  * *Server Action:* createCustodian(data: z.infer\<typeof createCustodianSchema\>).

##### **4\. Finite State Machine (FSM)**

* **Loading State:** You **MUST** use Shadcn Skeleton rows for the data table. Do not block the page render.  
* **Empty State:** If CustodianListDTO\[\] or OwnerListDTO\[\] is empty, render a Shadcn EmptyState component with a relevant icon (e.g., a bank building for Custodians, a user badge for Owners) and a clear call-to-action to create the first record.  
* **Error State:** Data fetch failures **MUST** render an inline error boundary within the table container.  
* **Deletion Constraint (Destructive Action):** If an Admin attempts to delete a Custodian that has linked assets, the server action **MUST** fail. The UI **MUST** pre-emptively disable the delete button and show a Shadcn Tooltip explaining: "Cannot delete a custodian with active assets. Reassign assets first."

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Custodians & Owners | Custodios y Titulares |
| **Tab: Custodians** | Custodians | Custodios |
| **Tab: Owners** | Owners | Titulares |
| **Primary Action (Dropdown)** | Add Entity | Añadir Entidad |
| **Table Column: Total AUM** | Total AUM | Total Gestionado |
| **Table Column: Contact** | Primary Contact | Contacto Principal |
| **Empty State (Custodians)** | You have not added any custodians yet. | Aún no has añadido ningún custodio. |
| **Delete Disabled Tooltip** | Cannot delete while assets are linked. | No se puede eliminar mientras haya activos vinculados. |

---

#### **Feature 7: Settings & Configuration (/app/(app)/settings/page.tsx)**

##### **1\. UX Mental Model & Journey**

The Settings area is the administrative engine of the platform. Unlike the daily operational views (Assets, Transactions), this route is strictly for configuring the foundational parameters of the family office. The UX relies on vertical or horizontal tabbed navigation to separate distinct administrative domains: Organization configuration (Base Currency, Name), User Management (RBAC: Admin, Editor, Viewer), and Taxonomy Management (Custom categories for assets/liabilities). Because this section contains "Danger Zones" (e.g., modifying access, dealing with immutable fields like base currency), the UI **MUST** prioritize explicit confirmation dialogs and crystal-clear helper text over speed.

##### **2\. Route & Component Tree**

You **MUST** strictly follow this DOM hierarchy. Navigation between settings sections is driven entirely by URL parameters to allow deep-linking directly to a specific configuration screen.

* SettingsRoute (/app/(app)/settings/page.tsx)  
  * SettingsHeader  
    * PageTitle \<- Mapped to \-\> Static ("Settings")  
  * SettingsContainer (Two-column layout: Sidebar Nav \+ Content Area)  
    * SettingsSidebarNav (State driven: ?section=organization|users|categories)  
    * SettingsContentArea  
      * *If ?section=organization:* OrganizationView  
        * Card\[General\]  
          * Form  
            * Input\[OrgName\] \<- Mapped to \-\> OrganizationSettingsDTO.organizationName  
            * Input\[BaseCurrency\] (Read-only after initialization) \<- Mapped to \-\> OrganizationSettingsDTO.baseCurrency  
            * SubmitButton  
      * *If ?section=users:* UsersView  
        * ViewHeader  
          * Title \<- Mapped to \-\> Static ("User Management")  
          * AddUserButton \-\> Triggers AddUserModal  
        * UsersDataTable (Shadcn Table)  
          * Row \<- Mapped to \-\> UserListDTO\[\]  
            * Cell\[Name\] \<- Mapped to \-\> UserListDTO.firstName & UserListDTO.lastName  
            * Cell\[Email\] \<- Mapped to \-\> UserListDTO.email  
            * Cell\[RoleBadge\] \<- Mapped to \-\> UserListDTO.role (e.g., Admin, Editor)  
            * Cell\[Actions\] \-\> Triggers EditUserModal or DeleteUserAlert  
      * *If ?section=categories:* TaxonomyView  
        * Tabs (State driven: ?taxonomyTab=assets|liabilities|documents)  
        * CategoryDataTable (Shadcn Table)  
          * Row \<- Mapped to \-\> CategoryDTO\[\]  
            * Cell\[Name\] \<- Mapped to \-\> CategoryDTO.name  
            * Cell\[ColorBadge\] \<- Mapped to \-\> CategoryDTO.colorHex (Rendered via inline style on Shadcn Badge)

##### **3\. Interaction & Mutation Schema (The Bridge)**

* **Navigation Interaction:**  
  * *Action:* User clicks "Users" in the settings sidebar.  
  * *Mechanism:* Update URL to /settings?section=users. The page re-renders to display the UsersView and triggers a React Query fetch for the user list.  
* **Update Organization Mutation:**  
  * *Action:* User updates the Family Office name and submits.  
  * *Validation Bridge:* Bound to updateOrganizationSchema (Zod). Base currency **MUST** be omitted from the update payload if it has already been set, as enforced by the database contract.  
  * *Server Action:* updateOrganization(data: z.infer\<typeof updateOrganizationSchema\>).  
* **User Management Mutation (Danger Zone):**  
  * *Action:* Admin clicks "Revoke Access" (Delete) on a user.  
  * *Mechanism:* Triggers a Shadcn AlertDialog. The user **MUST** confirm before the deleteUser(userId) Server Action is dispatched.

##### **4\. Finite State Machine (FSM)**

* **Authorization State:** If a non-Admin user attempts to access /settings?section=users or /settings?section=organization, the UI **MUST** intercept and render a Shadcn EmptyState component formatted as a 403 Forbidden error ("You do not have permission to view this section").  
* **Loading State:** Form fields in OrganizationView should display Shadcn Skeleton inputs during the initial fetch. The UsersDataTable should use skeleton rows.  
* **Disabled State (Immutability):** The Base Currency select dropdown **MUST** be permanently disabled (disabled={true}) if the OrganizationSettingsDTO.baseCurrency is already populated. A Shadcn Tooltip should explain: "Base currency cannot be changed after initial setup."  
* **Mutation State:** Submit buttons **MUST** display a loading spinner replacing the text (or an adjacent icon) while Server Actions are pending to prevent double-submissions.

##### **5\. Microcopy Table**

You **MUST** strictly use the following text mappings.

| UI Element | Exact English Text | Exact Spanish Text (Target) |
| :---- | :---- | :---- |
| **Page Title** | Settings | Configuración |
| **Nav: Organization** | Organization | Organización |
| **Nav: Users** | User Management | Gestión de Usuarios |
| **Nav: Categories** | Categories & Tags | Categorías y Etiquetas |
| **Label: Base Currency** | Base Currency | Moneda Base |
| **Tooltip: Base Currency** | Base currency is permanently locked after setup to ensure historical data integrity. | La moneda base se bloquea permanentemente tras la configuración para garantizar la integridad de los datos históricos. |
| **Button: Add User** | Invite User | Invitar Usuario |
| **Role: Admin** | Administrator | Administrador |
| **Delete User Warning** | Are you sure? This user will immediately lose all access to the platform. | ¿Estás seguro? Este usuario perderá inmediatamente todo el acceso a la plataforma. |
| **Error: 403** | You do not have permission to view this section. | No tienes permiso para ver esta sección. |

