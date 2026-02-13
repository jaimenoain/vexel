# Vexel

Greenfield web application project for Global Family Offices.

## Tech Stack

- **Framework:** Next.js (with TypeScript)
- **Styling:** Tailwind CSS
- **Backend/DB Interaction:** Supabase (`@supabase/supabase-js`)

## Directory Structure

- `app/`: Frontend UI (Next.js App Router)
- `lib/`: Business logic and API clients
- `database/`: Raw SQL files and migrations

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Environment Setup:**

    Copy `.env.example` to `.env.local` and populate the Supabase keys.

    ```bash
    cp .env.example .env.local
    ```

    > **Important:** You must provide the `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for server-side administrative operations (like asset creation) to work correctly.

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
