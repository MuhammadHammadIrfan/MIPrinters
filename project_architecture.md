# MI Printers - Project Architecture & Overview

This document explains the technical architecture, project structure, and data flow of the **MI Printers** business management system.

## 🏗️ Core Architecture: "Local-First"

The most important concept in this project is **Local-First**.
Unlike traditional web apps that fetch data from a server every time you click something, this app **lives in the browser**.

1.  **Local Database (Primary)**: The app reads/writes to `IndexedDB` (inside the user's browser) using a library called **Dexie.js**. This ensures the app works **100% Offline** and is instant.
2.  **Cloud Database (Secondary)**: We use **Supabase** (PostgreSQL) as the backup and synchronization point.
3.  **Sync Engine**: A custom background service keeps the Local DB and Cloud DB in sync.

### Why this approach?
- **Speed**: No loading spinners. Data is instant.
- **Reliability**: Works even if the internet cuts out (common in printing press environments).
- **Multi-Device**: Data syncs between the owner's phone and the shop's laptop when online.

---

## 📂 Project Structure

```bash
src/
├── app/                 # Next.js App Router (Pages & Layouts)
│   ├── (dashboard)/     # Protected routes (require login)
│   │   ├── invoices/    # Invoice management
│   │   ├── customers/   # Customer management
│   │   ├── suppliers/   # Supplier management
│   │   └── settings/    # App settings
│   ├── api/             # Backend API routes (Auth mostly)
│   └── layout.tsx       # Root layout + Service Worker registration
│
├── components/          # Reusable UI Components
│   ├── layout/          # Header, Sidebar, BottomNav
│   └── ...
│
├── lib/                 # Core Logic (The Brains)
│   ├── db/              # Local Database (Dexie) setup & schema
│   ├── supabase/        # Cloud Database Client
│   └── sync/            # The Sync Engine (Push/Pull logic)
│
├── stores/              # State Management (Zustand)
│   ├── invoiceFormStore.ts  # Handles the complex invoice creation logic
│   ├── supplierStore.ts     # Handles supplier CRUD state
│   └── ...
│
└── proxy.ts             # Auth Middleware (Protects routes)
```

---

## 🔗 How It All Connects (Data Flow)

Here is the lifecycle of an action, for example: **"Creating a New Invoice"**.

### 1. User Action (UI)
The user fills out the form on `/invoices/new`.
- **Component**: `src/app/(dashboard)/invoices/new/page.tsx`
- **State**: Managed by `useInvoiceFormStore` (Zustand).

### 2. Saving Data (Local Write)
When the user clicks "Save":
1. The store calls `db.invoices.put(invoiceData)`.
2. **Dexie.js** saves this immediately to the browser's IndexedDB.
3. **Crucial Step**: The app *also* adds an item to the `sync_queue` table in Dexie.
   - Example queue item: `{ type: 'invoice', action: 'create', data: { ... } }`

*At this point, the user sees "Saved!" and can continue working. No network request has mostly happened yet.*

### 3. Background Sync (The Bridge)
The `SyncService` (`src/lib/sync/syncService.ts`) is always running in the background.

**A. Pushing Changes (Local -> Cloud)**
1. It watches the `sync_queue` table.
2. It sees the new invoice in the queue.
3. It sends this data to **Supabase** via the API.
4. If successful, it removes the item from the queue.
5. If offline, it keeps it in the queue and retries later.

**B. Pulling Changes (Cloud -> Local)**
1. It periodically asks Supabase: "Do you have any new data since [last_sync_time]?"
2. If yes, it downloads the changes (e.g., an invoice created on another device).
3. It updates the Local Dexie DB.

### 4. UI Updates
Because we use `useLiveQuery` (from Dexie-React), any change to the Local DB (whether from the User saving or from the Sync Service pulling remote changes) **automatically** triggers a UI re-render. The UI always reflects the Local DB.

---

## 🛠️ Key Technologies

- **Next.js 14+**: The framework. Uses Server Components for shell and Client Components for interactivity.
- **Dexie.js**: The wrapper for IndexedDB. Makes local database operations easy (like `db.invoices.toArray()`).
- **Supabase**: The backend-as-a-service. Provides PostgreSQL and Authentication.
- **Zustand**: Simple global state management. Used for complex forms (like the invoice editor) where passing props would be messy.
- **PWA (Progressive Web App)**:
    - **Manifest**: Allows installing as an app on Android/iOS.
    - **Service Worker**: Caches the HTML/JS/CSS so the app loads even without internet.

## 🔐 Authentication
- We use Supabase Auth (Email/Password).
- **Proxy/Middleware** (`src/proxy.ts`): Checks for the auth cookie on every page load. If missing, redirects to `/login`.

## 🔄 Deployment
- Hosted on **Vercel** (for the frontend/Next.js code).
- Database hosted on **Supabase**.
