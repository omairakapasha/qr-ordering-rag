import { BRAND, fontLinks, tokens, baseStyles, icon, CURRENCY } from './theme';

export function receiptPage(orderId: string): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt — Order ${orderId.slice(-8).toUpperCase()}</title>
  ${fontLinks()}
  <style>
    ${tokens('paper')}
    ${baseStyles()}

    body { display: flex; flex-direction: column; align-items: center; padding: 30px 16px; }
    .receipt {
      background: var(--surface); border: 1.5px solid var(--line); border-radius: var(--radius);
      max-width: 480px; width: 100%; padding: 32px; box-shadow: var(--shadow-soft); position: relative;
    }
    /* perforated top/bottom edges */
    .receipt::before, .receipt::after {
      content: ''; position: absolute; left: 0; right: 0; height: 10px;
      background-image: radial-gradient(circle at 6px 0, transparent 0 5px, var(--paper) 5px 6px);
      background-size: 14px 10px; background-repeat: repeat-x;
    }
    .receipt::before { top: -5px; }
    .receipt::after { bottom: -5px; transform: rotate(180deg); }

    .r-header { text-align: center; border-bottom: 2px dashed var(--line); padding-bottom: 20px; margin-bottom: 20px; }
    .restaurant-name { font-family: var(--font-display); font-size: 2.4rem; font-weight: 700; color: var(--brand-deep); margin-bottom: 2px; }
    .receipt-title { font-size: .82rem; color: var(--ink-soft); font-weight: 700; text-transform: uppercase; letter-spacing: .1em; }

    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: .9rem; }
    .meta-item label { display: block; color: var(--ink-soft); font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
    .meta-item span { font-weight: 700; }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th { text-align: left; font-size: .72rem; font-weight: 800; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .06em; padding: 8px 0; border-bottom: 1.5px solid var(--line); }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table td { padding: 10px 0; font-size: .92rem; border-bottom: 1px dashed var(--line); vertical-align: top; }
    .items-table td:last-child { font-weight: 700; }
    .item-note { font-size: .78rem; color: var(--ink-soft); margin-top: 2px; }

    .totals { border-top: 2px dashed var(--line); padding-top: 12px; margin-top: 4px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: .92rem; }
    .total-row.grand { align-items: baseline; border-top: 2px solid var(--brand); margin-top: 8px; padding-top: 12px; }
    .total-row.grand span:first-child { font-weight: 700; font-size: 1.05rem; }
    .total-row.grand span:last-child { font-family: var(--font-display); font-size: 2rem; color: var(--brand-deep); }

    .status-badge { display: inline-block; padding: 3px 10px; border-radius: var(--pill); font-size: .72rem; font-weight: 800; text-transform: uppercase; }
    .status-served { background: var(--green-bg); color: var(--green-deep); }
    .status-ready { background: var(--blue-bg); color: var(--blue-deep); }
    .status-cancelled { background: var(--red-bg); color: var(--red-deep); }
    .status-other { background: var(--surface-2); color: var(--ink-soft); }

    .r-footer { text-align: center; margin-top: 24px; font-family: var(--font-display); font-size: 1.3rem; color: var(--ink-soft); }
    .error-box { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
    .btn-row { display: flex; gap: 10px; justify-content: center; margin-top: 24px; }

    @media print {
      body { background: #fff; padding: 0; }
      .receipt { border: none; border-radius: 0; box-shadow: none; padding: 20px; }
      .receipt::before, .receipt::after { display: none; }
      .btn-row { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt" id="receipt">
    <div class="r-header">
      <div class="restaurant-name display">${BRAND.name}</div>
      <div class="receipt-title">Order Receipt</div>
    </div>
    <div id="content"><div style="text-align:center;padding:40px;color:var(--ink-soft)">Loading receipt…</div></div>
    <div class="r-footer">Thank you — see you again!</div>
  </div>
  <div class="btn-row" id="btnRow" style="display:none">
    <button class="btn btn-primary" onclick="window.print()">${icon('print')} Print</button>
    <button class="btn btn-ghost" onclick="history.length > 1 ? history.back() : window.location.href='/'">${icon('back')} Back</button>
  </div>

  <script>
    const CURRENCY_SYMBOL = '${CURRENCY.symbol}';
    const ORDER_ID = '${orderId}';

    function esc(s) { return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function statusClass(s) {
      if (s==='served') return 'status-served';
      if (s==='ready') return 'status-ready';
      if (s==='cancelled') return 'status-cancelled';
      return 'status-other';
    }

    async function loadReceipt() {
      const el = document.getElementById('content');
      try {
        const r = await fetch('/api/orders/' + ORDER_ID);
        if (!r.ok) { el.innerHTML = '<div class="error-box">Receipt not found</div>'; return; }
        const order = await r.json();

        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
        const timeStr = date.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });

        let itemRows = '';
        let subtotal = 0;
        for (const item of order.items || []) {
          const lineTotal = parseFloat(item.price) * item.quantity;
          subtotal += lineTotal;
          itemRows += '<tr><td>' +
            esc(item.name) + ' <span style="color:var(--ink-soft)">×' + item.quantity + '</span>' +
            (item.specialInstructions ? '<div class="item-note">Note: ' + esc(item.specialInstructions) + '</div>' : '') +
            '</td><td>' + CURRENCY_SYMBOL + ' ' + parseFloat(item.price).toFixed(0) + '</td><td>' + CURRENCY_SYMBOL + ' ' + lineTotal.toFixed(0) + '</td></tr>';
        }

        const total = parseFloat(order.totalAmount || subtotal);

        el.innerHTML =
          '<div class="meta">' +
            '<div class="meta-item"><label>Order ID</label><span>#' + esc(ORDER_ID.slice(-8).toUpperCase()) + '</span></div>' +
            '<div class="meta-item"><label>Status</label><span class="status-badge ' + statusClass(order.status) + '">' + esc(order.status) + '</span></div>' +
            '<div class="meta-item"><label>Table</label><span>Table ' + (order.tableNumber||'—') + '</span></div>' +
            '<div class="meta-item"><label>Date &amp; Time</label><span>' + dateStr + ' ' + timeStr + '</span></div>' +
            (order.customerName ? '<div class="meta-item"><label>Customer</label><span>' + esc(order.customerName) + '</span></div>' : '') +
          '</div>' +
          '<table class="items-table">' +
            '<thead><tr><th>Item</th><th>Unit</th><th>Total</th></tr></thead>' +
            '<tbody>' + itemRows + '</tbody>' +
          '</table>' +
          '<div class="totals">' +
            '<div class="total-row grand"><span>Total</span><span>' + CURRENCY_SYMBOL + ' ' + total.toFixed(0) + '</span></div>' +
          '</div>';

        document.getElementById('btnRow').style.display = 'flex';
      } catch {
        el.innerHTML = '<div class="error-box">Failed to load receipt — please try again.</div>';
      }
    }

    document.addEventListener('DOMContentLoaded', () => { loadReceipt(); });
  </script>
</body>
</html>`;
}
