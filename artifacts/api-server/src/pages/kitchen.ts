import { BRAND, CURRENCY, fontLinks, tokens, baseStyles, icon } from './theme';

export function kitchenPage(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kitchen Dashboard — ${BRAND.name}</title>
  <meta name="description" content="Live kitchen order queue — updates instantly via WebSocket.">
  ${fontLinks()}
  <style>
    ${tokens('espresso')}
    ${baseStyles()}

    /* LOGIN */
    #loginView { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .login-card { padding: 40px; max-width: 380px; width: 100%; }
    .login-card h1 { font-family: var(--font-display); font-size: 2.2rem; margin-bottom: 4px; color: var(--brand); display: flex; align-items: center; gap: 10px; }
    .login-card h1 svg { width: 1.5rem; height: 1.5rem; }
    .login-card .sub { color: var(--ink-soft); font-size: .92rem; margin-bottom: 26px; }
    .login-err { color: var(--red); font-size: .85rem; margin-top: 10px; display: none; }

    /* DASHBOARD */
    #dashView { display: none; }
    .topbar { background: var(--surface); border-bottom: 1.5px solid var(--line); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 100; }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .topbar h1 { font-family: var(--font-display); font-size: 1.7rem; color: var(--brand); }
    .ws-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 3px var(--green-bg); animation: wspulse 2s infinite; }
    .ws-dot.disconnected { background: var(--red); box-shadow: 0 0 0 3px var(--red-bg); }
    @keyframes wspulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

    /* STATS BAR */
    .stats { display: grid; grid-template-columns: repeat(2,1fr); gap: 1px; background: var(--line); border-bottom: 1px solid var(--line); }
    .stat { background: var(--surface); padding: 16px 20px; text-align: center; }
    .stat-val { font-family: var(--font-display); font-size: 2.2rem; font-weight: 700; color: var(--brand); display: block; line-height: 1; }
    .stat-label { font-size: .76rem; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }

    /* NOTIFICATION */
    .notif { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px); background: var(--brand); color: #fff; font-weight: 800; padding: 14px 28px; border-radius: var(--pill); font-size: .95rem; z-index: 9999; transition: transform .4s cubic-bezier(.4,0,.2,1); white-space: nowrap; box-shadow: var(--shadow-soft); }
    .notif.show { transform: translateX(-50%) translateY(0); }

    /* ORDERS */
    .orders-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(320px,1fr)); gap: 16px; padding: 20px; max-width: 1400px; margin: 0 auto; }
    .order-card { background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius); padding: 18px; position: relative; overflow: hidden; transition: box-shadow .2s; }
    .order-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--brand); }
    .order-card.preparing::before { background: var(--blue); }
    .order-card.ready::before { background: var(--green); }
    .order-card.urgent::before { background: var(--red); animation: urgentBlink 1s infinite; }
    @keyframes urgentBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
    .order-card.new-flash { animation: newFlash .8s ease; }
    @keyframes newFlash { 0%,100% { background: var(--surface); } 50% { background: var(--brand-tint); } }
    .order-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 8px; }
    .order-id { font-weight: 800; font-size: .92rem; }
    .order-time-badge { display: inline-flex; align-items: center; gap: 4px; font-size: .74rem; font-weight: 800; padding: 3px 9px; border-radius: var(--pill); margin-top: 4px; }
    .order-time-badge svg { width: .9em; height: .9em; }
    .time-ok { background: var(--green-bg); color: var(--green); }
    .time-warn { background: var(--amber-bg); color: var(--amber); }
    .time-crit { background: var(--red-bg); color: var(--red); animation: wspulse 1s infinite; }
    .table-chip { background: var(--brand); color: #fff; font-weight: 800; font-size: .8rem; padding: 5px 11px; border-radius: var(--pill); white-space: nowrap; }
    .order-items { margin-bottom: 14px; }
    .order-item-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: .9rem; }
    .order-item-row:last-child { border-bottom: none; }
    .item-qty-chip { background: var(--surface-2); color: var(--brand); font-size: .74rem; font-weight: 800; padding: 2px 8px; border-radius: var(--pill); margin-left: 6px; }
    .order-total { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--green); text-align: right; margin-bottom: 12px; }
    .cust-info { font-size: .78rem; color: var(--ink-soft); margin-top: 5px; }
    .action-btns { display: flex; gap: 8px; }

    /* EMPTY */
    .empty { grid-column: 1/-1; text-align: center; padding: 80px 20px; color: var(--ink-soft); }
    .empty-icon { font-size: 4rem; margin-bottom: 16px; }
  </style>
</head>
<body>

<!-- LOGIN VIEW -->
<div id="loginView">
  <div class="login-card card">
    <h1 class="display">${icon('chef')} Kitchen</h1>
    <p class="sub">Sign in to access the live order queue</p>
    <div class="field">
      <label>Username</label>
      <input type="text" id="kUsername" placeholder="kitchen" autocomplete="username">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" id="kPassword" placeholder="••••••••" autocomplete="current-password">
    </div>
    <button class="btn btn-primary btn-block" onclick="doLogin()">Access Kitchen</button>
    <div class="login-err" id="loginErr"></div>
  </div>
</div>

<!-- DASHBOARD VIEW -->
<div id="dashView">
  <div class="topbar">
    <div class="topbar-left">
      <span class="ws-dot" id="wsDot"></span>
      <h1 class="display">Kitchen Queue</h1>
    </div>
    <div class="topbar-right">
      <button class="btn btn-ghost btn-sm" onclick="doLogout()">${icon('logout')} Logout</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><span class="stat-val display" id="statPending">—</span><span class="stat-label">Pending</span></div>
    <div class="stat"><span class="stat-val display" id="statPreparing">—</span><span class="stat-label">Preparing</span></div>
  </div>
  <div class="orders-grid" id="ordersGrid"></div>
</div>

<div class="notif" id="notif">New Order!</div>

<script>
  const ICONS = { clock: \`${icon('clock')}\`, play: \`${icon('play')}\`, check: \`${icon('check')}\`, utensils: \`${icon('utensils')}\`, close: \`${icon('close')}\` };
  let ws = null;
  let knownIds = new Set();
  let refreshTimer = null;
  let wsActive = false;
  let pingTimer = null;

  async function doLogin() {
    const u = document.getElementById('kUsername').value.trim();
    const p = document.getElementById('kPassword').value;
    const errEl = document.getElementById('loginErr');
    errEl.style.display = 'none';
    try {
      const res = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username:u, password:p })
      });
      if (!res.ok) { const d = await res.json(); showLoginErr(d.error || 'Invalid credentials'); return; }
      const me = await res.json();
      if (me.role !== 'kitchen' && me.role !== 'admin') { showLoginErr('Access denied'); return; }
      showDash();
    } catch { showLoginErr('Login failed. Please try again.'); }
  }

  function showLoginErr(msg) {
    const e = document.getElementById('loginErr');
    e.textContent = msg; e.style.display = 'block';
  }

  function showDash() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashView').style.display = 'block';
    wsActive = true;
    connectWS();
    loadOrders();
    refreshTimer = setInterval(loadOrders, 30000);
  }

  async function doLogout() {
    wsActive = false;
    clearInterval(pingTimer);
    await fetch('/api/auth/logout', { method:'POST' }).catch(() => {});
    if (ws) { ws.close(); ws = null; }
    clearInterval(refreshTimer);
    document.getElementById('dashView').style.display = 'none';
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('kPassword').value = '';
    knownIds.clear();
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(\`\${proto}://\${location.host}/api/ws/kitchen\`);
    const dot = document.getElementById('wsDot');
    ws.onopen = () => {
      dot.classList.remove('disconnected');
      clearInterval(pingTimer);
      pingTimer = setInterval(() => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({type:'ping'})); }, 30000);
    };
    ws.onclose = () => { dot.classList.add('disconnected'); if (wsActive) setTimeout(connectWS, 3000); };
    ws.onerror = () => dot.classList.add('disconnected');
    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data);
        if (event.type === 'order:new') {
          showNotif('🔔 New Order — Table ' + event.order.tableNumber + (event.order.customerName ? ' · ' + event.order.customerName : ''));
          playBeep();
          loadOrders();
        } else if (event.type === 'order:updated') {
          loadOrders();
        } else if (event.type === 'stock:low') {
          const remaining = event.item?.remaining ?? 0;
          const label = remaining === 0 ? 'OUT OF STOCK' : remaining + ' left';
          showNotif('⚠️ Low Stock: ' + (event.item?.name ?? 'Item') + ' — ' + label);
        }
      } catch {}
    };
  }

  function showNotif(msg) {
    const el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  async function loadOrders() {
    const res = await fetch('/api/orders/queue').catch(() => null);
    if (!res) return;
    if (res.status === 401) { doLogout(); return; }
    const orders = await res.json();
    renderOrders(orders);
    document.getElementById('statPending').textContent = orders.filter(o => o.status === 'received').length;
    document.getElementById('statPreparing').textContent = orders.filter(o => o.status === 'preparing').length;
  }

  function renderOrders(orders) {
    const grid = document.getElementById('ordersGrid');
    if (!orders.length) {
      grid.innerHTML = '<div class="empty"><div class="empty-icon">🎉</div><p>No active orders</p></div>';
      knownIds = new Set();
      return;
    }
    const newIds = new Set(orders.map(o => o.id));
    const flashIds = new Set([...newIds].filter(id => !knownIds.has(id) && knownIds.size > 0));
    knownIds = newIds;

    grid.innerHTML = orders.map(order => {
      const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      const urgency = elapsed > 20 ? 'urgent' : '';
      const timeCls = elapsed > 20 ? 'time-crit' : elapsed > 12 ? 'time-warn' : 'time-ok';
      const flash = flashIds.has(order.id) ? 'new-flash' : '';

      let btn = '';
      if (order.status === 'received') btn = \`<button class="btn btn-primary" style="flex:1" onclick="advStatus('\${order.id}','preparing')">\${ICONS.play} Start Preparing</button>\`;
      else if (order.status === 'preparing') btn = \`<button class="btn btn-success" style="flex:1" onclick="advStatus('\${order.id}','ready')">\${ICONS.check} Mark Ready</button>\`;
      else if (order.status === 'ready') btn = \`<button class="btn btn-ghost" style="flex:1" onclick="advStatus('\${order.id}','served')">\${ICONS.utensils} Mark Served</button>\`;
      const cancelBtn = \`<button class="btn btn-danger btn-sm" onclick="cancelOrder('\${order.id}')" title="Cancel order">\${ICONS.close} Cancel</button>\`;

      const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const itemRows = (order.items || []).map(i =>
        \`<div class="order-item-row">
          <span>\${i.name ? esc(i.name) : 'Item #' + i.menuItemId}</span>
          <span class="item-qty-chip">×\${i.quantity}</span>
        </div>\`
      ).join('');

      return \`<div class="order-card \${order.status} \${urgency} \${flash}">
        <div class="order-head">
          <div>
            <div class="order-id">Order #\${order.id.slice(-6).toUpperCase()}</div>
            <span class="order-time-badge \${timeCls}">\${ICONS.clock} \${elapsed} min</span>
            \${order.customerName ? '<div class="cust-info">' + esc(order.customerName) + (order.customerPhone ? ' · ' + esc(order.customerPhone) : '') + '</div>' : ''}
          </div>
          <div class="table-chip">Table \${order.tableNumber}</div>
        </div>
        <div class="order-items">\${itemRows}</div>
        <div class="order-total">${CURRENCY.symbol} \${parseFloat(order.totalAmount).toFixed(0)}</div>
        <div class="action-btns">\${btn}\${cancelBtn}</div>
      </div>\`;
    }).join('');
  }

  async function advStatus(id, status) {
    const res = await fetch(\`/api/orders/\${id}/status\`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status })
    });
    if (res.status === 401) { doLogout(); return; }
    loadOrders();
  }

  async function cancelOrder(id) {
    if (!confirm('Cancel this order and remove it from the queue? Any reserved stock will be restored.')) return;
    const res = await fetch('/api/orders/' + id + '/status', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'cancelled', notes:'Cancelled by kitchen' })
    });
    if (res.status === 401) { doLogout(); return; }
    if (res.ok) { showNotif('Order cancelled'); loadOrders(); loadStats(); }
    else { showNotif('Could not cancel order'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('kPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('kUsername').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    fetch('/api/auth/me').then(r => {
      if (r.ok) return r.json();
      throw new Error('not logged in');
    }).then(me => {
      if (me.role === 'kitchen' || me.role === 'admin') showDash();
    }).catch(() => {});
  });
</script>
</body>
</html>`;
}
