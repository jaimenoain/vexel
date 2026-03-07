# Vexel – Architecture (Current Snapshot)

This document describes the **current** architecture as implemented at the end of Phase 1. It is the single source of truth for framework, routing, auth, and layout decisions. For domain data models and API contracts (Phase 2+), see **docs/DOMAIN_MODEL.md**.

---

## 1. Framework & tooling

| Package           | Version  | Role |
| ----------------- | -------- | ---- |
| Next.js           | 16.1.6   | App Router, server components, server actions |
| React             | 19.2.3   | UI |
| TypeScript        | ^5       | Type checking |
| Tailwind CSS      | ^4       | Styling (theme in CSS; no `tailwind.config.ts`) |
| Shadcn/UI         | Radix primitives | Buttons, forms, sidebar, sheets, etc. |
| Supabase          | @supabase/ssr + @supabase/supabase-js | Auth and (future) database |
| Resend            | Via Supabase Auth config | Transactional email (e.g. password reset) |

- **No raw CSS.** All UI uses Tailwind utility classes and Shadcn components only.
- **Design tokens** are defined in `app/globals.css` (`:root`, `.dark`, `@theme inline`).

---

## 2. App Router structure (route groups)

Next.js App Router lives under **`app/`** at the project root. Route groups isolate auth from the main app; they do not add URL segments.

### 2.1 File tree

```
app/
├── layout.tsx              # Root: TooltipProvider, fonts, globals.css
├── page.tsx                # / (home)
├── globals.css
├── favicon.ico
│
├── (auth)/                 # Route group: public auth
│   ├── layout.tsx         # Centered full-screen (min-h-screen flex items-center justify-center bg-background)
│   ├── login/page.tsx     # /login
│   ├── signup/page.tsx    # /signup
│   └── forgot-password/page.tsx  # /forgot-password
│
└── (app)/                  # Route group: authenticated platform
    ├── layout.tsx         # SidebarProvider + AppSidebar + SidebarInset
    ├── dashboard/page.tsx # /dashboard
    ├── assets/page.tsx    # /assets
    ├── liabilities/page.tsx
    ├── transactions/page.tsx
    ├── documents/page.tsx
    ├── entities/page.tsx
    └── settings/page.tsx  # /settings
```

### 2.2 Route summary

| URL segment          | Route group | Purpose |
| -------------------- | ----------- | ------- |
| `/`                  | (root)      | Home |
| `/login`, `/signup`, `/forgot-password` | (auth) | Auth flows |
| `/dashboard`, `/assets`, `/liabilities`, `/transactions`, `/documents`, `/entities`, `/settings` | (app) | Authenticated app |

Navigation within `(app)` uses Next.js `<Link>`; no full-page reloads.

---

## 3. Layout architecture

- **Root layout** (`app/layout.tsx`): Wraps all routes with `TooltipProvider`, Geist fonts, and `globals.css`.
- **Auth layout** (`app/(auth)/layout.tsx`): Minimal centered layout for login, signup, forgot-password.
- **App layout** (`app/(app)/layout.tsx`): Calls `getCurrentUser()` (ensures session), then renders `SidebarProvider`, `AppSidebar`, and `SidebarInset` (main content). Used for all dashboard/assets/liabilities/transactions/documents/entities/settings pages.

**AppSidebar** (`src/components/layout/app-sidebar.tsx`): Shadcn Sidebar, Next.js `Link` for Dashboard, Assets, Liabilities, Transactions, Documents, Entities, Settings. Log Out uses the `logOut` server action with `useFormStatus` for loading state.

---

## 4. Authentication (Supabase + Resend)

### 4.1 Identity provider

- **Supabase Auth** is the source of truth for identity. Passwords and sessions are managed by Supabase; the app does not store passwords.
- **Resend** is used for transactional email (e.g. password reset) via Supabase’s email configuration. No app-level email sending code; Supabase triggers the emails.

### 4.2 Client and server access

- **Browser:** `src/lib/supabase/client.ts` — `createBrowserClient()` from `@supabase/ssr`. Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- **Server:** `src/lib/supabase/server.ts` — `createServerClient()` with Next.js `cookies()` for session handling.
- **Current user helper:** `src/lib/supabase/user.ts` — `getCurrentUser()` (cached) for server components/layouts.

### 4.3 Middleware (route protection)

- **Entry:** `middleware.ts` at project root delegates to `updateSession()` from `src/lib/supabase/middleware.ts`.
- **Protected paths:** `/dashboard`, `/assets`, `/liabilities`, `/transactions`, `/documents`, `/entities`, `/settings`. Unauthenticated requests are redirected to `/login`.
- **Auth paths:** `/login`, `/signup`, `/forgot-password`. Authenticated requests are redirected to `/dashboard`.
- Session is refreshed in middleware via `getUser()` and cookies.

### 4.4 Server actions (auth flows)

- **Location:** `src/app/actions/auth.ts` (Next.js server actions).
- **Actions:**
  - `signUp` — Supabase `signUp` with `user_metadata` (first_name, last_name); redirect to `/login`. `public.users` row is created by DB trigger on `auth.users` insert.
  - `logIn` — `signInWithPassword`; redirect to `/dashboard`.
  - `logOut` — `signOut`; redirect to `/login`.
  - `resetPassword` — `resetPasswordForEmail` with redirect URL; Supabase/Resend sends the email.
- No mock auth; all actions use the real Supabase Auth and (where applicable) real DB.

### 4.5 Environment variables (reference only; no secrets)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (client-safe).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (client-safe).
- `NEXT_PUBLIC_SITE_URL` — Optional; used for auth redirect URLs (e.g. after signup, password reset).
- Supabase project is configured to use Resend for transactional emails; no `RESEND_API_KEY` in app code. (If Amplify or another host sets `RESEND_API_KEY`, it is for Supabase/backend use only and must not be documented in repo.)

---

## 5. Database (Phase 1 scope)

- **Supabase (PostgreSQL)** is the database host.
- **Phase 1 tables:** Only `public.users` exists, synced from Supabase Auth via trigger (see **docs/DOMAIN_MODEL.md** “Phase 1 Implementation”).
- **RLS:** Enabled on `public.users`; policies allow users to read/insert/update only their own row. No admin/editor cross-user policies in Phase 1.

---

## 6. UI foundation

- **Components:** `src/components/ui/` — Shadcn (Button, Input, Card, Sheet, Table, Tabs, Badge, Form, Sidebar, Label, Skeleton, Separator, Tooltip). `src/components/layout/app-sidebar.tsx` composes the sidebar.
- **Styling:** Tailwind only; semantic tokens in `app/globals.css` (e.g. `background`, `foreground`, `primary`, `destructive`).
- **Forms:** React Hook Form + Zod + Shadcn Form/Input/Button on login, signup, forgot-password.

---

*This snapshot reflects the codebase as of Phase 1 completion. For domain schemas and API contracts (Phase 2+), see **docs/DOMAIN_MODEL.md**.*
