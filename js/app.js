/* ════════════════════════════════════════
   DATA & STORAGE
═══════════════════════════════════════════ */
const STORE_KEY = 'nivesh_diary_v2';
let data = { investments: [], settings: { reminderDays: 30, notifEnabled: false, hideAmounts: false } };
let editingId = null;
let filterState = {
  search: '',
  types: [],
  sources: [],
  investors: [],
  status: [],
  sortBy: 'maturity',
  sortDir: 'asc'
};
let tempFilterState = JSON.parse(JSON.stringify(filterState));
let deferredInstallPrompt = null;

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) data = JSON.parse(raw);
    if (!data.investments) data.investments = [];
    if (!data.settings) data.settings = { reminderDays: 30, notifEnabled: false, hideAmounts: false };
    if (data.settings.hideAmounts === undefined) data.settings.hideAmounts = false;
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
  if (name === 'home')     renderHome();
  if (name === 'list')     renderList();
  if (name === 'alerts')   renderAlerts();
  if (name === 'settings') updateNotifUI();
}

/* ════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function fmt(n, forceVisible = false) {
  if (!n && n !== 0) return '—';
  if (data.settings.hideAmounts && !forceVisible) return '₹ ••••';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function toggleHideAmounts() {
  data.settings.hideAmounts = !data.settings.hideAmounts;
  save();
  updateHideUI();
  // Re-render current page
  if (document.getElementById('page-home').classList.contains('active')) renderHome();
  if (document.getElementById('page-list').classList.contains('active')) renderList();
  if (document.getElementById('page-alerts').classList.contains('active')) renderAlerts();
  
  // If detail sheet is open, we might need to refresh it too, but it uses IDs so it's tricky.
  // Easiest is to close it or just let the user re-open it. 
  // Actually, let's see if we can find if detail-overlay is open.
  if (document.getElementById('detail-overlay').classList.contains('open')) {
    // Extract ID from detail body if possible, or just close it.
    // Since detail body is generated, let's just re-open the last one if we had its ID.
    // For now, let's just leave it or close it. Closing is safer.
    document.getElementById('detail-overlay').classList.remove('open');
  }
}

function updateHideUI() {
  const btn = document.getElementById('hide-toggle-btn');
  if (btn) {
    const isHidden = data.settings.hideAmounts;
    btn.innerHTML = `<img src="${isHidden ? 'assets/eye_closed_icon.png' : 'assets/visible_eye_icon.png'}" alt="Visibility Status">`;
    btn.title = isHidden ? 'Show Amounts' : 'Hide Amounts';
  }
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

function getRdPaidMonths(startStr, maturityStr) {
  if (!startStr || !maturityStr) return 0;
  const start = new Date(startStr);
  const maturity = new Date(maturityStr);
  const now = new Date();
  
  start.setHours(0,0,0,0);
  maturity.setHours(0,0,0,0);
  now.setHours(0,0,0,0);

  if (now < start) return 0;
  
  const totalMonths = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
  
  if (now >= maturity) {
    return Math.max(1, totalMonths);
  }

  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) {
    months += 1;
  }
  
  return Math.min(Math.max(1, months), Math.max(1, totalMonths));
}

function getInvestedPrincipal(inv) {
  if (inv.type === 'RD') {
    const start = new Date(inv.start);
    const maturity = new Date(inv.maturity);
    const totalMonths = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
    const monthly = Number(inv.monthly) || (totalMonths > 0 ? (Number(inv.principal || 0) / totalMonths) : 0);
    if (monthly > 0) {
      const paidMonths = getRdPaidMonths(inv.start, inv.maturity);
      return Math.round(paidMonths * monthly);
    }
  }
  return Number(inv.principal || 0);
}

function getRdProgress(inv) {
  if (inv.type !== 'RD') return '';
  const start = new Date(inv.start);
  const maturity = new Date(inv.maturity);
  const totalMonths = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
  const paidMonths = getRdPaidMonths(inv.start, inv.maturity);
  return `${paidMonths}/${totalMonths} mos`;
}

/* ════════════════════════════════════════
   RENDER HOME
═══════════════════════════════════════════ */
function renderHome() {
  const invs = data.investments;
  const total = invs.reduce((s, i) => s + getInvestedPrincipal(i), 0);
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
  if (badge) {
    badge.textContent = badgeCount;
    badge.style.display = badgeCount ? 'flex' : 'none';
  }
  const notifDot = document.getElementById('notif-dot');
  if (notifDot) {
    notifDot.classList.toggle('show', badgeCount > 0);
  }
}

/* ════════════════════════════════════════
   RENDER LIST
═══════════════════════════════════════════ */
function renderList() {
  let list = [...data.investments];

  // 1. Search Query filter
  if (filterState.search.trim()) {
    const query = filterState.search.toLowerCase().trim();
    list = list.filter(i => {
      const name = (i.name || '').toLowerCase();
      const source = (i.sourceCustom || i.source || '').toLowerCase();
      const investor = (i.investor || '').toLowerCase();
      const accno = (i.accno || '').toLowerCase();
      const notes = (i.notes || '').toLowerCase();
      return name.includes(query) || source.includes(query) || investor.includes(query) || accno.includes(query) || notes.includes(query);
    });
  }

  // 2. Type filter
  if (filterState.types.length > 0) {
    list = list.filter(i => filterState.types.includes(i.type));
  }

  // 3. Institution / Source filter
  if (filterState.sources.length > 0) {
    list = list.filter(i => {
      const src = i.sourceCustom || i.source;
      return filterState.sources.includes(src);
    });
  }

  // 4. Investor filter
  if (filterState.investors.length > 0) {
    list = list.filter(i => {
      const inv = i.investor || 'Self/Unspecified';
      return filterState.investors.includes(inv);
    });
  }

  // 5. Maturity status filter
  if (filterState.status.length > 0) {
    list = list.filter(i => {
      const dl = daysLeft(i.maturity);
      return filterState.status.some(st => {
        if (st === 'active') return dl !== null && dl >= 0;
        if (st === 'matured') return dl !== null && dl < 0;
        if (st === 'soon') return dl !== null && dl >= 0 && dl <= 30;
        return true;
      });
    });
  }

  // 6. Sorting
  if (filterState.sortBy === 'maturity') {
    list.sort((a, b) => {
      if (!a.maturity) return 1; if (!b.maturity) return -1;
      const diff = new Date(a.maturity) - new Date(b.maturity);
      return filterState.sortDir === 'asc' ? diff : -diff;
    });
  } else if (filterState.sortBy === 'principal') {
    list.sort((a, b) => {
      const diff = getInvestedPrincipal(a) - getInvestedPrincipal(b);
      return filterState.sortDir === 'asc' ? diff : -diff;
    });
  } else if (filterState.sortBy === 'rate') {
    list.sort((a, b) => {
      const diff = (a.rate || 0) - (b.rate || 0);
      return filterState.sortDir === 'asc' ? diff : -diff;
    });
  } else if (filterState.sortBy === 'start') {
    list.sort((a, b) => {
      if (!a.start) return 1; if (!b.start) return -1;
      const diff = new Date(a.start) - new Date(b.start);
      return filterState.sortDir === 'asc' ? diff : -diff;
    });
  } else {
    // default: added
    list.sort((a, b) => {
      const diff = a.addedAt - b.addedAt;
      return filterState.sortDir === 'asc' ? diff : -diff;
    });
  }

  // Render to DOM
  document.getElementById('list-body').innerHTML = list.length
    ? list.map(i => invCard(i)).join('')
    : `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Nothing found</h3><p>No investments match this filter.</p></div>`;

  updateActiveFiltersBar();
}

function onSearchInput(val) {
  filterState.search = val;
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = val ? 'block' : 'none';
  }
  renderList();
}

function clearSearch() {
  const searchEl = document.getElementById('list-search');
  if (searchEl) {
    searchEl.value = '';
  }
  filterState.search = '';
  const clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
  renderList();
}

function openFilterSheet() {
  tempFilterState = JSON.parse(JSON.stringify(filterState));
  renderFilterSheet();
  document.getElementById('filter-overlay').classList.add('open');
}

function closeFilterSheet(event) {
  if (event && event.target !== document.getElementById('filter-overlay')) return;
  document.getElementById('filter-overlay').classList.remove('open');
}

function closeFilterSheetDirect() {
  document.getElementById('filter-overlay').classList.remove('open');
}

function setTempSortDir(dir) {
  tempFilterState.sortDir = dir;
  renderFilterSheet();
}

function toggleTempType(type) {
  const idx = tempFilterState.types.indexOf(type);
  if (idx > -1) {
    tempFilterState.types.splice(idx, 1);
  } else {
    tempFilterState.types.push(type);
  }
  renderFilterSheet();
}

function toggleTempStatus(st) {
  const idx = tempFilterState.status.indexOf(st);
  if (idx > -1) {
    tempFilterState.status.splice(idx, 1);
  } else {
    tempFilterState.status.push(st);
  }
  renderFilterSheet();
}

function toggleTempSource(src) {
  const idx = tempFilterState.sources.indexOf(src);
  if (idx > -1) {
    tempFilterState.sources.splice(idx, 1);
  } else {
    tempFilterState.sources.push(src);
  }
  renderFilterSheet();
}

function toggleTempInvestor(inv) {
  const idx = tempFilterState.investors.indexOf(inv);
  if (idx > -1) {
    tempFilterState.investors.splice(idx, 1);
  } else {
    tempFilterState.investors.push(inv);
  }
  renderFilterSheet();
}

function resetFilters() {
  tempFilterState = {
    search: tempFilterState.search, // preserve search text
    types: [],
    sources: [],
    investors: [],
    status: [],
    sortBy: 'maturity',
    sortDir: 'asc'
  };
  renderFilterSheet();
}

function applyFilters() {
  const sortByEl = document.getElementById('temp-sort-by');
  if (sortByEl) {
    tempFilterState.sortBy = sortByEl.value;
  }
  filterState = JSON.parse(JSON.stringify(tempFilterState));
  closeFilterSheetDirect();
  renderList();
}

function renderFilterSheet() {
  const container = document.getElementById('filter-sheet-body');
  if (!container) return;
  
  const sources = [...new Set(data.investments.map(i => i.sourceCustom || i.source).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const investors = [...new Set(data.investments.map(i => i.investor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  
  let html = `
    <!-- Sort By section -->
    <div class="filter-section">
      <div class="filter-section-title">Sort By</div>
      <div class="field" style="margin-bottom: 12px;">
        <select id="temp-sort-by" style="width: 100%; border: 1.5px solid var(--border); border-radius: var(--r-sm); padding: 12px 14px; background: var(--bg); font-size: 15px; -webkit-appearance: none; appearance: none; background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A7265' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 14px center; padding-right: 38px;">
          <option value="maturity" ${tempFilterState.sortBy === 'maturity' ? 'selected' : ''}>Maturity Date</option>
          <option value="principal" ${tempFilterState.sortBy === 'principal' ? 'selected' : ''}>Principal Amount</option>
          <option value="rate" ${tempFilterState.sortBy === 'rate' ? 'selected' : ''}>Interest Rate %</option>
          <option value="start" ${tempFilterState.sortBy === 'start' ? 'selected' : ''}>Start Date</option>
          <option value="added" ${tempFilterState.sortBy === 'added' ? 'selected' : ''}>Recently Added</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button type="button" class="btn-sm ${tempFilterState.sortDir === 'asc' ? 'on' : ''}" style="width:100%; border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--surface);" onclick="setTempSortDir('asc')">Ascending</button>
        <button type="button" class="btn-sm ${tempFilterState.sortDir === 'desc' ? 'on' : ''}" style="width:100%; border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--surface);" onclick="setTempSortDir('desc')">Descending</button>
      </div>
    </div>
    
    <!-- Investment Types section -->
    <div class="filter-section">
      <div class="filter-section-title">Investment Type</div>
      <div class="chip-grid">
  `;
  
  Object.keys(SCHEME_INFO).forEach(type => {
    const isSelected = tempFilterState.types.includes(type);
    const label = SCHEME_INFO[type].label || type;
    html += `<button type="button" class="chip-btn ${isSelected ? 'selected' : ''}" onclick="toggleTempType('${type}')">${label}</button>`;
  });
  
  html += `
      </div>
    </div>
    
    <!-- Maturity Status section -->
    <div class="filter-section">
      <div class="filter-section-title">Maturity Status</div>
      <div class="chip-grid">
        <button type="button" class="chip-btn ${tempFilterState.status.includes('active') ? 'selected' : ''}" onclick="toggleTempStatus('active')">Active</button>
        <button type="button" class="chip-btn ${tempFilterState.status.includes('matured') ? 'selected' : ''}" onclick="toggleTempStatus('matured')">Matured</button>
        <button type="button" class="chip-btn ${tempFilterState.status.includes('soon') ? 'selected' : ''}" onclick="toggleTempStatus('soon')">Maturing soon (≤30 days)</button>
      </div>
    </div>
  `;
  
  if (sources.length > 0) {
    html += `
      <div class="filter-section">
        <div class="filter-section-title">Institution / Bank</div>
        <div class="chip-grid">
    `;
    sources.forEach(src => {
      const isSelected = tempFilterState.sources.includes(src);
      html += `<button type="button" class="chip-btn ${isSelected ? 'selected' : ''}" onclick="toggleTempSource(\`${src.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">${src}</button>`;
    });
    html += `
        </div>
      </div>
    `;
  }
  
  const hasUnspecified = data.investments.some(i => !i.investor);
  if (investors.length > 0 || hasUnspecified) {
    html += `
      <div class="filter-section">
        <div class="filter-section-title">Investor</div>
        <div class="chip-grid">
    `;
    
    const allInvestors = [...investors];
    if (hasUnspecified) {
      allInvestors.push('Self/Unspecified');
    }
    
    allInvestors.forEach(inv => {
      const isSelected = tempFilterState.investors.includes(inv);
      html += `<button type="button" class="chip-btn ${isSelected ? 'selected' : ''}" onclick="toggleTempInvestor(\`${inv.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">${inv}</button>`;
    });
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function updateActiveFiltersBar() {
  const bar = document.getElementById('active-filters-bar');
  const badge = document.getElementById('filter-badge');
  if (!bar) return;
  
  let tags = [];
  let count = 0;
  
  if (filterState.types.length > 0) {
    count += filterState.types.length;
    const labels = filterState.types.map(t => (SCHEME_INFO[t] || {}).label || t).join(', ');
    tags.push(`<div class="fchip on" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="clearFilterCategory('types')">Type: ${labels} <span style="font-weight:bold; font-size:12px; margin-left:2px;">&times;</span></div>`);
  }
  
  if (filterState.sources.length > 0) {
    count += filterState.sources.length;
    const labels = filterState.sources.join(', ');
    tags.push(`<div class="fchip on" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="clearFilterCategory('sources')">Bank: ${labels} <span style="font-weight:bold; font-size:12px; margin-left:2px;">&times;</span></div>`);
  }
  
  if (filterState.investors.length > 0) {
    count += filterState.investors.length;
    const labels = filterState.investors.join(', ');
    tags.push(`<div class="fchip on" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="clearFilterCategory('investors')">Investor: ${labels} <span style="font-weight:bold; font-size:12px; margin-left:2px;">&times;</span></div>`);
  }
  
  if (filterState.status.length > 0) {
    count += filterState.status.length;
    const statusLabels = { active: 'Active', matured: 'Matured', soon: 'Maturing soon' };
    const labels = filterState.status.map(s => statusLabels[s] || s).join(', ');
    tags.push(`<div class="fchip on" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="clearFilterCategory('status')">Status: ${labels} <span style="font-weight:bold; font-size:12px; margin-left:2px;">&times;</span></div>`);
  }
  
  if (filterState.sortBy !== 'maturity' || filterState.sortDir !== 'asc') {
    const sortFields = {
      maturity: 'Maturity',
      principal: 'Principal',
      rate: 'Interest Rate',
      start: 'Start Date',
      added: 'Date Added'
    };
    const fieldLabel = sortFields[filterState.sortBy] || filterState.sortBy;
    const dirLabel = filterState.sortDir === 'asc' ? '↑' : '↓';
    tags.push(`<div class="fchip on" style="font-size:11px; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="clearFilterCategory('sort')">Sort: ${fieldLabel} ${dirLabel} <span style="font-weight:bold; font-size:12px; margin-left:2px;">&times;</span></div>`);
  }
  
  if (tags.length > 0) {
    tags.push(`<button class="fchip" style="font-size:11px; padding:4px 10px; background:none; border:1.5px dashed var(--red); color:var(--red); cursor:pointer;" onclick="clearAllFilters()">Clear All</button>`);
    bar.innerHTML = tags.join('');
    bar.style.display = 'flex';
  } else {
    bar.innerHTML = '';
    bar.style.display = 'none';
  }
  
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

function clearFilterCategory(cat) {
  if (cat === 'sort') {
    filterState.sortBy = 'maturity';
    filterState.sortDir = 'asc';
  } else {
    filterState[cat] = [];
  }
  renderList();
}

function clearAllFilters() {
  filterState.types = [];
  filterState.sources = [];
  filterState.investors = [];
  filterState.status = [];
  filterState.sortBy = 'maturity';
  filterState.sortDir = 'asc';
  clearSearch();
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
  const investorInfo = inv.investor ? `👤 ${inv.investor} · ` : '';

  let rateLabel = inv.rate ? inv.rate + '% p.a.' : typeLabel;
  if (inv.type === 'RD') {
    const progress = getRdProgress(inv);
    rateLabel = `${inv.rate ? inv.rate + '% p.a. · ' : ''}${progress}`;
  }

  return `
  <div class="inv-card" onclick="openDetail('${inv.id}')">
    <div class="inv-card-top">
      <div class="inv-card-left">
        <div class="inv-name">${inv.name}</div>
        <div class="inv-source">${investorInfo}${source}${inv.accno ? ' · ' + inv.accno : ''}</div>
      </div>
      <div class="inv-card-right">
        <div class="inv-amount">${fmt(getInvestedPrincipal(inv))}</div>
        <div class="inv-rate">${rateLabel}</div>
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
              <div style="font-size:14px;font-weight:700;color:var(--accent)">${fmt(getInvestedPrincipal(i))}</div>
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
  ['f-type','f-source','f-accno','f-investor','f-principal','f-monthly','f-rate','f-start','f-y','f-m','f-maturity','f-matamt','f-notes','f-source-custom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      delete el.dataset.auto;
    }
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

  let totalMonths = yrs * 12 + mos;
  const maturityInput = document.getElementById('f-maturity').value;
  
  // If tenure is not provided but start and maturity are, use them to find total months
  if (!totalMonths && start && maturityInput) {
    const diffYears = (new Date(maturityInput) - new Date(start)) / (365.25 * 86400000);
    if (diffYears > 0) totalMonths = Math.round(diffYears * 12);
  }

  const type = document.getElementById('f-type').value;
  if (type === 'RD') {
    const monthlyAmt = parseFloat(document.getElementById('f-monthly').value);
    if (totalMonths > 0 && monthlyAmt > 0) {
      const computedP = (totalMonths * monthlyAmt).toFixed(0);
      const prinEl = document.getElementById('f-principal');
      if (!prinEl.value || prinEl.dataset.auto == prinEl.value) {
        prinEl.value = computedP;
        prinEl.dataset.auto = computedP;
      }
    }
  }

  if (!start || (!yrs && !mos)) {
    document.getElementById('maturity-computed').style.display = 'none';
    updateDaysHint();
    calcMatAmt();
    return;
  }
  const matDate = addMonths(start, yrs * 12 + mos);
  document.getElementById('maturity-computed').textContent = fmtDate(matDate);
  document.getElementById('maturity-computed').style.display = 'block';
  document.getElementById('f-maturity').value = matDate;
  updateDaysHint();
  calcMatAmt();
}

function onMaturityManual() {
  document.getElementById('maturity-computed').style.display = 'none';
  
  const type = document.getElementById('f-type').value;
  const start = document.getElementById('f-start').value;
  const maturity = document.getElementById('f-maturity').value;
  
  // Handle RD auto-principal generation if manual maturity date changes
  if (type === 'RD' && start && maturity) {
    const diffYears = (new Date(maturity) - new Date(start)) / (365.25 * 86400000);
    const monthlyAmt = parseFloat(document.getElementById('f-monthly').value);
    if (diffYears > 0 && monthlyAmt > 0) {
      const totalMonths = Math.round(diffYears * 12);
      const computedP = (totalMonths * monthlyAmt).toFixed(0);
      const prinEl = document.getElementById('f-principal');
      if (!prinEl.value || prinEl.dataset.auto == prinEl.value) {
        prinEl.value = computedP;
        prinEl.dataset.auto = computedP;
      }
    }
  }

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
    compEl.textContent = fmt(Math.round(amt), true);
    compEl.style.display = 'block';
    
    const matAmtEl = document.getElementById('f-matamt');
    const computedMat = Math.round(amt).toString();
    if (!matAmtEl.value || matAmtEl.dataset.auto == matAmtEl.value) {
      matAmtEl.value = computedMat;
      matAmtEl.dataset.auto = computedMat;
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
    investor: document.getElementById('f-investor').value.trim(),
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
      ${inv.type === 'RD' ? `
        <div class="detail-row"><div class="d-lbl">Principal (Paid so far)</div><div class="d-val" style="color:var(--accent)">${fmt(getInvestedPrincipal(inv))}</div></div>
        <div class="detail-row"><div class="d-lbl">Total Principal</div><div class="d-val">${fmt(inv.principal)}</div></div>
      ` : `
        <div class="detail-row"><div class="d-lbl">Principal</div><div class="d-val" style="color:var(--accent)">${fmt(inv.principal)}</div></div>
      `}
      <div class="detail-row"><div class="d-lbl">Type</div><div class="d-val">${(SCHEME_INFO[inv.type]||{}).label||inv.type}</div></div>
      <div class="detail-row"><div class="d-lbl">Interest rate</div><div class="d-val">${inv.rate ? inv.rate + '% p.a.' : '—'}</div></div>
      <div class="detail-row"><div class="d-lbl">Maturity amount</div><div class="d-val" style="color:var(--accent)">${fmt(inv.matamt)}</div></div>
      <div class="detail-row"><div class="d-lbl">Start date</div><div class="d-val">${fmtDate(inv.start)}</div></div>
      <div class="detail-row"><div class="d-lbl">Maturity date</div><div class="d-val">${fmtDate(inv.maturity)}</div></div>
      ${inv.investor ? `<div class="detail-row full"><div class="d-lbl">Investor</div><div class="d-val">${inv.investor}</div></div>` : ''}
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
    document.getElementById('f-investor').value = inv.investor || '';
    document.getElementById('f-principal').value = inv.principal;
    document.getElementById('f-principal').dataset.auto = inv.principal;
    if (inv.monthly) document.getElementById('f-monthly').value = inv.monthly;
    if (inv.rate) document.getElementById('f-rate').value = inv.rate;
    document.getElementById('f-start').value = inv.start || '';
    document.getElementById('f-maturity').value = inv.maturity || '';
    if (inv.matamt) {
      document.getElementById('f-matamt').value = inv.matamt;
      document.getElementById('f-matamt').dataset.auto = inv.matamt;
    }
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
async function checkNotifPermissionGranted() {
  if (window.Capacitor && window.Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      const perm = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
      return perm.display === 'granted';
    } catch (e) {
      return false;
    }
  }
  return ('Notification' in window) && Notification.permission === 'granted';
}

async function requestNotifPermission() {
  if (window.Capacitor && window.Capacitor.isPluginAvailable('LocalNotifications')) {
    try {
      const result = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
      if (result.display === 'granted') {
        data.settings.notifEnabled = true; save();
        await scheduleNotifications();
        toast('Notifications enabled! ✓');
        dismissNotifPrompt();
        updateNotifUI();
      } else {
        toast('Notification permission denied');
      }
    } catch (e) {
      toast('Failed to request notification permission: ' + e.message);
    }
    return;
  }

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

async function scheduleNotifications() {
  if (window.Capacitor && window.Capacitor.isPluginAvailable('LocalNotifications')) {
    if (!data.settings.notifEnabled) return;
    const { LocalNotifications } = window.Capacitor.Plugins;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }

      const listToSchedule = [];
      data.investments.forEach((inv, index) => {
        if (!inv.maturity) return;
        
        const matDate = new Date(inv.maturity);
        matDate.setHours(10, 0, 0, 0); // 10 AM
        
        const reminderDays = inv.reminder || 30;
        const triggerTime = matDate.getTime() - reminderDays * 24 * 60 * 60 * 1000;
        
        if (triggerTime > Date.now()) {
          const title = reminderDays === 0 ? `🔴 ${inv.name} matures today!` : `⚠️ ${inv.name} matures in ${reminderDays} days`;
          const body  = `${fmt(getInvestedPrincipal(inv))} at ${inv.sourceCustom||inv.source}. Maturity date: ${fmtDate(inv.maturity)}`;
          
          listToSchedule.push({
            title,
            body,
            id: index + 1,
            schedule: { at: new Date(triggerTime) },
            extra: { investmentId: inv.id }
          });
        } else {
          const dl = daysLeft(inv.maturity);
          if (dl !== null && dl >= 0 && dl <= reminderDays) {
            const title = dl === 0 ? `🔴 ${inv.name} matures today!` : `⚠️ ${inv.name} matures in ${dl} days`;
            const body  = `${fmt(getInvestedPrincipal(inv))} at ${inv.sourceCustom||inv.source}. Maturity date: ${fmtDate(inv.maturity)}`;
            
            listToSchedule.push({
              title,
              body,
              id: index + 1,
              schedule: { at: new Date(Date.now() + 5000) },
              extra: { investmentId: inv.id }
            });
          }
        }
      });

      if (listToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: listToSchedule });
      }
    } catch (e) {
      console.error('Failed to schedule local notifications', e);
    }
    return;
  }

  if (!('serviceWorker' in navigator) || !data.settings.notifEnabled) return;
  if (Notification.permission !== 'granted') return;

  navigator.serviceWorker.ready.then(reg => {
    data.investments.forEach(inv => {
      if (!inv.maturity) return;
      const dl = daysLeft(inv.maturity);
      const reminderAt = inv.reminder || 30;
      if (dl !== null && dl >= 0 && dl <= reminderAt) {
        const title = dl === 0 ? `🔴 ${inv.name} matures today!` : `⚠️ ${inv.name} matures in ${dl} days`;
        const body  = `${fmt(getInvestedPrincipal(inv))} at ${inv.sourceCustom||inv.source}. Maturity date: ${fmtDate(inv.maturity)}`;
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

async function updateNotifUI() {
  const granted = await checkNotifPermissionGranted();
  const on = data.settings.notifEnabled && granted;
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
      const invInfo = i.investor ? ` [${i.investor}]` : '';
      msg += `• ${i.name}${invInfo}\n  ${fmtDate(i.maturity)} · ${fmt(getInvestedPrincipal(i), true)}${i.matamt ? ' → ' + fmt(i.matamt, true) : ''} · ${maturityLabel(daysLeft(i.maturity))}\n`;
    });
    msg += '\n';
  }
  const total = invs.reduce((s,i) => s + getInvestedPrincipal(i), 0);
  msg += `*Total invested: ${fmt(total, true)}* across ${invs.length} investments`;
  return msg;
}

async function shareWhatsApp() {
  const msg = buildSummaryText();
  if (window.Capacitor && window.Capacitor.isPluginAvailable('Share')) {
    try {
      await window.Capacitor.Plugins.Share.share({
        title: 'Nivesh Diary Summary',
        text: msg,
        dialogTitle: 'Share via...'
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

async function shareOneWhatsApp(id) {
  const inv = data.investments.find(i => i.id === id);
  if (!inv) return;
  const dl = daysLeft(inv.maturity);
  const principalStr = inv.type === 'RD'
    ? `${fmt(getInvestedPrincipal(inv), true)} (Total: ${fmt(inv.principal, true)})`
    : fmt(inv.principal, true);
  const msg = `📒 *Investment Details*\n\n*${inv.name}*\n${inv.investor ? 'Investor: ' + inv.investor + '\n' : ''}Institution: ${inv.sourceCustom||inv.source}\nPrincipal: ${principalStr}\n${inv.rate ? 'Rate: ' + inv.rate + '% p.a.\n' : ''}Maturity date: ${fmtDate(inv.maturity)}\n${inv.matamt ? 'Maturity amount: ' + fmt(inv.matamt, true) + '\n' : ''}Status: ${maturityLabel(dl) || 'Active'}\n${inv.accno ? 'Ref: ' + inv.accno : ''}`;

  if (window.Capacitor && window.Capacitor.isPluginAvailable('Share')) {
    try {
      await window.Capacitor.Plugins.Share.share({
        title: 'Investment Details',
        text: msg,
        dialogTitle: 'Share Details...'
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

async function shareEmail() {
  const invs = data.investments;
  const urgent = invs.filter(i => { const d = daysLeft(i.maturity); return d !== null && d >= 0 && d <= 90; })
                      .sort((a,b) => new Date(a.maturity) - new Date(b.maturity));
  const subject = `Investment Maturity Alert — ${new Date().toLocaleDateString('en-IN')}`;
  let body = `Dear,\n\nHere is your investment summary from Nivesh Diary.\n\n`;
  if (urgent.length) {
    body += `UPCOMING MATURITIES (next 90 days):\n${'─'.repeat(40)}\n`;
    urgent.forEach(i => {
      const principalStr = i.type === 'RD'
        ? `${fmt(getInvestedPrincipal(i), true)} (Total: ${fmt(i.principal, true)})`
        : fmt(i.principal, true);
      body += `• ${i.name}${i.investor ? ' (Investor: ' + i.investor + ')' : ''}\n  Source: ${i.sourceCustom||i.source}\n  Principal: ${principalStr}\n  Maturity: ${fmtDate(i.maturity)} (${maturityLabel(daysLeft(i.maturity))})\n  ${i.matamt ? 'Expected return: ' + fmt(i.matamt, true) : ''}\n\n`;
    });
  }
  const total = invs.reduce((s,i) => s + getInvestedPrincipal(i), 0);
  body += `\nTOTAL INVESTED: ${fmt(total, true)} across ${invs.length} investments\n\n— Sent from Nivesh Diary`;

  if (window.Capacitor && window.Capacitor.isPluginAvailable('Share')) {
    try {
      await window.Capacitor.Plugins.Share.share({
        title: subject,
        text: body,
        dialogTitle: 'Send Email Summary...'
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ════════════════════════════════════════
   BACKUP / IMPORT / EXPORT
═══════════════════════════════════════════ */
let passwordPromptResolver = null;

function promptPassword(title, desc, placeholder) {
  return new Promise(resolve => {
    document.getElementById('pwd-modal-title').textContent = title;
    document.getElementById('pwd-modal-desc').textContent = desc;
    document.getElementById('pwd-input').placeholder = placeholder || 'Password';
    document.getElementById('pwd-input').value = '';
    
    passwordPromptResolver = resolve;
    document.getElementById('password-overlay').classList.add('open');
    setTimeout(() => document.getElementById('pwd-input').focus(), 300);
  });
}

function resolvePasswordModal(value) {
  document.getElementById('password-overlay').classList.remove('open');
  if (passwordPromptResolver) {
    passwordPromptResolver(value);
    passwordPromptResolver = null;
  }
}

function closePasswordModal() {
  resolvePasswordModal(null);
}

document.getElementById('pwd-confirm-btn').addEventListener('click', () => {
  resolvePasswordModal(document.getElementById('pwd-input').value);
});
document.getElementById('pwd-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') resolvePasswordModal(document.getElementById('pwd-input').value);
});

async function deriveKey(password, saltBuffer) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"]
  );
}

function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64) {
  const binary_string = window.atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
  return bytes.buffer;
}

async function encryptBackup(plainText, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  
  const enc = new TextEncoder();
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, key, enc.encode(plainText)
  );

  return JSON.stringify({
    encrypted: true,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedContent)
  }, null, 2);
}

async function decryptBackup(encryptedObj, password) {
  const salt = base64ToBuffer(encryptedObj.salt);
  const iv = base64ToBuffer(encryptedObj.iv);
  const ciphertext = base64ToBuffer(encryptedObj.ciphertext);
  const key = await deriveKey(password, salt);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv }, key, ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

async function exportData() {
  const pwd = await promptPassword("Encrypt Backup", "Enter an optional password to encrypt your backup (leave empty for no encryption):", "Optional Password");
  if (pwd === null) return; // User clicked Cancel
  
  let outData = JSON.stringify(data, null, 2);
  if (pwd.trim().length > 0) {
    try {
      outData = await encryptBackup(outData, pwd);
    } catch(e) {
      toast('Encryption failed: ' + e.message);
      return;
    }
  }

  // Check if we are running under Capacitor with Filesystem and Share plugins
  if (window.Capacitor && window.Capacitor.isPluginAvailable('Filesystem') && window.Capacitor.isPluginAvailable('Share')) {
    try {
      const fileName = `nivesh-diary-backup-${new Date().toISOString().split('T')[0]}.json`;
      const { Filesystem, Share } = window.Capacitor.Plugins;

      // Write to CACHE directory (does not require runtime permissions)
      const result = await Filesystem.writeFile({
        path: fileName,
        data: outData,
        directory: 'CACHE',
        encoding: 'utf8'
      });

      // Share the file natively
      await Share.share({
        title: 'Nivesh Diary Backup',
        text: 'Nivesh Diary investment backup file.',
        url: result.uri,
        dialogTitle: 'Save Backup File'
      });

      toast('Backup prepared ✓');
    } catch (e) {
      toast('Export failed: ' + e.message);
      console.error(e);
    }
    return;
  }

  const blob = new Blob([outData], { type: 'application/json' });
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
  reader.onload = async e => {
    try {
      let imported = JSON.parse(e.target.result);
      
      // Decryption Logic
      if (imported.encrypted) {
        const pwd = await promptPassword("Decrypt Backup", "This backup is encrypted. Enter password to decrypt:", "Password");
        if (pwd === null) {
            toast("Import cancelled");
            event.target.value = '';
            return;
        }
        try {
          const dec = await decryptBackup(imported, pwd);
          imported = JSON.parse(dec);
        } catch(err) {
          toast("Incorrect password or corrupt file");
          event.target.value = '';
          return;
        }
      }

      if (!imported.investments) throw new Error('Invalid file structure');
      if (!confirm(`Import ${imported.investments.length} investments? This will merge with existing data.`)) {
         event.target.value = '';
         return;
      }
      
      const existingIds = new Set(data.investments.map(i => i.id));
      imported.investments.forEach(inv => {
        if (!existingIds.has(inv.id)) data.investments.push(inv);
      });
      save();
      toast(`Imported ${imported.investments.length} records ✓`);
      renderHome();
      renderList();
    } catch(err) {
      console.error(err);
      toast('Invalid backup file');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function confirmDeleteAll() {
  if (!confirm('DELETE ALL DATA? This permanently removes all investments and cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? All data will be lost.')) return;
  data.investments = [];
  save();
  toast('All data deleted');
  renderHome();
}

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
  updateHideUI();

  // Show notif prompt if not dismissed and not yet granted
  checkNotifPermissionGranted().then(granted => {
    if (!granted && !sessionStorage.getItem('notif_dismissed')) {
      document.getElementById('notif-prompt').classList.add('show');
    }
  });

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
      { type:'RD',   source:'HDFC Bank',                 principal:120000, rate:6.5, start: fmt2(new Date(today.getFullYear(), today.getMonth()-6, today.getDate())), maturity: fmt2(addMonths2(today, 18)), matamt:128500, monthly:5000, notes:'Monthly contribution via SI.' },
    ];
    samples.forEach(s => {
      data.investments.push({ id: uid(), name: `${(SCHEME_INFO[s.type]||{}).label||s.type} — ${s.source}`, addedAt: Date.now()-Math.random()*1e9, reminder: 30, accno:'', monthly:null, sourceCustom:'', ...s });
    });
    save();
    renderHome();
    toast('Loaded with sample data — tap any card to explore 👆');
  }
  scheduleNotifications();
}

init();
