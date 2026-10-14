# Setup Guide — New Restaurant

Follow these steps in order. Steps 1–4 are done once. No coding required.

You need a computer with **Docker Desktop** installed and running.

---

## Step 1 — Get the files

Put the project folder on the computer (it contains `docker-compose.yml`).
Open a terminal **inside that folder**.

---

## Step 2 — Create your settings file

Run this once to make your settings file:

```bash
cp .env.example .env
```

Now open `.env` in any text editor and change these lines:

```
BRAND_NAME=Your Restaurant Name
BRAND_TAGLINE=Your short slogan

CURRENCY_SYMBOL=QAR
CURRENCY_CODE=QAR

CORS_ORIGIN=http://192.168.1.100:5000

DEFAULT_ADMIN_PASSWORD=pick-a-strong-password
DEFAULT_KITCHEN_PASSWORD=pick-a-strong-password
DEFAULT_WAITER_PASSWORD=pick-a-strong-password

SESSION_SECRET=type-any-long-random-text-at-least-32-characters-long
INTERNAL_API_SECRET=type-any-long-random-text-here
```

That's all you must change. Save the file.

> **Set `CORS_ORIGIN` to your server's own address.** Every table's QR code contains this
> address, so customers' phones must be able to reach it. `192.168.1.100` above is only an
> example. Find the real one on the computer that runs the system, while it is connected to
> the restaurant's network:
>
> - **Windows:** open Command Prompt, run `ipconfig`, and read the **IPv4 Address** line.
> - **Mac:** open Terminal and run `ipconfig getifaddr en0`.
> - **Linux:** run `hostname -I`.
>
> Write it as `http://` + that address + `:5000`. Do this **before** you download the QR
> codes in Step 5, because a code made with the wrong address won't open on a phone. Also
> ask whoever manages your router to give this computer a fixed address. If the address
> changes after a restart, every printed QR code stops working.

> **Tip:** the two "secret" lines can be any long random text — just don't leave them
> blank. To generate one automatically, run **one** of these and paste the result:
>
> - **Windows (PowerShell):**
>   ```powershell
>   [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
>   ```
> - **Mac / Linux / Git Bash:**
>   ```bash
>   openssl rand -hex 32
>   ```

---

## Step 3 — Start the system

```bash
docker compose up -d
```

The first time, this takes a few minutes (it downloads and builds everything).
After that it starts in seconds. The system sets up its own database automatically
and creates 3 staff logins, 20 tables with QR codes, and five placeholder menu items that stay hidden from customers until you edit them.

Check it's running — open this in a browser:

```
http://localhost:5000
```

You should see the menu page with your restaurant name on it.

---

## Step 4 — Set up your menu (Admin panel)

1. Go to **http://localhost:5000/admin**
2. Log in:
   - **Username:** `admin`
   - **Password:** the `DEFAULT_ADMIN_PASSWORD` you chose in Step 2
3. In the **Menu** tab:
   - Add your real dishes (name, price, category, description, photo).
   - Each item can include prep time, spice level, allergens, and a vegetarian flag — customers see all of this when they tap an item.
   - Remove the placeholder items by clicking **Archive** next to each one.
4. In the **Tables** tab:
   - Add your tables (set table number and seat capacity).
   - Click **⬇️ All QRs** to download all QR code images at once.
   - Use **Edit** to change a table's number or capacity, and **Delete** to remove a table.
5. In the **Staff** tab (optional): add more kitchen/waiter accounts.

---

## Step 5 — Put QR codes on the tables

Print each table's QR code and place it on the matching table. If a code doesn't open on a phone, check the `CORS_ORIGIN` line from Step 2.
When a customer scans it, the menu opens already set to that table.

**You're done.** 🎉

---

## How customers use it

1. Customer scans the QR code on their table → the menu opens in their phone browser.
2. They browse, search, or filter items. **Tapping an item** opens a detail popup showing the full description, allergens, prep time, and badges.
3. They use the **(+)** and **(−)** buttons — either on the card or inside the detail popup — to add items to their cart.
4. They tap **Review Order**, confirm, and submit.
5. Their order appears on the **Kitchen screen** instantly.

---

## Everyday use

| Who | Page | Login |
|---|---|---|
| Customers | `http://localhost:5000/` | none (scan QR) |
| Kitchen staff | `http://localhost:5000/kitchen` | `kitchen` |
| Waiters | `http://localhost:5000/waiter` | `waiter` |
| Owner / manager | `http://localhost:5000/admin` | `admin` |

**Order flow:** Customer orders → Kitchen screen shows it instantly → staff mark it as preparing → ready → served. Waiters and the admin dashboard see everything in real time.

---

## Admin dashboard tabs

| Tab | What you can do |
|---|---|
| **Overview** | Today's orders, revenue, active order count, average prep time. Export orders as CSV. |
| **Menu** | Add, edit, archive menu items. Set price, category, description, image, prep time, spice level, allergens, vegetarian flag, stock quantity. Export menu as CSV. |
| **Staff** | Add/edit staff members, change passwords, deactivate accounts. |
| **Tables** | Add, edit, and delete tables. Download or print individual QR codes, or download all at once. |
| **Analytics** | Revenue and order charts (7-day / 30-day), popular items chart, staff performance table. |
| **Inventory** | View stock levels for items with finite stock, update quantities. |
| **Audit Log** | Searchable, filterable log of all admin actions (staff changes, menu edits, table changes, order events). Export as CSV. |

---

## Keep it running

**Turn off:**
```bash
docker compose down
```

**Turn back on:**
```bash
docker compose up -d
```

**Back up your data (menu, orders, etc.):**
```bash
docker compose exec -T db pg_dump -U postgres restaurant > backup.sql
```

**Update to a new version:**
```bash
docker compose pull
docker compose up -d
```
Your data stays safe during updates.

> ⚠️ Never run `docker compose down -v` unless you want to erase everything
> (menu, tables, orders, logins) and start over.

---

## If something looks wrong

| Problem | Fix |
|---|---|
| Page won't load | Make sure Docker Desktop is running, then `docker compose up -d`. |
| "Too many login attempts" | Wait 15 minutes (a security limit), or restart: `docker compose restart api`. |
| Forgot a password | Log in as admin, go to the **Staff** tab, and click **Password** next to that user. |
| Restaurant name still wrong | Edit `BRAND_NAME` in `.env`, then run `docker compose up -d` again. |
| Items still appear after archiving | Hard-refresh the page (Ctrl+Shift+R). Archived items are hidden from customers immediately. |

---

## Optional extras (skip if not needed)

These are off by default and everything works without them. Add them to `.env`,
then run `docker compose up -d` again.

- **AI menu chat** — set `GEMINI_API_KEY=your-key` to enable the "Menu Assistant" bubble on the customer page. Without a key, it falls back to a local model via Ollama (requires Ollama installed separately).
- **"Notify me when ready" push** — requires **https**. Generate keys with `npx web-push generate-vapid-keys`, then fill in `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and set `CORS_ORIGIN` to your public web address.
- **Currency** — change `CURRENCY_SYMBOL` and `CURRENCY_CODE` in `.env` to match your local currency (default is `QAR`).
