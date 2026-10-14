# QR Ordering System with a RAG Menu Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgres-15-4169E1.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)

A self-hosted ordering system for dine-in restaurants. A diner scans the QR code on their table, browses the menu, adds items to a cart and places the order. There is no app to install and no account to make. About a second later the order shows up on the kitchen screen over WebSocket. Diners can also ask a chat assistant about the menu, which answers from the live menu and runs on Gemini or, when the internet is down, a local model. Staff run everything else (menu, tables, orders, inventory, people) from one admin dashboard.

It runs on a single server with your own database and charges nothing per order. Payment is cash only.

[![Watch the demo on LinkedIn](./assets/Kitchen%20Queue.png)]([https://lnkd.in/p/dbq3uRXT]))

## Contents

- [Quickstart](#quickstart)
- [Architecture](#architecture)
- [Pages](#pages)
- [AI menu assistant](#ai-menu-assistant)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Design notes](#design-notes)
- [Working without internet](#working-without-internet)
- [Customer data](#customer-data)
- [Screenshots](#screenshots)
- [License](#license)

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
│       └── __tests__/              # Route tests (database mocked)
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

## AI menu assistant

The assistant answers diners' questions about the menu. It is a separate FastAPI service in `packages/ai-chat`, built on the OpenAI Agents SDK. The Express API proxies chat requests to it and authenticates with `INTERNAL_API_SECRET`.

### How retrieval works

On each request the service reads the available, non-archived menu items from PostgreSQL (name, description, price, category, vegetarian flag, spice level, allergens, popular flag), formats them as text and puts them in the system prompt. The result is cached for 60 seconds, so a price or availability change reaches the assistant within a minute. A menu is small enough to fit in the prompt, so there is no embedding step or vector store. The prompt tells the model to answer only from that menu and to suggest an alternative when an item isn't on it.

### Model routing and fallback

With `GEMINI_API_KEY` set, requests go to Gemini first. The Gemini client has a 3-second connect timeout and no retries, so when the internet is down the request fails fast and the service moves on to a local model served by Ollama (`llama3.2:3b` by default, set with `LOCAL_LLM_MODEL`). Connection errors, quota errors (429) and upstream 5xx responses all trigger the same fallback. Without a Gemini key, every request goes to the local model. If neither backend is reachable, the endpoint returns a 503. Each response reports which backend answered, and `/health` shows the state of the database, Gemini and the local model.

### Conversation state and limits

The service keeps the last 5 exchanges for each chat session in memory, drops sessions idle for an hour, and holds at most 500 sessions. A restart clears them. The Express API rate limits chat requests per chat session.

The assistant has no tools. It answers questions and doesn't add items to the cart or place orders.

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
| `PII_RETENTION_DAYS` | No | Days to keep the customer's name and phone number on each order. Defaults to `90`. Use `0` to keep them forever. |
| `AI_CHAT_IP_LIMIT_PER_MIN` | No | Chat messages per minute allowed from one network address, on top of the per-conversation limit. Defaults to `120`. |
| `TRUST_PROXY` | No | Number of reverse proxies in front of the app, for example `1` on most hosting platforms. Leave empty when phones connect directly. |

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

Run the tests with `pnpm --filter @workspace/api-server run test`. They mock the database, so no Postgres is needed.

## Design notes

- Stock can't be oversold. When an item has finite stock, the order transaction decrements it under a `WHERE stock_quantity >= requested` guard, so two concurrent orders for the last portion can't both succeed.
- Rate limits are keyed on the table's QR token, the order ID or the chat session rather than the IP address, because every diner in the restaurant shares the same WiFi egress. The client chooses its own chat session id, so the assistant also has a generous per-IP limit (120 messages a minute by default) to stop a script from dodging the per-session one.
- Deleting a table depends on its history. A table with no orders is removed from the database. One with orders is only deactivated, so the financial records stay intact.
- The kitchen WebSocket feed is authenticated during the HTTP upgrade, and unauthenticated upgrades are dropped.
- History is never rewritten. Menu items are soft-archived, order-line prices are copied at order time, and the audit log is never updated or deleted.
- Customers can look up their own orders by phone number, but only with the QR token of the table they ordered at, and only for orders from the last 6 hours. Knowing a phone number alone reveals nothing.
- A customer cancel only succeeds for the request that actually moves the order out of `received`, so two simultaneous cancels can't restore stock twice.
- In Docker Compose the database and AI service are bound to `127.0.0.1`, so devices on the restaurant WiFi can't reach them. Only the app on port 5000 is exposed.
- Passwords are hashed with bcrypt. Accounts created before hashing was added are upgraded the first time their owner logs in, and a login attempt for an unknown username takes about as long as one for a real account.
- Sessions are stored in Postgres. A password reset or account deactivation cuts off access immediately, and restarting the server doesn't log anyone out.

## Working without internet

The core flow runs on the restaurant's local network. Diners reach the server over WiFi, QR codes are generated on the server, and the order, kitchen and waiter screens talk to the server and PostgreSQL only. The AI assistant falls back to a local Ollama model when Gemini is unreachable.

A few things still need a connection:

- Push notifications for ready orders.
- Gemini replies. The local model covers the assistant when they are unavailable.
- Chart.js on the admin dashboard, which loads from a CDN, so the analytics charts need internet unless the browser has it cached.
- Google Fonts on every page. Without them the pages fall back to system fonts.
- The first `docker compose up`, which pulls images and builds the services.

## Customer data

When a diner places an order, the app stores the name and phone number they entered on that order, in the `customer_name` and `customer_phone` columns of the `orders` table in your PostgreSQL database. The phone number is saved with spaces and dashes removed. The application doesn't encrypt either field, so protect the database volume and its backups as you would any customer data.

Kitchen and waiter screens show them on the order ticket, and admins can see them and export them in the orders CSV. The diner's browser keeps only their cart. The app doesn't write names or phone numbers to its logs, but a reverse proxy in front of it may log request URLs, and the order lookup puts the phone number in the URL.

By default the name and phone number are cleared from orders older than 90 days, when the server starts and once a day after that. The orders, items and totals stay, so sales figures don't change. Set `PII_RETENTION_DAYS` to change the period, or to `0` to keep the details for good. The cleanup doesn't reach database backups taken before it ran.

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

## License

Released under the [GNU Affero General Public License v3.0](LICENSE).
