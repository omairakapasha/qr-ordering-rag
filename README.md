# Restaurant Ordering System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgres-15-4169E1.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)

A self-hosted ordering system for dine-in restaurants. A diner scans the QR code on their table, browses the menu, adds items to a cart and places the order. There is no app to install and no account to make. About a second later the order shows up on the kitchen screen over WebSocket. Staff run everything else (menu, tables, orders, inventory, people) from one admin dashboard.

It runs on a single server with your own database and charges nothing per order. Payment is cash only.

## Demo

<p align="center">
  <video src="./assets/Self%20Hosted%20Ordering%20System.mp4" width="100%" controls autoplay loop></video>
</p>

## Contents

- [Quickstart](#quickstart)
- [Architecture](#architecture)
- [Pages](#pages)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Design notes](#design-notes)
- [Screenshots](#screenshots)

## Quickstart

```bash
cp .env.example .env
# Edit: SESSION_SECRET, DEFAULT_ADMIN_PASSWORD, DEFAULT_KITCHEN_PASSWORD
docker compose up -d
```

Open `http://localhost:5000` and sign in at `/admin` with the credentials you set. The first run seeds an admin, a kitchen and a waiter account, 20 tables with QR codes, and some sample menu items.

To set it up without Docker, follow [ONBOARDING.md](ONBOARDING.md).

## Architecture

The repo is a pnpm monorepo with two services and a shared database library. Everything stores its data in PostgreSQL.

```mermaid
flowchart LR
    browser(["Browser"]) -->|"HTTP / WebSocket"| api["Express API<br/>:5000"]
    api --> db[("PostgreSQL")]
    api -->|"proxy"| ai["AI service<br/>:8001"]
    ai --> gemini["Gemini"]
    ai -->|"local fallback"| ollama["Ollama"]
```

| Package | Stack | What it does |
|---|---|---|
| `artifacts/api-server` | Express 5, TypeScript | Auth, menu, orders, WebSocket dispatch, server-rendered pages |
| `packages/ai-chat` | FastAPI, Python | Menu assistant: conversation state and routing between Gemini and a local model |
| `lib/db` | Drizzle ORM | Shared schema, migrations and connection pool |

### Project structure

```
├── artifacts/api-server/src/
│   ├── config.ts                   # Centralized env config
│   ├── index.ts                    # Express app entry, middleware, route wiring
│   ├── seed.ts                     # First-run database seeder
│   ├── lib/
│   │   ├── auditLog.ts             # Append-only audit log writer
│   │   ├── csv.ts                  # CSV export helper
│   │   ├── logger.ts               # Pino logger
│   │   ├── migrate.ts              # Drizzle migration runner
│   │   ├── push.ts                 # Web Push (VAPID) notifications
│   │   └── websocket.ts            # WebSocket manager and broadcast
│   ├── middlewares/
│   │   ├── csrfCheck.ts            # Origin / referer CSRF guard
│   │   ├── errorHandler.ts         # asyncHandler, AppError, global error handler
│   │   ├── requireRole.ts          # Role-based access control
│   │   └── requireSession.ts       # Cookie-session authentication
│   ├── pages/                      # Server-rendered HTML pages (no frontend build)
│   │   ├── theme.ts                # Shared design tokens, fonts, icons
│   │   ├── customer.ts             # Menu, item detail popup, cart, checkout
│   │   ├── kitchen.ts              # Real-time order ticket queue
│   │   ├── waiter.ts               # Read-only order view
│   │   ├── admin.ts                # Full management dashboard
│   │   ├── track.ts                # Live order tracking and push notifications
│   │   └── receipt.ts              # Printable order receipt
│   └── routes/
│       ├── auth.ts                 # Login, logout, session check
│       ├── menu.ts                 # Menu CRUD, image upload, stock guard
│       ├── orders.ts               # Order lifecycle, status transitions, cancel
│       ├── tables.ts               # Table CRUD, QR generation, smart delete
│       ├── kitchen.ts              # Kitchen-specific order queries
│       ├── admin.ts                # Staff, analytics, inventory, audit, CSV export
│       ├── aiChat.ts               # Proxy to the AI chat service
│       ├── push.ts                 # Push subscription registration
│       └── __tests__/              # Integration tests
├── lib/db/src/
│   ├── index.ts                    # Pool, drizzle instance, schema re-exports
│   └── schema/                     # 9 Drizzle table definitions
│       ├── staff.ts, sessions.ts, tables.ts, orders.ts,
│       ├── order-items.ts, order-status-history.ts,
│       ├── menu-items.ts, audit-log.ts, push-subscriptions.ts
│       └── index.ts                # Barrel re-export
├── packages/ai-chat/               # Python FastAPI AI service
├── docker-compose.yml
├── .env.example
└── ONBOARDING.md                   # Non-technical setup guide
```

## Pages

| Route | Used by | What's there |
|---|---|---|
| `/` | Diners | Menu with search and filters. Tapping an item opens a popup with its description, allergens and prep time. Cart with +/- buttons, then checkout. |
| `/track` | Diners | Live order status, and a push notification when the order is ready |
| `/kitchen` | Kitchen | Ticket queue that updates over WebSocket, with status transitions |
| `/waiter` | Floor staff | Read-only live view of orders |
| `/admin` | Managers | Menu CRUD, tables (add, edit, delete), staff, inventory, analytics charts, audit log, CSV export |

## Configuration

Put environment variables in `.env` for Docker, or in `artifacts/api-server/.env` for local development. [`.env.example`](.env.example) has the full list with comments.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Yes | At least 32 characters. The server won't start without it. |
| `DEFAULT_ADMIN_PASSWORD` | First run | Password for the seeded admin login |
| `DEFAULT_KITCHEN_PASSWORD` | First run | Password for the seeded kitchen login |
| `DEFAULT_WAITER_PASSWORD` | First run | Password for the seeded waiter login |
| `BRAND_NAME` | No | Restaurant name in headers and page titles |
| `BRAND_TAGLINE` | No | Tagline on the customer page |
| `CURRENCY_SYMBOL` | No | Currency label next to prices. Defaults to `QAR`. |
| `GEMINI_API_KEY` | No | Turns on the AI menu assistant through Gemini. Leave it unset to run the assistant entirely on a local Ollama model. |
| `OLLAMA_BASE_URL` | No | Local fallback model server. Defaults to `localhost:11434`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | No | Turn on order-ready push notifications |
| `INTERNAL_API_SECRET` | No | Shared secret for the Express to AI service proxy |

## Local development

You need Node 24 or later, pnpm 9 or later, Python 3.10 or later and PostgreSQL 15 or later.

```bash
pnpm install
pip install -r packages/ai-chat/requirements.txt

cp .env.example artifacts/api-server/.env
# Edit: DATABASE_URL, SESSION_SECRET, DEFAULT_*_PASSWORD

# API server (runs migrations on startup)
pnpm --filter @workspace/api-server run dev

# AI service (optional, in a separate terminal)
cd packages/ai-chat && uvicorn main:app --port 8001
```

## Design notes

- Stock can't be oversold. When an item has finite stock, the order transaction decrements it under a `WHERE stock_quantity >= requested` guard, so two concurrent orders for the last portion can't both succeed.
- Rate limits are keyed on the table's QR token, the order ID or the chat session rather than the IP address, because every diner in the restaurant shares the same WiFi egress.
- Deleting a table depends on its history. A table with no orders is removed from the database. One with orders is only deactivated, so the financial records stay intact.
- The kitchen WebSocket feed is authenticated during the HTTP upgrade, and unauthenticated upgrades are dropped.
- History is never rewritten. Menu items are soft-archived, order-line prices are copied at order time, and the audit log is never updated or deleted.
- Sessions are stored in Postgres. A password reset or account deactivation cuts off access immediately, and restarting the server doesn't log anyone out.

## Screenshots

<details>
<summary>Show screenshots</summary>

<br>

<p align="center">
  <img src="./assets/Admin%20Sign%20In.png" width="45%">
  <img src="./assets/Ai%20Assistant.png" width="45%">
  <img src="./assets/Kitchen%20Login.png" width="45%">
  <img src="./assets/Kitchen%20Queue.png" width="45%">
  <img src="./assets/Waiter%20Sign%20In.png" width="45%">
  <img src="./assets/Waiter%20Queue.png" width="45%">
</p>

</details>
