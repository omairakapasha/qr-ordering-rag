import { BRAND, CURRENCY, fontLinks } from './theme';

export function adminPage(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — ${BRAND.name}</title>
  ${fontLinks()}
  <style>
    :root {
      --font-display:'Caveat','Comic Sans MS',cursive;
      --font-body:'Nunito',system-ui,-apple-system,sans-serif;
      --bg:#F7F3EC; --surface:#FFFDF8; --surface-2:#F2EBDF; --border:#E7DFD2;
      --brand:#C8521A; --brand-dark:#9E3D0F; --brand-light:#FBEADD;
      --text:#2A2520; --muted:#6F6457;
      --green:#1A8045; --green-bg:#E6F4EC;
      --red:#DC2626; --red-bg:#FDECEC;
      --blue:#1D4ED8; --blue-bg:#E8EFFE;
      --yellow:#B45309; --yellow-bg:#FCF1DC;
      --purple:#EDE6FB; --purple-text:#5B21B6;
      --radius:16px; --radius-sm:12px; --shadow:0 6px 22px rgba(74,52,28,.10);
      --ring:0 0 0 3px rgba(200,82,26,.22);
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:var(--font-body); background:var(--bg); color:var(--text); min-height:100vh; -webkit-font-smoothing:antialiased; }

    /* LOGIN */
    #loginView { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
    .login-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:40px; max-width:380px; width:100%; box-shadow:var(--shadow); }
    .login-card h1 { font-family:var(--font-display); font-size:2.4rem; margin-bottom:4px; color:var(--brand); }
    .login-card p { color:var(--muted); font-size:0.88rem; margin-bottom:28px; }
    .field { margin-bottom:16px; }
    .field label { display:block; font-size:0.78rem; font-weight:600; color:var(--muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:.04em; }
    .field input, .field select { width:100%; padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:0.9rem; outline:none; transition:border .2s; background:var(--bg); }
    .field input:focus, .field select:focus { border-color:var(--brand); background:#fff; }
    .btn { padding:10px 20px; border-radius:8px; font-size:0.88rem; font-weight:600; cursor:pointer; border:none; transition:all .18s; }
    .btn-primary { background:var(--brand); color:#fff; }
    .btn-primary:hover { background:var(--brand-dark); }
    .btn-secondary { background:var(--bg); color:var(--text); border:1.5px solid var(--border); }
    .btn-secondary:hover { border-color:var(--brand); color:var(--brand); }
    .btn-danger { background:var(--red-bg); color:var(--red); border:1.5px solid #FECACA; }
    .btn-danger:hover { background:var(--red); color:#fff; }
    .btn-sm { padding:6px 12px; font-size:0.8rem; }
    .login-err { color:var(--red); font-size:0.85rem; margin-top:10px; min-height:20px; }
    .login-btn { width:100%; padding:12px; margin-top:4px; font-size:0.95rem; border-radius:8px; }

    /* LAYOUT */
    #adminView { display:none; }
    .topbar { background:var(--surface); border-bottom:1px solid var(--border); padding:12px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; z-index:100; }
    .topbar h1 { font-family:var(--font-display); font-size:1.7rem; color:var(--brand); }
    .topbar-right { display:flex; align-items:center; gap:12px; }
    .staff-badge { font-size:0.82rem; color:var(--muted); }
    .tabs { background:var(--surface); border-bottom:1px solid var(--border); padding:0 24px; display:flex; gap:0; }
    .tab { padding:14px 20px; font-size:0.88rem; font-weight:600; cursor:pointer; border-bottom:3px solid transparent; color:var(--muted); transition:all .18s; white-space:nowrap; }
    .tab:hover { color:var(--text); }
    .tab.active { color:var(--brand); border-bottom-color:var(--brand); }
    .panel { display:none; padding:24px; max-width:1200px; margin:0 auto; }
    .panel.active { display:block; }

    /* STAT CARDS */
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:24px; }
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); }
    .stat-label { font-size:0.78rem; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; }
    .stat-value { font-family:var(--font-display); font-size:2.4rem; font-weight:700; color:var(--brand-dark); line-height:1; }

    /* TABLES */
    .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); margin-bottom:20px; }
    .card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .card-title { font-weight:700; font-size:1rem; }
    table { width:100%; border-collapse:collapse; font-size:0.85rem; }
    th { text-align:left; padding:10px 12px; background:var(--bg); border-bottom:1px solid var(--border); font-weight:600; font-size:0.78rem; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    td { padding:10px 12px; border-bottom:1px solid var(--border); }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--surface-2); }

    /* BADGE */
    .badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:20px; font-size:0.72rem; font-weight:600; white-space:nowrap; }
    .badge-admin { background:var(--purple,#EDE9FE); color:var(--purple-text,#5B21B6); }
    .badge-kitchen { background:var(--yellow-bg); color:var(--yellow); }
    .badge-waiter { background:var(--blue-bg); color:var(--blue); }
    .badge-green { background:var(--green-bg); color:var(--green); }
    .badge-red { background:var(--red-bg); color:var(--red); }
    .badge-yellow { background:var(--yellow-bg); color:var(--yellow); }
    .badge-received { background:#FEF3C7; color:#92400E; }
    .badge-preparing { background:#DBEAFE; color:#1E40AF; }
    .badge-ready { background:#DCFCE7; color:#15803D; }
    .badge-served { background:var(--surface-2); color:var(--muted); }
    .badge-cancelled { background:#FEE2E2; color:#B91C1C; }

    /* FORM */
    .form-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:16px; }
    .form-actions { display:flex; gap:8px; margin-top:4px; }

    /* MODAL */
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:300; display:none; align-items:center; justify-content:center; padding:16px; }
    .overlay.show { display:flex; }
    .modal { background:var(--surface); border-radius:var(--radius); padding:24px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .modal-head h3 { font-weight:700; font-size:1.05rem; }
    .modal-close { background:none; border:1.5px solid var(--border); border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; color:var(--muted); }

    .toast { position:fixed; bottom:24px; right:24px; background:var(--text); color:var(--surface); padding:12px 20px; border-radius:var(--pill,999px); font-size:0.88rem; font-weight:700; z-index:999; opacity:0; transform:translateY(10px); transition:all .3s; pointer-events:none; box-shadow:var(--shadow); }
    .toast.show { opacity:1; transform:translateY(0); }
    .toast.error { background:var(--red); }

    .copyable { cursor:pointer; text-decoration:underline; text-decoration-style:dotted; color:var(--blue); }
    .copyable:hover { color:var(--brand); }

    @media(max-width:600px) { .form-grid { grid-template-columns:1fr; } .tabs { overflow-x:auto; } }
  </style>
</head>
<body>

<!-- LOGIN -->
<div id="loginView">
  <div class="login-card">
    <h1>Admin Panel</h1>
    <p>Sign in with your admin account</p>
    <div class="field"><label>Username</label><input type="text" id="loginUser" autocomplete="username"></div>
    <div class="field"><label>Password</label><input type="password" id="loginPass" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div class="login-err" id="loginErr"></div>
    <button class="btn btn-primary login-btn" onclick="doLogin()">Sign In</button>
  </div>
</div>

<!-- ADMIN VIEW -->
<div id="adminView">
  <div class="topbar">
    <h1>Admin</h1>
    <div class="topbar-right">
      <button class="btn btn-secondary btn-sm" onclick="doLogout()">Logout</button>
    </div>
  </div>
  <div class="tabs">
    <div class="tab active" id="tab-overview" onclick="showTab('overview')">Overview</div>
    <div class="tab" id="tab-menu" onclick="showTab('menu')">Menu</div>
    <div class="tab" id="tab-staff" onclick="showTab('staff')">Staff</div>
    <div class="tab" id="tab-tables" onclick="showTab('tables')">Tables</div>
    <div class="tab" id="tab-analytics" onclick="showTab('analytics')">Analytics</div>
    <div class="tab" id="tab-inventory" onclick="showTab('inventory')">Inventory</div>
    <div class="tab" id="tab-audit" onclick="showTab('audit')">Audit Log</div>
  </div>

  <!-- OVERVIEW -->
  <div class="panel active" id="panel-overview">
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-label">Orders Today</div><div class="stat-value" id="st-orders">—</div></div>
      <div class="stat-card"><div class="stat-label">Revenue Today</div><div class="stat-value" id="st-revenue">—</div></div>
      <div class="stat-card"><div class="stat-label">Active Orders</div><div class="stat-value" id="st-active">—</div></div>
      <div class="stat-card"><div class="stat-label">Avg Prep Time</div><div class="stat-value" id="st-prep">—</div></div>
    </div>
    <div class="card">
      <div class="card-head">
        <span class="card-title">Recent Orders</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="loadOverview()">Refresh</button>
          <div style="position:relative;display:inline-block" id="exportDrop">
            <button class="btn btn-secondary btn-sm" onclick="toggleExportMenu()" style="gap:4px">Export ▾</button>
            <div id="exportMenu" style="display:none;position:absolute;right:0;top:110%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px;z-index:50;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,.12)">
              <div style="font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:4px 8px 6px">Orders</div>
              <a href="/api/admin/export/orders?days=30"  class="btn btn-secondary btn-sm" style="display:block;margin-bottom:4px;text-align:left;text-decoration:none">Last 30 Days</a>
              <a href="/api/admin/export/orders?days=90"  class="btn btn-secondary btn-sm" style="display:block;margin-bottom:4px;text-align:left;text-decoration:none">Last 90 Days</a>
              <a href="/api/admin/export/orders?days=0"   class="btn btn-secondary btn-sm" style="display:block;margin-bottom:6px;text-align:left;text-decoration:none">All Time</a>
              <div style="font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:4px 8px 6px;border-top:1px solid var(--border)">Other</div>
              <a href="/api/admin/export/audit-log" class="btn btn-secondary btn-sm" style="display:block;margin-bottom:4px;text-align:left;text-decoration:none">Audit Log</a>
            </div>
          </div>
        </div>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>ID</th><th>Table</th><th>Status</th><th>Items</th><th>Total</th><th>Time</th></tr></thead>
        <tbody id="ordersBody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- MENU -->
  <div class="panel" id="panel-menu">
    <div class="card">
      <div class="card-head"><span class="card-title">Add Menu Item</span></div>
      <div class="form-grid">
        <div class="field"><label>Name *</label><input type="text" id="mn-name"></div>
        <div class="field"><label>Price (${CURRENCY.symbol}) *</label><input type="number" id="mn-price" min="0" step="1"></div>
        <div class="field"><label>Category *</label><input type="text" id="mn-cat" list="catlist"><datalist id="catlist"><option>Main Course<option>Appetizer<option>Bread<option>Dessert<option>Beverage</datalist></div>
        <div class="field"><label>Prep Time (min)</label><input type="number" id="mn-prep" value="10" min="1"></div>
        <div class="field"><label>Description</label><input type="text" id="mn-desc"></div>
        <div class="field"><label>Image</label><div style="display:flex;gap:8px;align-items:center"><input type="text" id="mn-img" placeholder="URL or upload →" style="flex:1"><label class="btn btn-secondary btn-sm" style="cursor:pointer;white-space:nowrap;margin:0">📷 Upload<input type="file" accept="image/*" style="display:none" onchange="uploadMenuImage(this,'mn-img')"></label></div></div>
        <div class="field"><label>Spice Level (0-3)</label><input type="number" id="mn-spice" value="0" min="0" max="3"></div>
        <div class="field"><label>Allergens (comma separated)</label><input type="text" id="mn-allergens"></div>
        <div class="field"><label>Quantity (-1 for unlimited)</label><input type="number" id="mn-qty" value="-1" min="-1" step="1"></div>
      </div>
      <div class="form-grid" style="grid-template-columns:repeat(3,auto);gap:16px;align-items:center;">
        <label style="display:flex;gap:6px;align-items:center;font-size:0.88rem;cursor:pointer"><input type="checkbox" id="mn-veg"> Vegetarian</label>
        <label style="display:flex;gap:6px;align-items:center;font-size:0.88rem;cursor:pointer"><input type="checkbox" id="mn-popular"> Popular</label>
      </div>
      <div class="form-actions" style="margin-top:16px"><button class="btn btn-primary" onclick="addMenuItem()">Add Item</button></div>
    </div>
    <div class="card">
      <div class="card-head">
        <span class="card-title">All Menu Items</span>
        <div style="display:flex;gap:6px">
          <a href="/api/admin/export/menu" class="btn btn-secondary btn-sm" style="text-decoration:none">Export CSV</a>
          <button class="btn btn-secondary btn-sm" onclick="loadMenu()">Refresh</button>
        </div>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="menuBody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- STAFF -->
  <div class="panel" id="panel-staff">
    <div class="card">
      <div class="card-head"><span class="card-title">Add Staff Member</span></div>
      <div class="form-grid">
        <div class="field"><label>Username *</label><input type="text" id="sf-user"></div>
        <div class="field"><label>Full Name *</label><input type="text" id="sf-name"></div>
        <div class="field"><label>Password *</label><input type="password" id="sf-pass"></div>
        <div class="field"><label>Role *</label><select id="sf-role"><option value="kitchen">Kitchen</option><option value="waiter">Waiter</option><option value="admin">Admin</option></select></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" onclick="addStaff()">Add Staff</button></div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Staff Members</span><button class="btn btn-secondary btn-sm" onclick="loadStaff()">Refresh</button></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody id="staffBody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- TABLES -->
  <div class="panel" id="panel-tables">
    <div class="card">
      <div class="card-head"><span class="card-title">Add Table</span></div>
      <div class="form-grid" style="grid-template-columns:repeat(2,1fr);">
        <div class="field"><label>Table Number *</label><input type="number" id="tbl-num" min="1"></div>
        <div class="field"><label>Capacity</label><input type="number" id="tbl-cap" value="4" min="1"></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" onclick="addTable()">Add Table</button></div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Restaurant Tables</span><div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" onclick="downloadAllQR()">⬇️ All QRs</button><button class="btn btn-secondary btn-sm" onclick="loadTables()">Refresh</button></div></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Table #</th><th>Capacity</th><th>Status</th><th>QR Code</th><th>Actions</th></tr></thead>
        <tbody id="tablesBody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- ANALYTICS -->
  <div class="panel" id="panel-analytics">
    <div class="card">
      <div class="card-head">
        <span class="card-title">Revenue &amp; Orders</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="btn-7d" onclick="setAnalyticsPeriod(7,this)">7 Days</button>
          <button class="btn btn-secondary btn-sm" id="btn-30d" onclick="setAnalyticsPeriod(30,this)">30 Days</button>
        </div>
      </div>
      <canvas id="revenueChart"></canvas>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-head"><span class="card-title">Popular Items</span><span style="font-size:0.78rem;color:var(--muted)">by units ordered</span></div>
      <canvas id="popularChart"></canvas>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-head"><span class="card-title">Staff Performance</span><span style="font-size:0.78rem;color:var(--muted)">orders prepared &amp; avg prep time</span></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Staff Member</th><th>Orders Prepared</th><th>Avg Prep Time</th></tr></thead>
        <tbody id="staffPerfBody"><tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">Load analytics to view</td></tr></tbody>
      </table></div>
    </div>
  </div>

  <!-- INVENTORY -->
  <div class="panel" id="panel-inventory">
    <div class="card">
      <div class="card-head">
        <span class="card-title">Stock Levels</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="loadInventory()">Refresh</button>
        </div>
      </div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:14px">Items with finite stock only. Items set to unlimited (−1) are excluded. Click a quantity to edit.</p>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th><th>Restock</th></tr></thead>
        <tbody id="inventoryBody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- AUDIT LOG -->
  <div class="panel" id="panel-audit">
    <div class="card">
      <div class="card-head">
        <span class="card-title">Audit Log</span>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <a href="/api/admin/export/audit-log" class="btn btn-secondary btn-sm" style="text-decoration:none">Export CSV</a>
          <button class="btn btn-secondary btn-sm" onclick="loadAuditLog(true)">Refresh</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <input type="text" id="audit-search" placeholder="Search staff, action, entity…" style="flex:1;min-width:180px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;outline:none" oninput="filterAuditLog()">
        <select id="audit-action" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;outline:none;background:var(--bg)" onchange="filterAuditLog()">
          <option value="">All actions</option>
          <option value="staff:">Staff</option>
          <option value="menu:">Menu</option>
          <option value="table:">Tables</option>
          <option value="order:">Orders</option>
        </select>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
        <tbody id="auditBody"></tbody>
      </table></div>
      <div id="auditPager" style="margin-top:14px;text-align:center"></div>
    </div>
  </div>

<!-- EDIT MODAL -->
<div class="overlay" id="editOverlay">
  <div class="modal">
    <div class="modal-head"><h3 id="editTitle">Edit</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div id="editBody"></div>
    <div class="form-actions" style="margin-top:20px">
      <button class="btn btn-primary" id="editSaveBtn" onclick="saveEdit()">Save</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
  let currentUser = null;
  let editCtx = null;
  let editTableId = null;

  // --- AUTH ---
  async function init() {
    try {
      const r = await fetch('/api/auth/me');
      if (!r.ok) { showLogin(); return; }
      const u = await r.json();
      if (u.role !== 'admin') { showLogin('Account does not have admin access'); return; }
      currentUser = u;
      showAdmin();
    } catch {
      showLogin();
    }
  }

  function showLogin(msg) {
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('adminView').style.display = 'none';
    if (msg) showErr(msg);
  }
  function showAdmin() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('adminView').style.display = 'block';
    loadOverview();
  }
  function showErr(msg) { document.getElementById('loginErr').textContent = msg || ''; }

  async function doLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!username || !password) { showErr('Enter username and password'); return; }
    try {
      const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
      const d = await r.json();
      if (!r.ok) { showErr(d.error || 'Login failed'); return; }
      if (d.role !== 'admin') { showErr('Account does not have admin access'); return; }
      currentUser = d;
      showAdmin();
    } catch { showErr('Network error'); }
  }

  async function doLogout() {
    await fetch('/api/auth/logout', { method:'POST' });
    currentUser = null;
    showLogin();
  }

  // --- TABS ---
  const TAB_LOADERS = { overview: loadOverview, menu: loadMenu, staff: loadStaff, tables: loadTables, analytics: loadAnalytics, inventory: loadInventory, audit: loadAuditLog };
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
    TAB_LOADERS[name]?.();
  }

  // --- OVERVIEW ---
  async function loadOverview() {
    try {
      const [sRes, oRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/admin/orders?limit=50'),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        document.getElementById('st-orders').textContent = s.totalOrders;
        document.getElementById('st-revenue').textContent = '${CURRENCY.symbol} ' + parseFloat(s.totalRevenue||0).toFixed(0);
        document.getElementById('st-active').textContent = s.activeOrders;
        document.getElementById('st-prep').textContent = (s.avgPrepTimeMinutes||0) + ' min';
      }
      if (oRes.ok) {
        const orders = await oRes.json();
        document.getElementById('ordersBody').innerHTML = orders.map(o =>
          '<tr><td style="font-family:monospace;font-size:.75rem">' + o.id.slice(-8).toUpperCase() + '</td>' +
          '<td>Table ' + (o.tableNumber || '?') + '</td>' +
          '<td><span class="badge badge-' + o.status + '">' + o.status + '</span></td>' +
          '<td>' + (o.itemCount||0) + ' items</td>' +
          '<td>${CURRENCY.symbol} ' + parseFloat(o.totalAmount||0).toFixed(0) + '</td>' +
          '<td>' + new Date(o.createdAt).toLocaleTimeString() + '</td></tr>'
        ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">No orders</td></tr>';
      }
    } catch(e) { console.error(e); }
  }

  // --- MENU ---
  async function loadMenu() {
    const r = await fetch('/api/admin/menu');
    if (!r.ok) { toast('Failed to load menu', true); return; }
    const items = await r.json();
    document.getElementById('menuBody').innerHTML = items.map(i =>
      '<tr>' +
      '<td>' + esc(i.name) + '</td>' +
      '<td>' + esc(i.category) + '</td>' +
      '<td>${CURRENCY.symbol} ' + parseFloat(i.price).toFixed(0) + '</td>' +
      '<td>' +
        (i.archived ? '<span class="badge badge-red">Archived</span>' :
          (i.available ? '<span class="badge badge-green">Available</span>' : '<span class="badge" style="background:#F3F4F6;color:var(--muted)">Unavailable</span>')) +
      '</td>' +
      '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-secondary btn-sm" onclick="editMenuItem(' + i.id + ')">Edit</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleArchive(' + i.id + ',' + i.archived + ')">' + (i.archived ? 'Unarchive' : 'Archive') + '</button>' +
      '</td></tr>'
    ).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No items</td></tr>';
  }

  async function addMenuItem() {
    const name = document.getElementById('mn-name').value.trim();
    const price = parseFloat(document.getElementById('mn-price').value);
    const category = document.getElementById('mn-cat').value.trim();
    if (!name || !price || !category) { toast('Name, price, and category are required', true); return; }
    const body = {
      name, price, category,
      description: document.getElementById('mn-desc').value.trim() || undefined,
      prep_time: parseInt(document.getElementById('mn-prep').value) || 10,
      image_url: document.getElementById('mn-img').value.trim() || undefined,
      spice_level: parseInt(document.getElementById('mn-spice').value) || 0,
      allergens: document.getElementById('mn-allergens').value.split(',').map(s=>s.trim()).filter(Boolean),
      is_vegetarian: document.getElementById('mn-veg').checked,
      popular: document.getElementById('mn-popular').checked,
      stock_quantity: parseInt(document.getElementById('mn-qty').value) || -1,
    };
    const r = await fetch('/api/menu', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (r.ok) { toast('Menu item added'); loadMenu(); ['mn-name','mn-price','mn-cat','mn-desc','mn-img'].forEach(id => document.getElementById(id).value=''); document.getElementById('mn-qty').value='-1'; }
    else { const e=await r.json(); toast(e.error||'Failed to add item',true); }
  }

  async function toggleArchive(id, archived) {
    const r = await fetch('/api/menu/'+id, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({archived:!archived}) });
    if (r.ok) { toast('Item updated'); loadMenu(); }
    else toast('Failed',true);
  }

  let editMenuId = null;
  async function editMenuItem(id) {
    const r = await fetch('/api/menu/'+id);
    if (!r.ok) { toast('Failed to load item',true); return; }
    const item = await r.json();
    editMenuId = id;
    editCtx = 'menu';
    document.getElementById('editTitle').textContent = 'Edit Menu Item';
    document.getElementById('editBody').innerHTML =
      field('Name','edit-name',item.name) +
      field('Price','edit-price',item.price,'number') +
      field('Category','edit-cat',item.category) +
      field('Prep Time','edit-prep',item.prep_time,'number') +
      field('Description','edit-desc',item.description||'') +
      imageField('Image URL','edit-img',item.image_url||'') +
      field('Spice Level (0-3)','edit-spice',item.spice_level,'number') +
      field('Allergens','edit-allergens',(item.allergens||[]).join(', ')) +
      field('Quantity (-1 for unlimited)','edit-qty',item.stock_quantity ?? -1,'number') +
      '<div style="display:flex;gap:16px;margin-top:8px">' +
        check('Vegetarian','edit-veg',item.is_vegetarian) +
        check('Popular','edit-popular',item.popular) +
        check('Available','edit-avail',item.available) +
      '</div>';
    openModal();
  }

  async function saveEdit() {
    if (editCtx === 'menu') {
      const body = {
        name: val('edit-name'), price: parseFloat(val('edit-price')),
        category: val('edit-cat'), prep_time: parseInt(val('edit-prep')),
        description: val('edit-desc') || undefined,
        image_url: val('edit-img') || undefined,
        spice_level: parseInt(val('edit-spice')),
        allergens: val('edit-allergens').split(',').map(s=>s.trim()).filter(Boolean),
        is_vegetarian: chk('edit-veg'), popular: chk('edit-popular'), available: chk('edit-avail'),
        stock_quantity: parseInt(val('edit-qty')) || -1,
      };
      const r = await fetch('/api/menu/'+editMenuId, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (r.ok) { toast('Menu item saved'); loadMenu(); closeModal(); }
      else { const e=await r.json(); toast(e.error||'Failed',true); }
    } else if (editCtx === 'staff') {
      const body = {};
      const fn = val('edit-sf-name'); if (fn) body.fullName = fn;
      const role = val('edit-sf-role'); if (role) body.role = role;
      body.active = chk('edit-sf-active');
      const r = await fetch('/api/staff/'+editStaffId, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (r.ok) { toast('Staff saved'); loadStaff(); closeModal(); }
      else { const e=await r.json(); toast(e.error||'Failed',true); }
    } else if (editCtx === 'table') {
      const body = {};
      const num = parseInt(val('edit-tbl-num'));
      const cap = parseInt(val('edit-tbl-cap'));
      if (num) body.tableNumber = num;
      if (cap) body.capacity = cap;
      const r = await fetch('/api/tables/' + editTableId, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
      if (r.ok) { toast('Table saved'); loadTables(); closeModal(); }
      else { const e = await r.json(); toast(e.error || 'Failed', true); }
    } else if (editCtx === 'password') {
      const pw  = val('pw-new');
      const cpw = val('pw-confirm');
      if (pw.length < 8) { toast('Password must be at least 8 characters', true); return; }
      if (pw !== cpw)    { toast('Passwords do not match', true); return; }
      const r = await fetch('/api/staff/'+pwStaffId, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ newPassword: pw }) });
      if (r.ok) { toast('Password updated — existing sessions invalidated'); loadStaff(); closeModal(); }
      else { const e=await r.json(); toast(e.error||'Failed',true); }
    }
  }

  // --- STAFF ---
  async function loadStaff() {
    const r = await fetch('/api/staff');
    if (!r.ok) { toast('Failed to load staff',true); return; }
    const members = await r.json();
    document.getElementById('staffBody').innerHTML = members.map(m =>
      '<tr>' +
      '<td>' + esc(m.username) + '</td>' +
      '<td>' + esc(m.fullName) + '</td>' +
      '<td><span class="badge badge-' + m.role + '">' + m.role + '</span></td>' +
      '<td><span class="badge ' + (m.active?'badge-green':'badge-red') + '">' + (m.active?'Active':'Inactive') + '</span></td>' +
      '<td>' + (m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never') + '</td>' +
      '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-secondary btn-sm" onclick="editStaff(' + m.id + ')">Edit</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="openPasswordModal(' + m.id + ",'" + esc(m.username) + "')" + '">Password</button>' +
        (m.username !== currentUser?.username && m.active ? '<button class="btn btn-danger btn-sm" onclick="deactivateStaff(' + m.id + ",'" + esc(m.username) + "')" + '">Deactivate</button>' : '') +
      '</td></tr>'
    ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">No staff</td></tr>';
  }

  async function addStaff() {
    const username=val('sf-user'), fullName=val('sf-name'), password=val('sf-pass'), role=val('sf-role');
    if (!username||!fullName||!password) { toast('All fields required',true); return; }
    const r = await fetch('/api/staff', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,fullName,password,role}) });
    if (r.ok) { toast('Staff member added'); loadStaff(); ['sf-user','sf-name','sf-pass'].forEach(id=>document.getElementById(id).value=''); }
    else { const e=await r.json(); toast(e.error||'Failed',true); }
  }

  let editStaffId = null;
  let pwStaffId = null;
  async function editStaff(id) {
    const r = await fetch('/api/staff/' + id);
    if (!r.ok) { toast('Failed to load staff member', true); return; }
    const m = await r.json();
    editStaffId = id; editCtx = 'staff';
    document.getElementById('editTitle').textContent = 'Edit Staff: ' + m.username;
    document.getElementById('editBody').innerHTML =
      field('Full Name','edit-sf-name',m.fullName) +
      '<div class="field"><label>Role</label><select id="edit-sf-role">' +
        ['kitchen','waiter','admin'].map(r=>'<option value="'+r+'"'+(m.role===r?' selected':'')+'>'+r+'</option>').join('') +
      '</select></div>' +
      check('Active','edit-sf-active',m.active);
    openModal();
  }

  function openPasswordModal(id, username) {
    pwStaffId = id;
    editCtx = 'password';
    document.getElementById('editTitle').textContent = 'Reset Password — ' + username;
    document.getElementById('editSaveBtn').textContent = 'Update Password';
    const inputStyle = 'width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.9rem;outline:none;transition:border .2s;background:var(--bg);color:var(--text);box-sizing:border-box';
    document.getElementById('editBody').innerHTML =
      '<div class="field">' +
        '<label>New Password</label>' +
        '<input type="password" id="pw-new" placeholder="Min. 8 characters" style="' + inputStyle + '" oninput="updateStrength(this.value)">' +
        '<div id="pw-strength-bar" style="height:4px;border-radius:2px;margin-top:6px;background:var(--border);transition:all .3s">' +
          '<div id="pw-strength-fill" style="height:100%;border-radius:2px;width:0;transition:all .3s"></div>' +
        '</div>' +
        '<div id="pw-strength-label" style="font-size:0.75rem;color:var(--muted);margin-top:4px;height:16px"></div>' +
      '</div>' +
      '<div class="field">' +
        '<label>Confirm Password</label>' +
        '<input type="password" id="pw-confirm" placeholder="Repeat new password" style="' + inputStyle + '" oninput="checkMatch()">' +
        '<div id="pw-match-label" style="font-size:0.75rem;margin-top:4px;height:16px"></div>' +
      '</div>';
    openModal();
  }

  function updateStrength(pw) {
    const fill  = document.getElementById('pw-strength-fill');
    const label = document.getElementById('pw-strength-label');
    if (!fill) return;
    let pct = 0, color = '', text = '';
    if (pw.length === 0)      { pct = 0;   color = '';          text = ''; }
    else if (pw.length < 8)   { pct = 25;  color = '#DC2626';   text = 'Too short'; }
    else if (pw.length < 12)  { pct = 60;  color = '#D97706';   text = 'Fair'; }
    else                      { pct = 100; color = '#16A34A';   text = 'Strong'; }
    fill.style.width = pct + '%';
    fill.style.background = color;
    label.textContent = text;
    label.style.color = color;
    checkMatch();
  }

  function checkMatch() {
    const pw  = document.getElementById('pw-new')?.value || '';
    const cpw = document.getElementById('pw-confirm')?.value || '';
    const el  = document.getElementById('pw-match-label');
    if (!el || !cpw) return;
    if (pw === cpw) { el.textContent = '✓ Passwords match'; el.style.color = '#16A34A'; }
    else            { el.textContent = '✗ Passwords do not match'; el.style.color = '#DC2626'; }
  }

  async function deactivateStaff(id, username) {
    if (!confirm('Deactivate '+username+'?')) return;
    const r = await fetch('/api/staff/'+id, { method:'DELETE' });
    if (r.ok) { toast('Staff deactivated'); loadStaff(); }
    else toast('Failed',true);
  }

  // --- TABLES ---
  async function loadTables() {
    const r = await fetch('/api/tables');
    if (!r.ok) { toast('Failed to load tables',true); return; }
    const tbls = await r.json();
    document.getElementById('tablesBody').innerHTML = tbls.map(t =>
      '<tr>' +
      '<td style="font-weight:700">Table ' + t.table_number + '</td>' +
      '<td>' + t.capacity + ' seats</td>' +
      '<td><span class="badge badge-green">' + (t.status||'available') + '</span></td>' +
      '<td><img src="/api/tables/' + t.id + '/qr" alt="QR Table ' + t.table_number + '" style="width:80px;height:80px;border-radius:6px;display:block"></td>' +
      '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<a class="btn btn-secondary btn-sm" href="/api/tables/' + t.id + '/qr" download="table-' + t.table_number + '-qr.png">Download</a>' +
        '<button class="btn btn-secondary btn-sm" onclick="printQR(' + t.id + ',' + t.table_number + ')">Print</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="editTable(' + t.id + ')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deactivateTable(' + t.id + ',' + t.table_number + ')">Deactivate</button>' +
      '</td>' +
      '</tr>'
    ).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No tables</td></tr>';
  }

  async function addTable() {
    const tableNumber = parseInt(document.getElementById('tbl-num').value);
    const capacity = parseInt(document.getElementById('tbl-cap').value) || 4;
    if (!tableNumber) { toast('Table number required',true); return; }
    const r = await fetch('/api/tables', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tableNumber,capacity}) });
    if (r.ok) { toast('Table added'); loadTables(); document.getElementById('tbl-num').value=''; }
    else { const e=await r.json(); toast(e.error||'Failed',true); }
  }

  async function editTable(id) {
    const r = await fetch('/api/tables');
    if (!r.ok) { toast('Failed to load tables', true); return; }
    const tbls = await r.json();
    const t = tbls.find(x => x.id === id);
    if (!t) return;
    editTableId = id; editCtx = 'table';
    document.getElementById('editTitle').textContent = 'Edit Table ' + t.table_number;
    document.getElementById('editBody').innerHTML =
      field('Table Number', 'edit-tbl-num', t.table_number, 'number') +
      field('Capacity', 'edit-tbl-cap', t.capacity, 'number');
    openModal();
  }

  async function deactivateTable(id, num) {
    if (!confirm('Deactivate Table ' + num + '? Its QR code will stop accepting orders.')) return;
    const r = await fetch('/api/tables/' + id, { method: 'DELETE' });
    if (r.ok) { toast('Table deactivated'); loadTables(); }
    else toast('Failed', true);
  }

  function toggleExportMenu() {
    const m = document.getElementById('exportMenu');
    m.style.display = m.style.display === 'none' ? 'block' : 'none';
  }
  document.addEventListener('click', (e) => {
    const drop = document.getElementById('exportDrop');
    if (drop && !drop.contains(e.target)) {
      const m = document.getElementById('exportMenu');
      if (m) m.style.display = 'none';
    }
  });

  function copyUrl(el, url) {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => toast('URL copied!')).catch(() => {});
  }

  function printQR(id, num) {
    const w = window.open('', '_blank', 'width=420,height=520');
    w.document.write('<!DOCTYPE html><html><head><title>Table ' + num + ' QR Code</title><style>' +
      'body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;text-align:center}' +
      'h2{font-size:1.6rem;margin-bottom:12px;color:#1E293B}' +
      'img{width:300px;height:300px;border:2px solid #E2E8F0;border-radius:8px;padding:8px}' +
      'p{color:#64748B;font-size:0.9rem;margin-top:10px}' +
      '.print-btn{margin-top:20px;padding:10px 24px;border-radius:8px;border:1.5px solid #CBD5E1;background:#fff;cursor:pointer;font-size:0.9rem}' +
      '@media print{.print-btn{display:none}}' +
    '</style></head><body>' +
      '<h2>Table ' + num + '</h2>' +
      '<img src="/api/tables/' + id + '/qr" alt="QR Code">' +
      '<p>Scan to order</p>' +
      '<button class="print-btn" onclick="window.print()">🖨️ Print</button>' +
    '</body></html>');
    w.document.close();
  }

  async function downloadAllQR() {
    const r = await fetch('/api/tables');
    if (!r.ok) { toast('Failed to load tables', true); return; }
    const tbls = await r.json();
    if (!tbls.length) { toast('No tables found', true); return; }
    toast('Downloading QR codes…');
    // Fetch all QR images in parallel and zip client-side
    const entries = await Promise.all(tbls.map(async t => {
      const res = await fetch('/api/tables/' + t.id + '/qr');
      const blob = await res.blob();
      return { name: 'table-' + t.table_number + '-qr.png', blob };
    }));
    // Build zip manually using StreamSaver or simple link sequence
    // Fallback: download each file individually
    for (const entry of entries) {
      const url = URL.createObjectURL(entry.blob);
      const a = document.createElement('a');
      a.href = url; a.download = entry.name; a.click();
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 150));
    }
    toast('Downloaded ' + entries.length + ' QR codes');
  }

  // --- ANALYTICS ---
  let analyticsPeriod = 7;
  let revenueChartInst = null;
  let popularChartInst = null;

  async function loadAnalytics() {
    try {
      const r = await fetch('/api/admin/analytics?days=' + analyticsPeriod);
      if (!r.ok) { toast('Failed to load analytics', true); return; }
      const data = await r.json();
      renderRevenueChart(data.revenueByDay, data.days);
      renderPopularChart(data.popularItems);
      renderStaffPerformance(data.staffPerformance || []);
    } catch(e) { console.error(e); }
  }

  function renderStaffPerformance(rows) {
    const el = document.getElementById('staffPerfBody');
    if (!rows.length) {
      el.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">No data for this period</td></tr>';
      return;
    }
    el.innerHTML = rows.map(r =>
      '<tr>' +
        '<td style="font-weight:600">' + esc(r.staff_name || 'Unknown') + '</td>' +
        '<td>' + (r.orders_prepared || 0) + '</td>' +
        '<td>' + (r.avg_prep_min ? r.avg_prep_min + ' min' : '—') + '</td>' +
      '</tr>'
    ).join('');
  }

  function setAnalyticsPeriod(days, btn) {
    analyticsPeriod = days;
    document.getElementById('btn-7d').className = 'btn btn-secondary btn-sm';
    document.getElementById('btn-30d').className = 'btn btn-secondary btn-sm';
    btn.className = 'btn btn-primary btn-sm';
    loadAnalytics();
  }

  // --- INVENTORY ---
  async function loadInventory() {
    const r = await fetch('/api/admin/inventory');
    if (!r.ok) { toast('Failed to load inventory', true); return; }
    const items = await r.json();
    const el = document.getElementById('inventoryBody');
    if (!items.length) {
      el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No items with finite stock. Set stock_quantity on menu items to track inventory.</td></tr>';
      return;
    }
    el.innerHTML = items.map(item => {
      const qty = item.stockQuantity;
      const badge = qty === 0 ? 'badge-red' : qty <= 5 ? 'badge-yellow' : 'badge-green';
      const label = qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';
      return '<tr>' +
        '<td style="font-weight:600">' + esc(item.name) + '</td>' +
        '<td><span style="color:var(--muted);font-size:0.85rem">' + esc(item.category) + '</span></td>' +
        '<td><strong style="font-size:1.05rem">' + qty + '</strong></td>' +
        '<td><span class="badge ' + badge + '">' + label + '</span></td>' +
        '<td><div style="display:flex;gap:6px;align-items:center">' +
          '<input type="number" id="restock-' + item.id + '" min="0" placeholder="New qty" style="width:90px;padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem;background:var(--surface2);color:var(--text)">' +
          '<button class="btn btn-secondary btn-sm" onclick="restockItem(' + item.id + ')">Update</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  async function restockItem(id) {
    const input = document.getElementById('restock-' + id);
    const qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity', true); return; }
    const r = await fetch('/api/menu/' + id, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ stock_quantity: qty }) });
    if (r.ok) { toast('Stock updated'); input.value=''; loadInventory(); }
    else { const e=await r.json(); toast(e.error||'Failed',true); }
  }

  function renderRevenueChart(data, days) {
    const map = {};
    data.forEach(d => { map[d.date] = { revenue: parseFloat(d.revenue || 0), orders: parseInt(d.orderCount || 0) }; });

    const labels = [], revenues = [], orderCounts = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      revenues.push(map[key]?.revenue || 0);
      orderCounts.push(map[key]?.orders || 0);
    }

    if (revenueChartInst) revenueChartInst.destroy();
    revenueChartInst = new Chart(document.getElementById('revenueChart'), {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Revenue (${CURRENCY.code})', data: revenues, backgroundColor: 'rgba(200,82,26,0.75)', borderColor: '#C8521A', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
          { type: 'line', label: 'Orders', data: orderCounts, borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', tension: 0.35, pointRadius: 4, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          y:  { position: 'left',  title: { display: true, text: 'Revenue (${CURRENCY.code})' }, beginAtZero: true },
          y1: { position: 'right', title: { display: true, text: 'Orders' }, beginAtZero: true, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  function renderPopularChart(data) {
    const colors = ['#C8521A','#2563EB','#16A34A','#D97706','#7C3AED','#DB2777','#0891B2','#DC2626'];
    if (popularChartInst) popularChartInst.destroy();
    popularChartInst = new Chart(document.getElementById('popularChart'), {
      type: 'bar',
      data: {
        labels: data.map(i => i.name),
        datasets: [{
          label: 'Units Ordered',
          data: data.map(i => parseInt(i.quantity || 0)),
          backgroundColor: data.map((_, idx) => colors[idx % colors.length] + 'BF'),
          borderColor: data.map((_, idx) => colors[idx % colors.length]),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, title: { display: true, text: 'Units Ordered' } } }
      }
    });
  }

  // --- AUDIT LOG ---
  let auditEntries = [];
  let auditOffset = 0;
  const AUDIT_PAGE = 100;

  async function loadAuditLog(reset) {
    if (reset) { auditEntries = []; auditOffset = 0; }
    try {
      const r = await fetch('/api/audit-log?limit=' + AUDIT_PAGE + '&offset=' + auditOffset);
      if (!r.ok) { toast('Failed to load audit log', true); return; }
      const rows = await r.json();
      auditEntries = auditEntries.concat(rows);
      auditOffset += rows.length;
      filterAuditLog();
      const pager = document.getElementById('auditPager');
      if (rows.length < AUDIT_PAGE) {
        pager.innerHTML = '<span style="font-size:0.8rem;color:var(--muted)">' + auditEntries.length + ' entries total</span>';
      } else {
        pager.innerHTML = '<button class="btn btn-secondary btn-sm" onclick="loadAuditLog(false)">Load more (' + auditEntries.length + ' loaded)</button>';
      }
    } catch(e) { console.error(e); toast('Failed to load audit log', true); }
  }

  function filterAuditLog() {
    const q = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const act = document.getElementById('audit-action')?.value || '';
    const filtered = auditEntries.filter(e => {
      if (act && !e.action.startsWith(act)) return false;
      if (!q) return true;
      return (e.staffName||'').toLowerCase().includes(q) ||
             e.action.toLowerCase().includes(q) ||
             e.entityType.toLowerCase().includes(q) ||
             (e.entityId||'').toLowerCase().includes(q) ||
             (e.details||'').toLowerCase().includes(q);
    });
    renderAuditRows(filtered);
  }

  function renderAuditRows(rows) {
    const actionColor = { 'staff:': 'badge-admin', 'menu:': 'badge-kitchen', 'table:': 'badge-waiter', 'order:': 'badge-green' };
    function actionBadge(a) {
      const prefix = Object.keys(actionColor).find(k => a.startsWith(k));
      const cls = prefix ? actionColor[prefix] : '';
      return '<span class="badge ' + cls + '">' + esc(a) + '</span>';
    }
    function fmtDetails(d) {
      if (!d) return '<span style="color:var(--muted)">—</span>';
      try {
        const obj = JSON.parse(d);
        const s = Object.entries(obj).map(([k,v]) => k + ': ' + JSON.stringify(v)).join(', ');
        const short = s.length > 60 ? s.slice(0, 60) + '…' : s;
        return '<span title="' + esc(s) + '" style="cursor:default;font-size:0.78rem;font-family:monospace;color:var(--muted)">' + esc(short) + '</span>';
      } catch { return '<span style="font-size:0.78rem;font-family:monospace;color:var(--muted)">' + esc(d) + '</span>'; }
    }
    document.getElementById('auditBody').innerHTML = rows.map(e =>
      '<tr>' +
      '<td style="white-space:nowrap;font-size:0.8rem">' + new Date(e.timestamp).toLocaleString() + '</td>' +
      '<td>' + esc(e.staffName || 'System') + '</td>' +
      '<td>' + actionBadge(e.action) + '</td>' +
      '<td style="font-size:0.8rem"><span style="color:var(--muted)">' + esc(e.entityType) + '</span> ' + esc(e.entityId||'') + '</td>' +
      '<td>' + fmtDetails(e.details) + '</td>' +
      '<td style="font-size:0.78rem;color:var(--muted)">' + esc(e.ipAddress||'') + '</td>' +
      '</tr>'
    ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">No entries found</td></tr>';
  }

  async function uploadMenuImage(input, targetId) {
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch('/api/menu/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok) { document.getElementById(targetId).value = d.imageUrl; toast('Image uploaded'); }
      else toast(d.error || 'Upload failed', true);
    } catch { toast('Upload failed', true); }
    input.value = '';
  }

  // --- HELPERS ---
  function field(label, id, value, type='text') {
    return '<div class="field"><label>'+label+'</label><input type="'+type+'" id="'+id+'" value="'+esc(String(value??''))+'"></div>';
  }
  function imageField(label, id, value) {
    return '<div class="field"><label>'+label+'</label>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<input type="text" id="'+id+'" value="'+esc(String(value??''))+'" style="flex:1">' +
        '<label class="btn btn-secondary btn-sm" style="cursor:pointer;white-space:nowrap;margin:0">📷 Upload' +
          '<input type="file" accept="image/*" style="display:none" onchange="uploadMenuImage(this,' + "'" + id + "'" + ')">' +
        '</label>' +
      '</div></div>';
  }
  function check(label, id, checked) {
    return '<label style="display:flex;gap:6px;align-items:center;font-size:.88rem;cursor:pointer;margin-right:16px"><input type="checkbox" id="'+id+'"'+(checked?' checked':'')+'>'+label+'</label>';
  }
  function val(id) { return (document.getElementById(id)?.value||'').trim(); }
  function chk(id) { return document.getElementById(id)?.checked||false; }
  function esc(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function openModal() { document.getElementById('editOverlay').classList.add('show'); }
  function closeModal() { document.getElementById('editOverlay').classList.remove('show'); editCtx=null; editMenuId=null; editStaffId=null; pwStaffId=null; editTableId=null; document.getElementById('editSaveBtn').textContent = 'Save'; }

  let toastTimer;
  function toast(msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (isError?' error':'');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  init();
</script>
</body>
</html>`;
}
