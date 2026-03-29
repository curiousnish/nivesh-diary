/* ════════════════════════════════════════
   DATA & STORAGE
═══════════════════════════════════════════ */
const STORE_KEY = 'nivesh_diary_v2';
let data = { investments: [], settings: { reminderDays: 30, notifEnabled: false } };
let editingId = null;
let currentFilter = 'all';
let currentSort = 'maturity';
let deferredInstallPrompt = null;

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = JSON.parse(raw);
    if (!data.investments) data.investments = [];
    if (!data.settings) data.settings = { reminderDays: 30, notifEnabled: false };
  } catch(e) {}
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/* ════════════════════════════════════════
   SCHEME INFO & DEFAULTS
═══════════════════════════════════════════ */
const SCHEME_INFO = {
  FD:   { label: 'Fixed Deposit', info: 'Lump sum deposited for a fixed term. Interest paid at maturity or periodically.' },
  RD:   { label: 'Recurring Deposit', info: 'Monthly instalments for a fixed period. Enter total principal (instalments × months).' },
  TD:   { label: 'Post Office Term Deposit', info: 'Available for 1, 2, 3 or 5 year terms. 5-year TD gets Section 80C benefit.' },
  NSC:  { label: 'National Savings Certificate', info: 'GoI scheme with 5-year lock-in. Interest compounds annually, taxable but eligible for 80C.' },
  KVP:  { label: 'Kisan Vikas Patra', info: 'Investment doubles in ~115 months (9 yrs 7 months) at current rates. No fixed interest — enter maturity amount as 2× principal.' },
  MIS:  { label: 'Post Office MIS', info: 'Monthly interest payout scheme, 5-year maturity. Principal is returned at maturity.' },
  PPF:  { label: 'Public Provident Fund', info: '15-year lock-in. Tax-free interest (EEE status). Can be extended in blocks of 5 years.' },
  SCSS: { label: 'Senior Citizens Savings Scheme', info: '5-year tenure. Highest guaranteed returns for senior citizens. Eligible for 80C.' },
  Bond: { label: 'Savings Bond / GoI Bond', info: 'Sovereign Gold Bonds, Floating Rate Bonds, etc. Enter maturity date as specified on certificate.' },
  Other:{ label: 'Other investment', info: '' }
};

const SCHEME_TENURE = {
  NSC: { y: 5, m: 0 }, MIS: { y: 5, m: 0 }, SCSS: { y: 5, m: 0 },
  KVP: { y: 9, m: 7 }, PPF: { y: 15, m: 0 }
};

/* ════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'home')   renderHome();
  if (name === 'list')   renderList();
  if (name === 'alerts') renderAlerts();
}

/* ════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function fmt(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return day + ' ' + months[parseInt(m)-1] + ' ' + y;
}
function daysLeft(matDate) {
  if (!matDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const mat = new Date(matDate); mat.setHours(0,0,0,0);
  return Math.ceil((mat - now) / 86400000);
}
function maturityClass(dl) {
  if (dl === null) return 'safe';
  if (dl < 0) return 'matured';
  if (dl <= 30) return 'urgent';
  if (dl <= 60) return 'soon';
  if (dl <= 90) return 'upcoming';
  return 'safe';
}
function maturityLabel(dl) {
  if (dl === null) return '';
  if (dl < 0) return 'Matured';
  if (dl === 0) return '🔴 Matures today!';
  if (dl === 1) return '🔴 Tomorrow!';
  if (dl <= 30) return '🔴 ' + dl + ' days left';
  if (dl <= 60) return '🟡 ' + dl + ' days left';
  if (dl <= 90) return '🟠 ' + dl + ' days left';
  return dl + ' days left';
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

/* ════════════════════════════════════════
   RENDER HOME
═══════════════════════════════════════════ */
function renderHome() {
  const invs = data.investments;
  const total = invs.reduce((s, i) => s + Number(i.principal || 0), 0);
  const upcoming = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 90; });
  const urgent   = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 30; });

  document.getElementById('home-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-lbl">Total Invested</div>
      <div class="stat-val green">${fmt(total)}</div>
      <div class="stat-sub">${invs.length} investment${invs.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Maturing in 90 days</div>
      <div class="stat-val ${urgent.length ? 'red' : 'amber'}">${upcoming.length}</div>
      <div class="stat-sub">${urgent.length} urgent (≤30 days)</div>
    </div>
    <div class="stat-card wide">
      <div class="stat-lbl">Expected maturity value (of tracked)</div>
      <div class="stat-val green">${fmt(invs.reduce((s,i) => s + Number(i.matamt || i.principal || 0), 0))}</div>
      <div class="stat-sub">across ${invs.filter(i=>i.matamt).length} investments with known returns</div>
    </div>
  `;

  // Alert banners
  let alerts = '';
  if (urgent.length) {
    alerts += `<div class="alert-banner red">
      <div class="alert-icon">🚨</div>
      <div class="alert-body">
        <div class="alert-title">${urgent.length} investment${urgent.length>1?'s':''} maturing within 30 days!</div>
        <div class="alert-desc">${urgent.map(i => `${i.name} (${fmtDate(i.maturity)})`).join(', ')}. Visit Alerts tab to take action.</div>
      </div>
    </div>`;
  }
  const soon60 = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d > 30 && d <= 60; });
  if (soon60.length) {
    alerts += `<div class="alert-banner amber">
      <div class="alert-icon">⚠️</div>
      <div class="alert-body">
        <div class="alert-title">${soon60.length} maturing in 31–60 days</div>
        <div class="alert-desc">${soon60.map(i => i.name).join(', ')}</div>
      </div>
    </div>`;
  }
  const matured = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d < 0; });
  if (matured.length) {
    alerts += `<div class="alert-banner green">
      <div class="alert-icon">✅</div>
      <div class="alert-body">
        <div class="alert-title">${matured.length} investment${matured.length>1?'s':''} already matured</div>
        <div class="alert-desc">Please update or archive: ${matured.map(i=>i.name).join(', ')}</div>
      </div>
    </div>`;
  }
  document.getElementById('home-alerts').innerHTML = alerts;

  // Upcoming list
  const pill = document.getElementById('upcoming-count-pill');
  pill.textContent = upcoming.length || '';
  pill.style.display = upcoming.length ? '' : 'none';

  const sorted = [...upcoming].sort((a, b) => new Date(a.maturity) - new Date(b.maturity));
  document.getElementById('home-upcoming').innerHTML = sorted.length
    ? sorted.map(i => invCard(i)).join('')
    : `<div style="padding:16px;text-align:center;color:var(--muted);font-size:14px">No maturities in the next 90 days 🎉</div>`;

  // Recent (last 4)
  const recent = [...invs].sort((a,b) => b.addedAt - a.addedAt).slice(0, 4);
  document.getElementById('home-recent').innerHTML = recent.length
    ? recent.map(i => invCard(i)).join('')
    : `<div class="empty-state"><div class="empty-icon">📒</div><h3>Nothing here yet</h3><p>Tap <strong>Add New</strong> to record your first investment.</p></div>`;

  // Update badge
  const badgeCount = urgent.length + soon60.length;
  const badge = document.getElementById('alert-badge');
  badge.textContent = badgeCount;
  badge.style.display = badgeCount ? 'flex' : 'none';
  document.getElementById('notif-dot').classList.toggle('show', badgeCount > 0);
}

/* ════════════════════════════════════════
   RENDER LIST
═══════════════════════════════════════════ */
function renderList() {
  let list = [...data.investments];
  if (currentFilter !== 'all') list = list.filter(i => i.type === currentFilter);

  if (currentSort === 'maturity') list.sort((a, b) => {
    if (!a.maturity) return 1; if (!b.maturity) return -1;
    return new Date(a.maturity) - new Date(b.maturity);
  });
  else if (currentSort === 'amount') list.sort((a, b) => Number(b.principal) - Number(a.principal));
  else list.sort((a, b) => b.addedAt - a.addedAt);

  document.getElementById('list-body').innerHTML = list.length
    ? list.map(i => invCard(i)).join('')
    : `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nothing found</h3><p>No investments match this filter.</p></div>`;
}
function setFilter(el) {
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  currentFilter = el.dataset.f;
  renderList();
}

/* ════════════════════════════════════════
   INVESTMENT CARD HTML
═══════════════════════════════════════════ */
function invCard(inv) {
  const dl = daysLeft(inv.maturity);
  const cls = maturityClass(dl);
  const lbl = maturityLabel(dl);
  const typeLabel = (SCHEME_INFO[inv.type] || {}).label || inv.type;
  const source = inv.sourceCustom || inv.source || '';
  return `
  <div class="inv-card" onclick="openDetail('${inv.id}')">
    <div class="inv-card-top">
      <div class="inv-card-left">
        <div class="inv-name">${inv.name}</div>
        <div class="inv-source">${source}${inv.accno ? ' · ' + inv.accno : ''}</div>
      </div>
      <div class="inv-card-right">
        <div class="inv-amount">${fmt(inv.principal)}</div>
        <div class="inv-rate">${inv.rate ? inv.rate + '% p.a.' : typeLabel}</div>
      </div>
    </div>
    <div class="inv-card-bottom">
      <div>
        <div class="inv-mat-label">Matures on</div>
        <div class="inv-mat-date">${fmtDate(inv.maturity)}</div>
      </div>
      <span class="mat-chip ${cls}">${lbl || typeLabel}</span>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   RENDER ALERTS
═══════════════════════════════════════════ */
function renderAlerts() {
  const invs = data.investments;
  const groups = [
    { label: '🚨 Maturing within 30 days', cls: 'red',  invs: invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 30; }) },
    { label: '⚠️ Maturing in 31–60 days',  cls: 'amber', invs: invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d > 30 && d <= 60; }) },
    { label: '🟠 Maturing in 61–90 days',  cls: 'gold',  invs: invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d > 60 && d <= 90; }) },
    { label: '✅ Already matured',          cls: 'green', invs: invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d < 0; }) }
  ];

  let html = '';
  let anyAlert = false;
  groups.forEach(g => {
    if (!g.invs.length) return;
    anyAlert = true;
    html += `<div class="alert-banner ${g.cls}" style="flex-direction:column;gap:8px">
      <div class="alert-title">${g.label}</div>
      ${g.invs.sort((a,b)=>new Date(a.maturity)-new Date(b.maturity)).map(i => `
        <div onclick="openDetail('${i.id}')" style="background:white;border-radius:var(--r-sm);padding:12px 14px;cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-size:14px;font-weight:600">${i.name}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${i.sourceCustom||i.source} · Matures ${fmtDate(i.maturity)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:14px;font-weight:700;color:var(--accent)">${fmt(i.principal)}</div>
              <div style="font-size:11px;color:var(--muted)">${maturityLabel(daysLeft(i.maturity))}</div>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
  });

  if (!anyAlert) {
    html = `<div class="empty-state"><div class="empty-icon">🎉</div><h3>All clear!</h3><p>No investments maturing in the next 90 days. Good time to plan renewals.</p></div>`;
  }
  document.getElementById('alerts-body').innerHTML = html;
}

/* ════════════════════════════════════════
   FORM — ADD / EDIT
═══════════════════════════════════════════ */
function newInvestment() {
  editingId = null;
  document.getElementById('form-heading').textContent = '📝 Add New Investment';
  document.getElementById('save-btn').textContent = 'Save Investment';
  clearForm();
  showPage('add');
}
function clearForm() {
  ['f-type','f-source','f-accno','f-principal','f-monthly','f-rate','f-start','f-y','f-m','f-maturity','f-matamt','f-notes','f-source-custom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f-reminder').value = '30';
  document.getElementById('maturity-computed').style.display = 'none';
  document.getElementById('maturity-amt-computed').style.display = 'none';
  document.getElementById('days-left-hint').textContent = '';
  document.getElementById('mat-amt-hint').textContent = '';
  document.getElementById('type-info-box').style.display = 'none';
  document.getElementById('scheme-hint').textContent = '';
  document.getElementById('f-monthly-wrap').style.display = 'none';
  document.getElementById('source-other').style.display = 'none';
  document.getElementById('f-rate-hint').textContent = '';
}

function onTypeChange() {
  const type = document.getElementById('f-type').value;
  const info = SCHEME_INFO[type];

  // Show info
  if (info && info.info) {
    document.getElementById('type-info-text').textContent = info.info;
    document.getElementById('type-info-box').style.display = 'block';
  } else {
    document.getElementById('type-info-box').style.display = 'none';
  }

  // Show monthly instalment for RD
  document.getElementById('f-monthly-wrap').style.display = type === 'RD' ? 'block' : 'none';

  // Pre-fill tenure for fixed schemes
  const preset = SCHEME_TENURE[type];
  if (preset) {
    document.getElementById('f-y').value = preset.y;
    document.getElementById('f-m').value = preset.m;
    document.getElementById('scheme-hint').textContent = `Standard tenure for ${info.label}: ${preset.y} year${preset.y!==1?'s':''} ${preset.m ? preset.m + ' months' : ''}`;
  } else {
    document.getElementById('f-y').value = '';
    document.getElementById('f-m').value = '';
    document.getElementById('scheme-hint').textContent = '';
  }
  calcMaturity();
}

function toggleOtherSource() {
  const val = document.getElementById('f-source').value;
  document.getElementById('source-other').style.display = val === 'Other' ? 'block' : 'none';
}

function calcMaturity() {
  const start = document.getElementById('f-start').value;
  const yrs = parseInt(document.getElementById('f-y').value) || 0;
  const mos = parseInt(document.getElementById('f-m').value) || 0;

  const type = document.getElementById('f-type').value;
  if (type === 'RD') {
    const totalMonths = yrs * 12 + mos;
    const monthlyAmt = parseFloat(document.getElementById('f-monthly').value);
    if (totalMonths > 0 && monthlyAmt > 0) {
      document.getElementById('f-principal').value = (totalMonths * monthlyAmt).toFixed(0);
    }
  }

  if (!start || (!yrs && !mos)) {
    document.getElementById('maturity-computed').style.display = 'none';
    updateDaysHint();
    return;
  }
  const totalMonths = yrs * 12 + mos;
  const matDate = addMonths(start, totalMonths);
  document.getElementById('maturity-computed').textContent = fmtDate(matDate);
  document.getElementById('maturity-computed').style.display = 'block';
  document.getElementById('f-maturity').value = matDate;
  updateDaysHint();
  calcMatAmt();
}

function onMaturityManual() {
  document.getElementById('maturity-computed').style.display = 'none';
  updateDaysHint();
  calcMatAmt();
}

function updateDaysHint() {
  const mat = document.getElementById('f-maturity').value;
  const hint = document.getElementById('days-left-hint');
  if (!mat) { hint.textContent = ''; return; }
  const dl = daysLeft(mat);
  if (dl === null) return;
  if (dl < 0) hint.textContent = `Already matured ${Math.abs(dl)} days ago`;
  else if (dl === 0) hint.textContent = '🎯 Matures today!';
  else hint.textContent = `${dl} days from today`;
}

function calcMatAmt() {
  const type = document.getElementById('f-type').value;
  const principal = parseFloat(document.getElementById('f-principal').value);
  const rate = parseFloat(document.getElementById('f-rate').value);
  const start = document.getElementById('f-start').value;
  const maturity = document.getElementById('f-maturity').value;
  const hintEl = document.getElementById('mat-amt-hint');
  const compEl = document.getElementById('maturity-amt-computed');

  if (!principal || !maturity || !start) { compEl.style.display = 'none'; hintEl.textContent = ''; return; }

  const years = (new Date(maturity) - new Date(start)) / (365.25 * 86400000);

  let amt = null;
  if (type === 'KVP') {
    amt = principal * 2;
    hintEl.textContent = 'KVP doubles at maturity';
  } else if (type === 'RD' && rate && years > 0) {
    const months = Math.round(years * 12);
    const P = parseFloat(document.getElementById('f-monthly').value) || (principal / months);
    let total = 0;
    const quarterRate = rate / 400; // typical quarterly compounding for RD in India
    for (let i = 1; i <= months; i++) {
      const remainingMonths = months - i + 1;
      total += P * Math.pow(1 + quarterRate, remainingMonths / 3);
    }
    amt = total;
    hintEl.textContent = `Est. RD maturity for ${months} months`;
  } else if (rate && years > 0) {
    if (type === 'FD') {
      // Cumulative Bank FD: typically compounded quarterly
      amt = principal * Math.pow(1 + rate / 400, years * 4);
      hintEl.textContent = `Est. via quarterly compounding over ${years.toFixed(1)} years`;
    } else if (type === 'TD') {
      // Post Office TD: calculated quarterly, paid annually
      const annualInterest = principal * (Math.pow(1 + rate / 400, 4) - 1);
      amt = principal + (annualInterest * years);
      hintEl.textContent = `Total return (Calculated quarterly, paid annually)`;
    } else if (type === 'MIS' || type === 'SCSS' || type === 'Bond') {
      // Payout schemes: total return = principal + simple interest
      amt = principal + (principal * (rate / 100) * years);
      hintEl.textContent = `Total value (Principal + Simple Interest payout)`;
    } else {
      // NSC, PPF, Other: compounded annually
      amt = principal * Math.pow(1 + rate / 100, years);
      hintEl.textContent = `Est. via annual compounding over ${years.toFixed(1)} years`;
    }
  }

  if (amt) {
    compEl.textContent = fmt(Math.round(amt));
    compEl.style.display = 'block';
    if (!document.getElementById('f-matamt').value) {
      document.getElementById('f-matamt').value = Math.round(amt);
    }
  } else {
    compEl.style.display = 'none';
    hintEl.textContent = 'Enter rate and dates to auto-calculate';
  }
}

function saveInvestment() {
  const type    = document.getElementById('f-type').value;
  const source  = document.getElementById('f-source').value;
  const sourceC = document.getElementById('f-source-custom').value.trim();
  const principal = document.getElementById('f-principal').value;
  const maturity  = document.getElementById('f-maturity').value;
  const start     = document.getElementById('f-start').value;

  if (!type)      { toast('Please select investment type'); return; }
  if (!source)    { toast('Please select institution'); return; }
  if (!principal) { toast('Please enter principal amount'); return; }
  if (!start)     { toast('Please enter start date'); return; }
  if (!maturity)  { toast('Please enter maturity date'); return; }

  const sourceLabel = source === 'Other' ? sourceC : source;
  const typeLabel = (SCHEME_INFO[type]||{}).label || type;
  const autoName = `${typeLabel} — ${sourceLabel}`;

  const inv = {
    id: editingId || uid(),
    name: autoName,
    type, source, sourceCustom: sourceC,
    accno:    document.getElementById('f-accno').value.trim(),
    principal: parseFloat(principal),
    monthly:   parseFloat(document.getElementById('f-monthly').value) || null,
    rate:      parseFloat(document.getElementById('f-rate').value) || null,
    start, maturity,
    matamt:    parseFloat(document.getElementById('f-matamt').value) || null,
    reminder:  parseInt(document.getElementById('f-reminder').value),
    notes:     document.getElementById('f-notes').value.trim(),
    addedAt:   editingId ? (data.investments.find(i=>i.id===editingId)||{}).addedAt : Date.now()
  };

  if (editingId) {
    const idx = data.investments.findIndex(i => i.id === editingId);
    data.investments[idx] = inv;
    toast('Investment updated ✓');
  } else {
    data.investments.push(inv);
    toast('Investment saved ✓');
  }
  save();
  scheduleNotifications();
  editingId = null;
  clearForm();
  showPage('home');
}

function cancelForm() {
  editingId = null;
  clearForm();
  showPage('home');
}

/* ════════════════════════════════════════
   DETAIL SHEET
═══════════════════════════════════════════ */
function openDetail(id) {
  const inv = data.investments.find(i => i.id === id);
  if (!inv) return;
  const dl = daysLeft(inv.maturity);
  const cls = maturityClass(dl);
  const lbl = maturityLabel(dl);
  const source = inv.sourceCustom || inv.source || '';

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-header">
      <div>
        <div class="detail-title">${inv.name}</div>
        <div class="detail-source">${source}</div>
      </div>
      <span class="mat-chip ${cls}">${lbl || 'Active'}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-row"><div class="d-lbl">Principal</div><div class="d-val" style="color:var(--accent)">${fmt(inv.principal)}</div></div>
      <div class="detail-row"><div class="d-lbl">Type</div><div class="d-val">${(SCHEME_INFO[inv.type]||{}).label||inv.type}</div></div>
      <div class="detail-row"><div class="d-lbl">Interest rate</div><div class="d-val">${inv.rate ? inv.rate + '% p.a.' : '—'}</div></div>
      <div class="detail-row"><div class="d-lbl">Maturity amount</div><div class="d-val" style="color:var(--accent)">${fmt(inv.matamt)}</div></div>
      <div class="detail-row"><div class="d-lbl">Start date</div><div class="d-val">${fmtDate(inv.start)}</div></div>
      <div class="detail-row"><div class="d-lbl">Maturity date</div><div class="d-val">${fmtDate(inv.maturity)}</div></div>
      ${inv.accno ? `<div class="detail-row full"><div class="d-lbl">Account / Certificate no.</div><div class="d-val">${inv.accno}</div></div>` : ''}
      ${inv.notes ? `<div class="detail-row full"><div class="d-lbl">Notes</div><div class="d-val" style="font-size:14px;font-weight:400">${inv.notes}</div></div>` : ''}
      ${inv.monthly ? `<div class="detail-row full"><div class="d-lbl">Monthly instalment</div><div class="d-val">${fmt(inv.monthly)}</div></div>` : ''}
    </div>
    <div class="detail-actions">
      <button class="btn btn-outline" onclick="editInvestment('${inv.id}')">✏️ Edit</button>
      <button class="btn btn-danger" onclick="deleteInvestment('${inv.id}')">🗑️ Delete</button>
    </div>
    <div class="detail-share">
      <button class="btn btn-whatsapp" onclick="shareOneWhatsApp('${inv.id}')">📲 Share on WhatsApp</button>
    </div>
  `;
  document.getElementById('detail-overlay').classList.add('open');
}

function closeDetail(e) {
  if (e.target === document.getElementById('detail-overlay')) {
    document.getElementById('detail-overlay').classList.remove('open');
  }
}

function editInvestment(id) {
  document.getElementById('detail-overlay').classList.remove('open');
  const inv = data.investments.find(i => i.id === id);
  if (!inv) return;
  editingId = id;
  document.getElementById('form-heading').textContent = '✏️ Edit Investment';
  document.getElementById('save-btn').textContent = 'Update Investment';

  setTimeout(() => {
    document.getElementById('f-type').value = inv.type;
    onTypeChange();
    document.getElementById('f-source').value = inv.source;
    toggleOtherSource();
    if (inv.sourceCustom) document.getElementById('f-source-custom').value = inv.sourceCustom;
    document.getElementById('f-accno').value = inv.accno || '';
    document.getElementById('f-principal').value = inv.principal;
    if (inv.monthly) document.getElementById('f-monthly').value = inv.monthly;
    if (inv.rate) document.getElementById('f-rate').value = inv.rate;
    document.getElementById('f-start').value = inv.start || '';
    document.getElementById('f-maturity').value = inv.maturity || '';
    if (inv.matamt) document.getElementById('f-matamt').value = inv.matamt;
    document.getElementById('f-reminder').value = inv.reminder || 30;
    document.getElementById('f-notes').value = inv.notes || '';
    updateDaysHint();
  }, 50);
  showPage('add');
}

function deleteInvestment(id) {
  if (!confirm('Delete this investment? This cannot be undone.')) return;
  data.investments = data.investments.filter(i => i.id !== id);
  save();
  document.getElementById('detail-overlay').classList.remove('open');
  toast('Investment deleted');
  renderHome();
  renderList();
}

/* ════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════ */
async function requestNotifPermission() {
  if (!('Notification' in window)) { toast('Notifications not supported on this browser'); return; }
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    data.settings.notifEnabled = true; save();
    scheduleNotifications();
    toast('Notifications enabled! ✓');
    dismissNotifPrompt();
    updateNotifUI();
  } else {
    toast('Notification permission denied');
  }
}

function dismissNotifPrompt() {
  document.getElementById('notif-prompt').classList.remove('show');
  sessionStorage.setItem('notif_dismissed', '1');
}

function scheduleNotifications() {
  if (!('serviceWorker' in navigator) || !data.settings.notifEnabled) return;
  if (Notification.permission !== 'granted') return;

  navigator.serviceWorker.ready.then(reg => {
    data.investments.forEach(inv => {
      if (!inv.maturity) return;
      const dl = daysLeft(inv.maturity);
      const reminderAt = inv.reminder || 30;
      if (dl !== null && dl >= 0 && dl <= reminderAt) {
        const title = dl === 0 ? `🔴 ${inv.name} matures today!` : `⚠️ ${inv.name} matures in ${dl} days`;
        const body  = `${fmt(inv.principal)} at ${inv.sourceCustom||inv.source}. Maturity date: ${fmtDate(inv.maturity)}`;
        reg.active && reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', title, body, delay: 2000 });
      }
    });
  }).catch(() => {});
}

function toggleNotifications() {
  if (data.settings.notifEnabled) {
    data.settings.notifEnabled = false; save();
    toast('Notifications disabled');
    updateNotifUI();
  } else {
    requestNotifPermission();
  }
}

function updateNotifUI() {
  const on = data.settings.notifEnabled && Notification.permission === 'granted';
  document.getElementById('notif-status-text').textContent = on ? 'Enabled — reminders active' : 'Tap to enable maturity reminders';
  document.getElementById('notif-toggle-btn').textContent = on ? 'Disable' : 'Enable';
}

/* ════════════════════════════════════════
   SHARE
═══════════════════════════════════════════ */
function buildSummaryText() {
  const invs = data.investments;
  const urgent = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 90; })
                      .sort((a,b) => new Date(a.maturity) - new Date(b.maturity));
  let msg = `*📒 Nivesh Diary — Investment Summary*\n`;
  msg += `Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
  if (urgent.length) {
    msg += `*⚠️ Maturing in next 90 days:*\n`;
    urgent.forEach(i => {
      msg += `• ${i.name}\n  ${fmtDate(i.maturity)} · ${fmt(i.principal)}${i.matamt ? ' → ' + fmt(i.matamt) : ''} · ${maturityLabel(daysLeft(i.maturity))}\n`;
    });
    msg += '\n';
  }
  const total = invs.reduce((s,i) => s + Number(i.principal||0), 0);
  msg += `*Total invested: ${fmt(total)}* across ${invs.length} investments`;
  return msg;
}

function shareWhatsApp() {
  const msg = buildSummaryText();
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareOneWhatsApp(id) {
  const inv = data.investments.find(i => i.id === id);
  if (!inv) return;
  const dl = daysLeft(inv.maturity);
  const msg = `📒 *Investment Details*\n\n*${inv.name}*\nInstitution: ${inv.sourceCustom||inv.source}\nPrincipal: ${fmt(inv.principal)}\n${inv.rate ? 'Rate: ' + inv.rate + '% p.a.\n' : ''}Maturity date: ${fmtDate(inv.maturity)}\n${inv.matamt ? 'Maturity amount: ' + fmt(inv.matamt) + '\n' : ''}Status: ${maturityLabel(dl) || 'Active'}\n${inv.accno ? 'Ref: ' + inv.accno : ''}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function shareEmail() {
  const invs = data.investments;
  const urgent = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 90; })
                      .sort((a,b) => new Date(a.maturity) - new Date(b.maturity));
  const subject = `Investment Maturity Alert — ${new Date().toLocaleDateString('en-IN')}`;
  let body = `Dear,\n\nHere is your investment summary from Nivesh Diary.\n\n`;
  if (urgent.length) {
    body += `UPCOMING MATURITIES (next 90 days):\n${'─'.repeat(40)}\n`;
    urgent.forEach(i => {
      body += `• ${i.name}\n  Source: ${i.sourceCustom||i.source}\n  Principal: ${fmt(i.principal)}\n  Maturity: ${fmtDate(i.maturity)} (${maturityLabel(daysLeft(i.maturity))})\n  ${i.matamt ? 'Expected return: ' + fmt(i.matamt) : ''}\n\n`;
    });
  }
  const total = invs.reduce((s,i) => s + Number(i.principal||0), 0);
  body += `\nTOTAL INVESTED: ${fmt(total)} across ${invs.length} investments\n\n— Sent from Nivesh Diary`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ════════════════════════════════════════
   BACKUP / IMPORT / EXPORT
═══════════════════════════════════════════ */
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nivesh-diary-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded ✓');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.investments) throw new Error('Invalid file');
      if (!confirm(`Import ${imported.investments.length} investments? This will merge with existing data.`)) return;
      const existingIds = new Set(data.investments.map(i => i.id));
      imported.investments.forEach(inv => {
        if (!existingIds.has(inv.id)) data.investments.push(inv);
      });
      save();
      toast(`Imported ${imported.investments.length} records ✓`);
      renderHome();
    } catch(err) {
      toast('Invalid backup file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmDeleteAll() {
  if (!confirm('DELETE ALL DATA? This permanently removes all investments and cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? All data will be lost.')) return;
  data.investments = [];
  save();
  toast('All data deleted');
  closeSheet(null, 'backup-overlay', true);
  renderHome();
}

function openSheet(id) {
  document.getElementById(id.includes('backup') ? 'backup-overlay' : id).classList.add('open');
  updateNotifUI();
}
function closeSheet(e, id, force) {
  if (force || !e || e.target === document.getElementById(id)) {
    document.getElementById(id).classList.remove('open');
  }
}
document.getElementById('backup-overlay').addEventListener('click', e => closeSheet(e, 'backup-overlay'));

/* ════════════════════════════════════════
   PWA INSTALL
═══════════════════════════════════════════ */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-banner').style.display = 'flex';
});
function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(r => {
    if (r.outcome === 'accepted') {
      document.getElementById('install-banner').style.display = 'none';
      toast('App installed! 🎉 Find it on your home screen.');
    }
    deferredInstallPrompt = null;
  });
}
window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').style.display = 'none';
});

/* ════════════════════════════════════════
   SERVICE WORKER
═══════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => {
    scheduleNotifications();
  }).catch(() => {});
}

/* ════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
function init() {
  load();

  // Show notif prompt if not dismissed and not yet granted
  if (!sessionStorage.getItem('notif_dismissed') &&
      'Notification' in window &&
      Notification.permission === 'default') {
    document.getElementById('notif-prompt').classList.add('show');
  }

  renderHome();

  // Seed with sample data if empty (helps parents understand the app)
  if (data.investments.length === 0) {
    const today = new Date();
    const fmt2 = d => d.toISOString().split('T')[0];
    const addMonths2 = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth()+m); return x; };
    const samples = [
      { type:'FD',   source:'State Bank of India (SBI)', principal:200000, rate:7.0, start: fmt2(new Date(today.getFullYear()-1, today.getMonth(), today.getDate())), maturity: fmt2(addMonths2(today, 11)), matamt:214000, notes:'Linked to SB account. Auto-renewal OFF.' },
      { type:'NSC',  source:'India Post / Post Office',  principal:50000,  rate:7.7, start: fmt2(new Date(today.getFullYear()-3, 4, 15)), maturity: fmt2(new Date(today.getFullYear()+2, 4, 15)), matamt:71893 },
      { type:'KVP',  source:'India Post / Post Office',  principal:100000, rate:null, start: fmt2(new Date(today.getFullYear()-2, 0, 10)), maturity: fmt2(new Date(today.getFullYear()+7, 7, 10)), matamt:200000, notes:'Certificate no. KVP-2022-10012' },
      { type:'SCSS', source:'State Bank of India (SBI)', principal:300000, rate:8.2, start: fmt2(new Date(today.getFullYear()-1, 6, 1)), maturity: fmt2(new Date(today.getFullYear()+4, 6, 1)), matamt:435960, notes:'Quarterly interest payout to savings account.' },
    ];
    samples.forEach(s => {
      data.investments.push({ id: uid(), name: `${(SCHEME_INFO[s.type]||{}).label||s.type} — ${s.source}`, addedAt: Date.now()-Math.random()*1e9, reminder: 30, accno:'', monthly:null, sourceCustom:'', ...s });
    });
    save();
    renderHome();
    toast('Loaded with sample data — tap any card to explore 👆');
  }
}

init();
