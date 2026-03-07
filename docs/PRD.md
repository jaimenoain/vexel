

| PRODUCT REQUIREMENTS DOCUMENT Family Office Asset & Liability Management Platform Version 1.0  ·  March 2025 |
| :---- |

This document defines the product requirements for a web-based asset and liability management platform designed for High Net Worth Individuals (HNWIs) and small family offices. It covers the full product scope, data model, feature set, and user experience guidelines.

## **Table of Contents**

1\.  Executive Summary3

2\.  Goals & Success Metrics3

3\.  Users & Roles4

4\.  Data Model4

5\.  Navigation & Information Architecture7

6\.  Core Features — Assets7

7\.  Core Features — Liabilities10

8\.  Core Features — Transactions11

9\.  Core Features — Documents12

10\.  Dashboard13

11\.  Custodians & Owners14

12\.  Settings & Configuration14

13\.  Calculations & Formulas15

14\.  Internationalisation16

15\.  Version Roadmap16

16\.  Open Questions17

# **1\. Executive Summary**

The platform gives a HNWI or small family office a single place to track all financial assets and liabilities across custodians, currencies, and asset classes. Users can record transactions, upload valuations, review performance over time, and store documents — all linked together with full relationship context.

The core value proposition is clarity: at any moment the portfolio owner should be able to open the platform and immediately understand where they stand — total net worth, how each investment is performing, how much they owe, and which liabilities are most pressing.

| Scope for V1 Single-family deployment. Multi-tenancy (multiple families) is explicitly out of scope for V1. AI-powered document extraction (auto-updating valuations from PDF bank reports) is deferred to V2. |
| :---- |

# **2\. Goals & Success Metrics**

### **Primary Goals**

* Provide a real-time, consolidated view of the family's total net worth (assets minus liabilities).

* Track performance of every asset over time with automatic IRR calculation.

* Monitor the status and amortisation history of all liabilities.

* Store and organise financial documents linked to their corresponding assets or custodians.

* Support multiple users with different permission levels.

### **Success Metrics (V1)**

| Metric | Target |
| :---- | :---- |
| Time to understand portfolio status | \< 30 seconds from login |
| Data entry: add a transaction | \< 60 seconds |
| Performance: dashboard load time | \< 2 seconds |
| IRR accuracy vs manual Excel calculation | \< 0.1% deviation |
| User adoption (family members) | All relevant roles onboarded in week 1 |

# **3\. Users & Roles**

V1 ships with two active roles. V2 will add Viewer and Guest.

| Role | Permissions | Typical User |
| :---- | :---- | :---- |
| Admin | Full access: create, edit, delete all records, manage users and settings | Family office manager, principal |
| Editor | Create and edit records (assets, liabilities, transactions, valuations, documents). Cannot delete assets/liabilities or access settings. | Accountant, assistant |
| Viewer (V2) | Read-only access to all data and dashboards. Cannot create or edit. | Family member, auditor |
| Guest (V2) | Access limited to a defined subset of data (e.g. a specific entity or report). Configurable per user. | Tax advisor, external consultant |

Authentication is handled via email \+ password with optional SSO (Google Workspace). All sessions enforce HTTPS. Admins can invite users by email and assign roles.

# **4\. Data Model**

The platform is built around eight core tables. Every table supports full-text search, sorting, and filtering.

## **4.1  Assets**

The central table. Each row represents a single investment position held by the family.

| Field | Type | Notes |
| :---- | :---- | :---- |
| name | Text | Display name of the investment |
| type | Single-select | Configurable by admin (e.g. Financiera, Alternativa, Inmuebles, Préstamos Concedidos, Sociedades, Tesorería) |
| status | Single-select | Active / Closed |
| owner | Link → Owners | Which entity/person holds this asset |
| custodian | Link → Custodians | Bank or institution holding the asset |
| currency | Single-select | Asset's native currency |
| total\_invested | Computed | Sum of all contribution transactions |
| total\_withdrawn | Computed | Sum of all withdrawal transactions |
| net\_invested | Computed | total\_invested − total\_withdrawn |
| market\_value | Computed | Latest valuation snapshot value |
| unrealised\_gain | Computed | market\_value − net\_invested |
| irr | Computed | XIRR from all transactions \+ current value |
| last\_valuation\_date | Date | Date of most recent valuation snapshot |
| ticker / isin | Text | Optional — used for market data feed |
| notes | Long text | Free-form notes |
| documents | Link → Documents | Linked documents |
| transactions | Link → Transactions | All transactions for this asset |
| valuations | Link → Valuations | All valuation snapshots |

## **4.2  Liabilities**

Each row is a debt or obligation of the family.

| Field | Type | Notes |
| :---- | :---- | :---- |
| name | Text | Display name (e.g. Préstamo Grupo Planner) |
| type | Single-select | Préstamo personal, Hipoteca, Línea de crédito, Póliza, Tarjeta, Saldo (intercompany), Other |
| custodian | Link → Custodians | Institution providing the liability |
| owner | Link → Owners | Entity/person responsible for this liability |
| currency | Single-select | Currency of the liability |
| credit\_limit | Number | Maximum authorised amount |
| gross\_dispositions | Computed | Sum of all Disposition movements |
| gross\_repayments | Computed | Sum of all Amortisation movements |
| net\_balance | Computed | gross\_dispositions − gross\_repayments (negative \= owed) |
| pct\_pending | Computed | net\_balance / credit\_limit |
| interest\_rate | Number | Annual rate (%) |
| start\_date | Date | Date of origination |
| maturity\_date | Date | Date of final repayment |
| notes | Long text |  |
| documents | Link → Documents |  |
| movements | Link → Transactions | All movements for this liability |

## **4.3  Transactions**

Every money movement is recorded here, linked to either an asset or a liability (not both).

| Field | Type | Notes |
| :---- | :---- | :---- |
| date | Date | Transaction date |
| type | Single-select | Contribution, Withdrawal, Income, Expense, Disposition (liabilities), Amortisation (liabilities), Other |
| amount | Number | Positive number; direction inferred from type |
| currency | Single-select | Currency of the transaction |
| fx\_rate | Number | Exchange rate to base currency (auto-filled if available) |
| amount\_base | Computed | amount × fx\_rate in base currency |
| asset | Link → Assets | Linked asset (if applicable) |
| liability | Link → Liabilities | Linked liability (if applicable) |
| description | Text | Free-form description |
| notes | Long text |  |
| documents | Link → Documents | Receipt or supporting document |

| Transaction direction logic Contributions and Dispositions increase invested capital / drawn balance. Withdrawals and Amortisations decrease it. Income is positive cash flow from the asset (dividends, rent). Expenses are costs charged against the asset (management fees, maintenance). |
| :---- |

## **4.4  Valuations**

Point-in-time snapshots of an asset's market value. Multiple snapshots build the performance timeline.

| Field | Type | Notes |
| :---- | :---- | :---- |
| date | Date | Valuation date |
| asset | Link → Assets | The asset being valued |
| value | Number | Market value at that date |
| currency | Single-select | Currency of the valuation |
| value\_base | Computed | Converted to base currency |
| source | Single-select | Manual / Market feed / Document upload |
| notes | Long text |  |
| document | Link → Documents | Source document if applicable |

## **4.5  Liability Balances**

Point-in-time balance snapshots for liabilities, used to build the liability timeline chart.

| Field | Type | Notes |
| :---- | :---- | :---- |
| date | Date | Snapshot date |
| liability | Link → Liabilities | The liability being snapshotted |
| balance | Number | Outstanding balance at that date |
| currency | Single-select |  |
| notes | Long text |  |

## **4.6  Owners**

Personal or corporate entities that form the family structure. Assets and liabilities are assigned to an owner.

| Field | Type | Notes |
| :---- | :---- | :---- |
| name | Text | Display name (e.g. Álvaro, Lucía, Asset Holding Ltd) |
| type | Single-select | Individual / Company / Trust / Other |
| tax\_id | Text | NIF, CIF, or equivalent |
| notes | Long text |  |
| assets | Link → Assets | All assets held by this owner |
| liabilities | Link → Liabilities | All liabilities of this owner |

## **4.7  Custodians**

Banks or financial institutions where assets are held or liabilities originated.

| Field | Type | Notes |
| :---- | :---- | :---- |
| name | Text | Institution name (e.g. Julius Bär, Bankinter) |
| type | Single-select | Bank / Fund Manager / Broker / Other |
| logo | Attachment | Logo image for display |
| contact\_name | Text | Primary contact |
| contact\_email | Email |  |
| notes | Long text |  |
| assets | Link → Assets | All assets with this custodian |
| liabilities | Link → Liabilities | All liabilities with this custodian |
| documents | Link → Documents | Reports from this custodian |

## **4.8  Documents**

Stores all uploaded files. Documents can be linked to assets, liabilities, transactions, or custodians.

| Field | Type | Notes |
| :---- | :---- | :---- |
| name | Text | Display name of the document |
| file | Attachment | PDF, image, spreadsheet, etc. |
| date | Date | Document date (e.g. report date) |
| type | Single-select | Bank report / Tax document / Legal / Valuation / Other |
| custodian | Link → Custodians | Issuing institution |
| assets | Link → Assets | Assets referenced in this document |
| liabilities | Link → Liabilities | Liabilities referenced |
| transactions | Link → Transactions | Transactions this document supports |
| notes | Long text |  |

## **4.9  Log (Snapshot Store)**

Automated monthly snapshots storing the computed state of every asset and liability. Powers the timeline charts. This table is written by a scheduled background job and is not directly editable by users.

| Field | Type | Notes |
| :---- | :---- | :---- |
| date | Date | First day of the snapshot month |
| asset / liability | Link | The entity being snapshotted |
| market\_value | Number | Value at snapshot date |
| net\_invested | Number | Cumulative net invested at snapshot date |
| irr\_to\_date | Number | IRR calculated up to snapshot date |
| balance | Number | Outstanding balance (liabilities only) |

# **5\. Navigation & Information Architecture**

The app uses a persistent left sidebar with five primary sections. The main content area updates on section change. Detail pages open as right-side drawers (sliding panels) overlaid on the list, preserving context.

| Sidebar Item | Icon | Description |
| :---- | :---- | :---- |
| Dashboard | Chart | Top-level net worth overview and performance summary |
| Assets | Trending up | Full list of all investment positions |
| Liabilities | Trending down | Full list of all debts and obligations |
| Transactions | Arrow left-right | Complete movement log across all assets and liabilities |
| Documents | File | Document library with filters by custodian and type |
| Entities | Building | Owners and Custodians management |
| Settings | Gear | Admin only: categories, currencies, users, integrations |

| Drawer pattern Clicking any row in a list view opens a detail drawer from the right side. The drawer slides in and takes up \~50% of the screen width on desktop. The underlying list remains visible and navigable. The drawer has tabbed sections (Summary, Transactions, Documents, Charts). Users can navigate forward/backward between records without closing the drawer. |
| :---- |

# **6\. Core Features — Assets**

## **6.1  Assets List View**

The main list shows all active assets by default, with a toggle to show closed positions. The list is grouped, sorted, and filtered.

### **Columns displayed**

* Name

* Net Invested (base currency)

* Market Value (base currency)

* Unrealised Gain / Loss (absolute \+ %)

* IRR (%)

* Type (coloured badge)

* Last Valuation Date

### **Grouping options**

* By Type (default)

* By Custodian

* By Owner

* No grouping

### **Filter options**

* Type (multi-select)

* Custodian

* Owner

* Status (Active / Closed)

* Currency

### **Sort options**

* Name (A–Z)

* Market Value (high–low)

* IRR (high–low)

* Last Valuation Date (newest first)

### **Tabs**

At the top of the list: All  |  Financiera  |  Alternativa  |  Inmuebles  |  Sociedades  |  Préstamos  |  Tesorería  |  Otros. Tabs are dynamically generated from configured asset types.

### **Totals row**

A sticky footer row always shows the sum of Net Invested, Market Value, and Gain/Loss for the current filtered view.

## **6.2  Asset Detail Drawer**

Opens when a user clicks on any asset row. Contains four tabs.

### **Tab 1: Summary**

* Key metrics cards: Net Invested, Market Value, Unrealised Gain, IRR, Last Valuation Date

* Owner and Custodian (clickable links opening their respective drawers)

* Type badge, currency, notes

* Ticker/ISIN if set

* Last 3 transactions (preview) with a 'See all' link to the Transactions tab

* Latest valuation with a 'See all valuations' link

### **Tab 2: Transactions**

* Full list of all transactions for this asset, sorted by date descending

* Each row: date, type badge, amount, currency, description

* Add Transaction button (opens a quick-add form inline)

* Filter by transaction type

### **Tab 3: Valuations**

* List of all valuation snapshots (date, value, source, notes)

* Add Valuation button (manual entry form)

* If ticker/ISIN is set, a 'Refresh from market' button fetches the latest price

### **Tab 4: Charts**

* Market Value vs Net Invested over time (line chart, monthly data from Log table)

* IRR over time (line chart)

* Contributions and Withdrawals by year (bar chart)

* Date range selector: YTD / 1Y / 3Y / 5Y / All

### **Tab 5: Documents**

* All documents linked to this asset

* Upload a new document and link it to this asset

| Edit & Delete Admins and Editors can edit any field from the drawer header (name, type, owner, custodian, notes, ticker). A pencil icon opens an edit mode. Only Admins can delete an asset (with confirmation dialog). |
| :---- |

## **6.3  Add / Edit Asset Form**

Triggered by 'Add Asset' button (top right of Assets list) or by clicking Edit in a drawer. A full-screen modal or dedicated page.

* Required: Name, Type, Owner, Currency

* Optional: Custodian, Ticker/ISIN, Notes

* On save, the asset appears in the list and its drawer can be opened immediately

# **7\. Core Features — Liabilities**

## **7.1  Liabilities List View**

Mirrors the Assets list in structure. Columns: Name, Net Balance, Credit Limit, % Pending (progress bar), Interest Rate, Type, Custodian, Maturity Date.

### **Tabs**

All  |  Líneas de crédito  |  Préstamos  |  Hipotecas  |  Tarjetas  |  Saldos  |  Otros

### **Totals row**

Sticky footer shows total outstanding balance and total credit limit for the current filtered view.

## **7.2  Liability Detail Drawer**

### **Tab 1: Summary**

* Key metrics: Credit Limit, Gross Dispositions, Gross Repayments, Net Balance, % Pending (progress bar)

* Interest Rate, Start Date, Maturity Date

* Custodian and Owner links

* Notes

### **Tab 2: Movements**

* Full transaction list (same structure as Asset Transactions tab)

* Types shown: Disposition, Amortisation, Interest Payment, Fee, Other

* Add Movement button

### **Tab 3: Charts**

* Outstanding balance over time (line chart from Liability Balances \+ Log)

* Repayment history by year (bar chart)

### **Tab 4: Documents**

* Linked documents, upload new

# **8\. Core Features — Transactions**

## **8.1  Transactions List View**

A global log of all transactions across all assets and liabilities. Default sort: date descending.

### **Columns**

* Date

* Type badge (colour-coded)

* Asset or Liability name (linked)

* Amount (in transaction currency)

* Amount (in base currency)

* Description

* Notes

### **Filters**

* Type (multi-select)

* Asset or Liability

* Owner

* Custodian

* Date range

* Currency

### **Transaction type colour coding**

| Type | Colour | Direction |
| :---- | :---- | :---- |
| Contribution | Blue | Increases net invested |
| Withdrawal | Orange | Decreases net invested |
| Income | Green | Cash received (dividends, rent) |
| Expense | Red | Cash paid (fees, maintenance) |
| Disposition | Purple | Increases liability balance |
| Amortisation | Teal | Decreases liability balance |
| Other | Gray | Neutral |

## **8.2  Transaction Detail Drawer**

* Date, type, amount, currency, FX rate, amount in base currency

* Linked asset or liability (clickable)

* Description, notes

* Linked documents

* Edit / delete actions (role-permissioned)

# **9\. Core Features — Documents**

## **9.1  Documents Library**

A searchable, filterable library of all uploaded files.

### **Columns**

* Name

* Type badge

* Date

* Custodian

* Linked assets (count)

* Linked liabilities (count)

### **Filters**

* Type

* Custodian

* Date range

* Linked asset

## **9.2  Document Detail Drawer**

* Embedded PDF preview (or download link for other file types)

* Metadata: date, type, custodian, notes

* Linked assets and liabilities (editable)

* Linked transactions (editable)

## **9.3  Document Upload Flow**

1. User clicks 'Upload Document' (available from the Documents library, or from any drawer's Documents tab).

2. File picker opens. Supported formats: PDF, JPG, PNG, XLSX, DOCX.

3. User fills in: Name, Date, Type, Custodian (optional), Notes (optional).

4. User links the document to one or more assets, liabilities, or transactions (optional at upload time).

5. Document is saved and appears in the library and in the linked records.

| V2: AI extraction In V2, after a bank report PDF is uploaded, the system will offer to automatically extract valuation data and pre-fill new Valuation entries for the relevant assets. The user will review and confirm before saving. |
| :---- |

# **10\. Dashboard**

The dashboard is the landing page after login. It gives a high-level view of the family's complete financial position.

## **10.1  Net Worth Summary**

Three headline cards at the top of the page:

| Card | Value | Detail |
| :---- | :---- | :---- |
| Total Assets | Sum of all active asset market values (base currency) | Breakdown by type below |
| Total Liabilities | Sum of all outstanding liability balances (base currency) | Breakdown by type below |
| Net Worth | Total Assets − Total Liabilities | Change vs previous month |

## **10.2  Asset Breakdown**

* Donut chart: asset value by type

* Bar chart or list: asset value by custodian

* Both are interactive — clicking a segment filters the asset list

## **10.3  Performance Overview**

* Net Worth over time line chart (monthly, from Log table)

* Total Contributions vs Total Market Value over time

* Date range selector: YTD / 1Y / 3Y / 5Y / All

## **10.4  Watchlist / Highlights**

* Assets with valuations older than 90 days (flagged as stale)

* Liabilities maturing within 12 months

* Assets with negative IRR

* Recent transactions (last 7 days)

# **11\. Custodians & Owners**

## **11.1  Custodians**

List view showing all custodians with: logo, name, total assets value, total liabilities balance, number of linked assets.

### **Custodian Detail Drawer — tabs**

* Summary: total assets value, total liabilities, gains, contact info

* Assets: list of all assets with this custodian

* Liabilities: list of all liabilities with this custodian

* Movements: all transactions linked to this custodian's assets/liabilities

* Documents: reports and documents from this custodian

* Charts: AUM over time, distribution of investments

## **11.2  Owners**

List view showing all family entities (individuals and companies) with their total net worth.

### **Owner Detail Drawer — tabs**

* Summary: total assets, total liabilities, net position per owner

* Assets: all assets owned by this entity

* Liabilities: all liabilities of this entity

# **12\. Settings & Configuration**

Accessible to Admins only. Available from the sidebar (gear icon) or user menu.

## **12.1  General**

* Organisation name and logo

* Base currency selection (all reports and dashboards convert to this currency)

* Fiscal year start month

## **12.2  Asset & Liability Types**

* Configurable list of asset types with name and colour

* Configurable list of liability types

* Types cannot be deleted if in use; they can be archived

## **12.3  Users**

* List of all users with role and last login

* Invite by email with role assignment

* Edit role or revoke access

## **12.4  Market Data Integration**

* Enable/disable market data feed

* Map assets with a Ticker or ISIN to auto-fetch valuations (daily, for listed equities and public funds)

* Manually trigger a refresh for a specific asset

* No preferred data provider specified in V1 — integration should use an abstracted provider interface to allow swapping

## **12.5  Currency**

* Base currency (e.g. EUR)

* FX rates: auto-fetched daily from a public FX rate API

* Manual override: user can set a specific rate for a transaction

# **13\. Calculations & Formulas**

## **13.1  IRR (Internal Rate of Return)**

The platform calculates XIRR (irregular cashflow IRR) for each asset automatically.

| XIRR Definition XIRR finds the discount rate r such that: SUM \[ CF\_i / (1 \+ r)^((d\_i \- d\_0) / 365\) \] \= 0, where CF\_i is the cashflow at date d\_i (positive for contributions, negative for withdrawals and current market value), and d\_0 is the date of the first cashflow. |
| :---- |

* Contributions are treated as positive cashflows (money going in).

* Withdrawals are treated as negative cashflows (money coming out).

* Income is treated as a negative cashflow (return of value).

* Expenses are treated as positive cashflows (additional cost).

* The current market value on today's date is treated as a final negative cashflow (hypothetical exit value).

* If fewer than two cashflows exist, IRR is shown as N/A.

* XIRR is recalculated whenever a new transaction or valuation is added.

## **13.2  Net Invested**

net\_invested \= SUM(Contributions) \+ SUM(Expenses) − SUM(Withdrawals) − SUM(Income)

## **13.3  Unrealised Gain**

unrealised\_gain \= market\_value − net\_invested

unrealised\_gain\_pct \= unrealised\_gain / net\_invested × 100

## **13.4  Liability Net Balance**

net\_balance \= SUM(Dispositions) − SUM(Amortisations)

pct\_pending \= |net\_balance| / credit\_limit × 100

## **13.5  Currency Conversion**

All values shown in the dashboard and totals rows are converted to the base currency using the FX rate stored on each transaction (for historical transactions) or the daily FX rate (for current market values).

# **14\. Internationalisation**

* UI language is user-configurable. V1 ships in English and Spanish.

* Additional languages can be added via translation files (i18next or equivalent).

* Number formatting follows locale conventions (e.g. 1.000,00 for Spanish, 1,000.00 for English).

* Date formatting follows locale conventions.

* Currency symbols are displayed according to locale.

* Base currency is set at the organisation level; transaction currencies are set per transaction.

# **15\. Version Roadmap**

| Feature | V1 | V2 | V3 |
| :---- | :---- | :---- | :---- |
| Assets, Liabilities, Transactions | ✓ |  |  |
| Valuations and Valuation snapshots | ✓ |  |  |
| Documents library | ✓ |  |  |
| Dashboard with net worth and charts | ✓ |  |  |
| Admin \+ Editor roles | ✓ |  |  |
| Multi-currency with FX conversion | ✓ |  |  |
| Market data feed (listed equities/funds) | ✓ |  |  |
| Automated monthly log snapshots | ✓ |  |  |
| XIRR calculation | ✓ |  |  |
| Viewer \+ Guest roles |  | ✓ |  |
| AI extraction from PDF bank reports |  | ✓ |  |
| Report sharing (read-only link or PDF) |  | ✓ |  |
| Multi-tenant (multiple families) |  |  | ✓ |
| Tax reporting module |  |  | ✓ |
| Mobile app |  |  | ✓ |

# **16\. Open Questions**

| \# | Question | Owner | Priority |
| :---- | :---- | :---- | :---- |
| 1 | Which market data provider should be used for the V1 feed? (e.g. Yahoo Finance, Alpha Vantage, OpenFIGI \+ pricing API) | Tech lead | High |
| 2 | Should the Log snapshot job run at midnight on the last day of the month, or first day of the new month? | Product | Medium |
| 3 | What is the data retention policy for documents? (unlimited / per-plan storage limit?) | Product | Medium |
| 4 | Should Viewer and Guest roles be able to export data to CSV/Excel in V2? | Product | Low |
| 5 | Should the platform support 2FA (TOTP) in V1 or V2? | Tech lead | High |
| 6 | How should the platform handle assets that are partially owned by multiple owners (e.g. 50/50 joint holding)? | Product | Medium |

Family Office Asset & Liability Management Platform  ·  PRD v1.0  ·  Confidential