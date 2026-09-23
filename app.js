// Attandie — Attendance & Weekly Routine Tracker
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

const store = (k, v) => v !== undefined ? localStorage.setItem(k, JSON.stringify(v)) : JSON.parse(localStorage.getItem(k) || 'null');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let subjects = store('attandie_subjects') || [];
let timetable = store('attandie_timetable') || [];
let dailyLogs = store('attandie_daily_logs') || {};
let curSyncedId = null;

const getToday = () => DAYS[new Date().getDay()];
const getDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Attendance Math Engine
function calc(att, held, target) {
  att = Math.max(0, parseInt(att, 10) || 0);
  held = Math.max(att, parseInt(held, 10) || 0);
  target = Math.max(1, Math.min(99, parseFloat(target) || 75));
  const missed = held - att;
  const pct = held ? (att / held) * 100 : 100;
  const isSafe = pct >= target;
  const diff = Math.abs(pct - target).toFixed(1);
  const skippable = held && isSafe ? Math.max(0, Math.floor((100 * att - target * held) / target)) : 0;
  const recover = held && !isSafe ? Math.max(0, Math.ceil((target * held - 100 * att) / (100 - target))) : 0;
  return { att, held, missed, target, pct, pctFmt: pct.toFixed(1), isSafe, diff, skippable, recover };
}

// Quick Calculator UI & Sync
function updateUI() {
  const res = calc($('attended').value, $('total').value, $('target-slider').value);
  $('hint-attended-pct').textContent = res.held ? `${res.pctFmt}%` : '0%';
  $('hint-missed').textContent = `Missed: ${res.missed}`;
  $('target-display').textContent = `${res.target}%`;
  $('stat-attended').textContent = res.att;
  $('stat-held').textContent = res.held;
  $('stat-missed').textContent = res.missed;
  $('stat-target').textContent = `${res.target}%`;

  $('target-line').style.left = `${res.target}%`;
  $('target-line').querySelector('.target-badge').textContent = `${res.target}%`;
  const subName = $('subject-name').value.trim();
  const subText = subName ? `in ${subName}` : '';

  if (!res.held) {
    $('pct-display').textContent = '0.0%';
    $('progress-bar').style.width = '0%';
    $('progress-bar').style.background = 'var(--yellow)';
    $('margin-text').textContent = '0 classes';
    $('verdict-banner').className = 'verdict-banner state-edge';
    $('verdict-tag').textContent = 'NO CLASSES';
    $('verdict-icon').textContent = '🚀';
    $('verdict-subtitle').textContent = 'SEMESTER START';
    $('verdict-title').innerHTML = `No classes held yet ${subText}`;
    $('verdict-text').textContent = 'Attend upcoming classes to build your attendance buffer.';
  } else if (res.isSafe) {
    $('pct-display').textContent = `${res.pctFmt}%`;
    $('progress-bar').style.width = `${Math.min(100, res.pct)}%`;
    $('progress-bar').style.background = 'var(--green)';
    $('margin-text').textContent = `Safe by +${res.diff}%`;
    $('verdict-banner').className = `verdict-banner ${res.skippable ? 'state-safe' : 'state-edge'}`;
    $('verdict-tag').textContent = res.skippable ? 'SAFE TO BUNK' : 'ON THE EDGE';
    $('verdict-icon').textContent = res.skippable ? '😎' : '⚠️';
    $('verdict-subtitle').textContent = res.skippable ? 'YOU ARE IN THE CLEAR!' : 'CRITICAL MARGIN';
    $('verdict-title').innerHTML = res.skippable
      ? `Can skip <span class="highlight">${res.skippable}</span> class${res.skippable > 1 ? 'es' : ''} ${subText}`
      : `Cannot skip any classes ${subText}`;
    $('verdict-text').textContent = res.skippable
      ? `You can safely miss ${res.skippable} consecutive class(es) and remain >= ${res.target}%.`
      : `You are right on your ${res.target}% target line.`;
  } else {
    $('pct-display').textContent = `${res.pctFmt}%`;
    $('progress-bar').style.width = `${Math.min(100, res.pct)}%`;
    $('progress-bar').style.background = 'var(--pink)';
    $('margin-text').textContent = `Deficit by -${res.diff}%`;
    $('verdict-banner').className = 'verdict-banner state-danger';
    $('verdict-tag').textContent = 'DANGER ZONE';
    $('verdict-icon').textContent = '🚨';
    $('verdict-subtitle').textContent = 'ATTENDANCE DEFICIT';
    $('verdict-title').innerHTML = `Attend next <span class="highlight" style="background:var(--pink);color:#fff">${res.recover}</span> class${res.recover > 1 ? 'es' : ''} ${subText}`;
    $('verdict-text').textContent = `Must attend next ${res.recover} consecutive class(es) to bounce back to ${res.target}%.`;
  }

  store('attandie_state', { subject: $('subject-name').value, attended: $('attended').value, held: $('total').value, target: $('target-slider').value });
}

function updateSyncBadge(text, type = 'tag-green') {
  const b = $('subject-sync-badge');
  if (!b) return;
  b.style.display = text ? 'inline-flex' : 'none';
  b.className = `mini-tag ${type}`;
  b.textContent = text;
}

function syncSubjectFromName(force = false) {
  const name = $('subject-name').value.trim();
  if (!name) {
    curSyncedId = null;
    updateSyncBadge('');
    return updateUI();
  }
  const match = subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (match) {
    if (curSyncedId !== match.id || force) {
      curSyncedId = match.id;
      $('attended').value = match.attended;
      $('total').value = match.held;
      $('target-slider').value = match.target || 75;
      setPill(match.target || 75);
      updateUI();
    }
    updateSyncBadge(`⚡ Synced: ${match.name} (${match.attended}/${match.held})`, 'tag-green');
  } else {
    curSyncedId = null;
    updateSyncBadge(`⚡ New Subject`, 'tag-yellow');
    updateUI();
  }
}

function syncFormToSubject() {
  const name = $('subject-name').value.trim();
  if (!name) return;
  const att = Math.max(0, parseInt($('attended').value, 10) || 0);
  const held = Math.max(att, parseInt($('total').value, 10) || 0);
  const target = parseFloat($('target-slider').value) || 75;

  let sub = subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (sub) {
    sub.attended = att; sub.held = held; sub.target = target;
  } else {
    sub = { id: String(Date.now()), name, attended: att, held, target };
    subjects.push(sub);
  }
  curSyncedId = sub.id;
  saveData();
  updateSyncBadge(`⚡ Synced: ${sub.name} (${sub.attended}/${sub.held})`, 'tag-green');
}

function saveData() {
  store('attandie_subjects', subjects);
  store('attandie_timetable', timetable);
  store('attandie_daily_logs', dailyLogs);
  renderSubjects();
  renderTodaySchedule();
  updateSuggestions();
}

function setPill(val) {
  $$('.pills .pill').forEach(p => p.classList.toggle('active', p.dataset.val === String(val)));
}

function updateSuggestions() {
  const el = $('subject-suggestions');
  if (el) {
    const list = [...new Set([...subjects.map(s => s.name), ...timetable.map(t => t.subject)])].filter(Boolean);
    el.innerHTML = list.map(n => `<option value="${n}">`).join('');
  }
}

function getOrAddSubject(name) {
  let sub = subjects.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
  if (!sub) {
    sub = { id: String(Date.now() + Math.random()), name: name.trim(), attended: 0, held: 0, target: 75 };
    subjects.push(sub);
    saveData();
  }
  return sub;
}

// Today's Schedule
function renderTodaySchedule() {
  const today = getToday();
  const dateKey = getDateKey();
  $('current-day-badge').textContent = today.toUpperCase();
  $('today-card-title').textContent = `📅 Today's Schedule (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})`;

  const slots = timetable.filter(t => t.day.toLowerCase() === today.toLowerCase());
  $('today-class-count').textContent = slots.length;

  const container = $('today-slots-container');
  if (!slots.length) {
    container.innerHTML = `<div class="slot-empty" style="grid-column: 1 / -1;">🎉 No classes scheduled for today (${today})!</div>`;
    return;
  }

  container.innerHTML = slots.map(slot => {
    const log = dailyLogs[`${dateKey}_${slot.id}`];
    const sub = subjects.find(s => s.name.toLowerCase() === slot.subject.toLowerCase()) || { attended: 0, held: 0, target: 75 };
    const res = calc(sub.attended, sub.held, sub.target);
    const tag = log === 'present' ? '<span class="mini-tag">✅ Present</span>'
      : log === 'absent' ? '<span class="mini-tag tag-pink">❌ Absent</span>'
      : log === 'cancelled' ? '<span class="mini-tag tag-muted">🚫 Cancelled (No Penalty)</span>'
      : `<span style="font-size:0.75rem;font-family:'Space Mono';color:#666;">Current: ${res.pctFmt}%</span>`;

    return `
      <div class="today-slot ${log ? `logged-${log}` : ''}">
        <div>
          <div class="today-slot-top">
            <div>
              <span class="slot-name">${slot.subject}</span>
              <div style="font-size:0.75rem;color:#555;font-family:'Space Mono'">${slot.room || 'Room'}</div>
            </div>
            <span class="slot-time">${slot.time || 'Class'}</span>
          </div>
          <div style="margin-top:4px;">${tag}</div>
        </div>
        <div class="btn-group mt-2">
          <button type="button" class="btn btn-sm btn-green ${log === 'present' ? 'active-slot-btn' : ''}" onclick="logTodayClass('${slot.id}', 'present')">${log === 'present' ? '✓ Present' : '+1 Present'}</button>
          <button type="button" class="btn btn-sm btn-pink ${log === 'absent' ? 'active-slot-btn' : ''}" onclick="logTodayClass('${slot.id}', 'absent')">${log === 'absent' ? '✕ Absent' : '+1 Absent'}</button>
          <button type="button" class="btn btn-sm btn-muted ${log === 'cancelled' ? 'active-slot-btn' : ''}" onclick="logTodayClass('${slot.id}', 'cancelled')">${log === 'cancelled' ? '🚫 Cancelled' : '🚫 Cancel'}</button>
        </div>
      </div>
    `;
  }).join('');
}

window.logTodayClass = (slotId, action) => {
  const slot = timetable.find(t => t.id === slotId);
  if (!slot) return;
  const key = `${getDateKey()}_${slotId}`;
  const prev = dailyLogs[key];
  const sub = getOrAddSubject(slot.subject);

  // Normalize action parameter
  let targetAction = action;
  if (action === true) targetAction = 'present';
  if (action === false) targetAction = 'absent';

  // Toggle off if clicking the same status again
  if (prev === targetAction) {
    if (prev === 'present') {
      sub.attended = Math.max(0, sub.attended - 1);
      sub.held = Math.max(0, sub.held - 1);
    } else if (prev === 'absent') {
      sub.held = Math.max(0, sub.held - 1);
    }
    delete dailyLogs[key];
    saveData();
    if ($('subject-name').value.trim().toLowerCase() === sub.name.toLowerCase()) {
      $('attended').value = sub.attended;
      $('total').value = sub.held;
      updateUI();
      updateSyncBadge(`⚡ Synced: ${sub.name} (${sub.attended}/${sub.held})`, 'tag-green');
    }
    return showToast(`↺ Status cleared for ${slot.subject}`, 'info');
  }

  // Revert previous state if it affected counters
  if (prev === 'present') {
    sub.attended = Math.max(0, sub.attended - 1);
    sub.held = Math.max(0, sub.held - 1);
  } else if (prev === 'absent') {
    sub.held = Math.max(0, sub.held - 1);
  }

  // Apply new state
  if (targetAction === 'present') {
    sub.attended += 1;
    sub.held += 1;
    dailyLogs[key] = 'present';
    throwConfetti();
    showToast(`✅ +1 Present for ${slot.subject}!`, 'success');
  } else if (targetAction === 'absent') {
    sub.held += 1;
    dailyLogs[key] = 'absent';
    showToast(`⚠️ +1 Absent for ${slot.subject}`, 'warning');
  } else if (targetAction === 'cancelled') {
    dailyLogs[key] = 'cancelled';
    showToast(`🚫 ${slot.subject} marked Cancelled (Timetable intact & 0 penalty)`, 'info');
  }

  saveData();
  if ($('subject-name').value.trim().toLowerCase() === sub.name.toLowerCase()) {
    $('attended').value = sub.attended;
    $('total').value = sub.held;
    updateUI();
    updateSyncBadge(`⚡ Synced: ${sub.name} (${sub.attended}/${sub.held})`, 'tag-green');
  }
};

// Weekly Timetable
function renderTimetable() {
  const container = $('timetable-container');
  if (!container) return;
  const today = getToday();

  container.innerHTML = WEEKDAYS.map(day => {
    const slots = timetable.filter(t => t.day.toLowerCase() === day.toLowerCase());
    const isToday = day.toLowerCase() === today.toLowerCase();
    const items = slots.length ? slots.map(s => `
      <div class="slot-item">
        <div class="slot-item-info">
          <strong>${s.subject}</strong>
          <span>⏰ ${s.time || 'N/A'} ${s.room ? `• 📍 ${s.room}` : ''}</span>
        </div>
        <div>
          <button type="button" class="icon-btn" onclick="editSlot('${s.id}')">✏️</button>
          <button type="button" class="icon-btn" onclick="deleteSlot('${s.id}')">🗑️</button>
        </div>
      </div>
    `).join('') : '<div class="slot-empty">No classes scheduled</div>';

    return `
      <div class="day-card ${isToday ? 'is-today' : ''}">
        <div class="day-header">
          <h3>${day} ${isToday ? '<span class="tag tag-yellow" style="font-size:0.65rem">TODAY</span>' : ''}</h3>
          <button type="button" class="btn btn-sm btn-ghost" onclick="openAddSlotModal('${day}')">+ Add</button>
        </div>
        <div class="slot-list">${items}</div>
      </div>
    `;
  }).join('');
}

window.openAddSlotModal = day => {
  $('modal-slot-id').value = '';
  $('modal-slot-form').reset();
  $('slot-day').value = day;
  $('modal-slot-title').textContent = `Add Class Slot (${day})`;
  updateSuggestions();
  $('modal-slot').showModal();
};

window.editSlot = id => {
  const slot = timetable.find(t => t.id === id);
  if (!slot) return;
  $('modal-slot-id').value = slot.id;
  $('slot-day').value = slot.day;
  $('slot-subject').value = slot.subject;
  $('slot-time').value = slot.time || '';
  $('slot-room').value = slot.room || '';
  $('modal-slot-title').textContent = 'Edit Slot';
  $('modal-slot').showModal();
};

window.deleteSlot = id => {
  const slot = timetable.find(t => t.id === id);
  if (slot && confirm(`Remove "${slot.subject}" from ${slot.day}?`)) {
    timetable = timetable.filter(t => t.id !== id);
    saveData();
    showToast('🗑️ Slot removed');
  }
};

// Multi-Subject Management
function renderSubjects() {
  const container = $('subjects-container');
  const empty = $('empty-state');
  $('subject-count').textContent = subjects.length;

  if (!subjects.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return updateAggregates();
  }
  empty.style.display = 'none';

  container.innerHTML = subjects.map(sub => {
    const res = calc(sub.attended, sub.held, sub.target);
    const tagBg = res.isSafe ? 'var(--green)' : 'var(--pink)';
    const vBg = res.isSafe ? 'var(--green-lt)' : 'var(--pink-lt)';
    const vText = res.isSafe
      ? (res.skippable > 0 ? `🌴 Can skip <strong>${res.skippable}</strong> class(es)` : `⚠️ On the edge (0 skips)`)
      : `🚨 Need <strong>${res.recover}</strong> classes to recover`;

    return `
      <div class="subject-card">
        <div>
          <div class="sub-header">
            <div>
              <h3>${sub.name}</h3>
              <span style="font-size:0.75rem;font-family:'Space Mono';color:#666">Target: ${sub.target}%</span>
            </div>
            <span class="tag" style="background:${tagBg};color:${res.isSafe ? 'var(--ink)' : '#fff'}">${res.pctFmt}%</span>
          </div>
          <div class="progress-track" style="height:12px;margin:6px 0;">
            <div class="progress-bar" style="width:${Math.min(100, res.pct)}%;background:${res.isSafe ? 'var(--green)' : 'var(--pink)'}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-family:'Space Mono';font-weight:700;">
            <span>Attended: ${res.att}/${res.held}</span>
            <span>Missed: ${res.missed}</span>
          </div>
          <div class="sub-verdict" style="background:${vBg}">${vText}</div>
        </div>
        <div>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-green" onclick="logSubject('${sub.id}', true)">+1 Present</button>
            <button type="button" class="btn btn-sm btn-pink" onclick="logSubject('${sub.id}', false)">+1 Absent</button>
          </div>
          <div class="sub-footer">
            <button type="button" class="btn btn-sm btn-ghost" onclick="loadIntoCalc('${sub.id}')">⚡ Open</button>
            <div>
              <button type="button" class="icon-btn" onclick="editSubject('${sub.id}')">✏️</button>
              <button type="button" class="icon-btn" onclick="deleteSubject('${sub.id}')">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  updateAggregates();
}

function updateAggregates() {
  let att = 0, held = 0, safe = 0, risk = 0;
  subjects.forEach(s => {
    att += s.attended || 0;
    held += s.held || 0;
    if (s.held) calc(s.attended, s.held, s.target).isSafe ? safe++ : risk++;
  });
  $('agg-pct').textContent = `${held ? ((att / held) * 100).toFixed(1) : 0.0}%`;
  $('agg-safe').textContent = safe;
  $('agg-risk').textContent = risk;
  $('agg-total').textContent = held;
}

window.logSubject = (id, isPresent) => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  if (isPresent) s.attended += 1;
  s.held += 1;
  saveData();
  if ($('subject-name').value.trim().toLowerCase() === s.name.toLowerCase()) {
    $('attended').value = s.attended;
    $('total').value = s.held;
    updateUI();
    updateSyncBadge(`⚡ Synced: ${s.name} (${s.attended}/${s.held})`, 'tag-green');
  }
  showToast(isPresent ? `✅ +1 Present for ${s.name}` : `⚠️ +1 Absent for ${s.name}`, isPresent ? 'success' : 'warning');
};

window.deleteSubject = id => {
  const s = subjects.find(x => x.id === id);
  if (s && confirm(`Delete "${s.name}"?`)) {
    const delName = s.name.toLowerCase();
    subjects = subjects.filter(x => x.id !== id);
    saveData();
    if ($('subject-name').value.trim().toLowerCase() === delName) {
      curSyncedId = null;
      updateSyncBadge(`⚡ New Subject`, 'tag-yellow');
    }
    showToast(`🗑️ Deleted ${s.name}`);
  }
};

window.editSubject = id => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  $('modal-id').value = s.id;
  $('modal-name').value = s.name;
  $('modal-attended').value = s.attended;
  $('modal-held').value = s.held;
  $('modal-target').value = s.target;
  $('modal-title').textContent = 'Edit Subject';
  $('modal-subject').showModal();
};

window.loadIntoCalc = id => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  $('subject-name').value = s.name;
  $('attended').value = s.attended;
  $('total').value = s.held;
  $('target-slider').value = s.target;
  setPill(s.target);
  curSyncedId = s.id;
  updateUI();
  updateSyncBadge(`⚡ Synced: ${s.name} (${s.attended}/${s.held})`, 'tag-green');
  document.querySelector('[data-tab="calculator"]').click();
  showToast(`⚡ Loaded ${s.name}`);
};

// Simulator
function renderSimulator() {
  const a = parseInt($('attended').value, 10) || 0;
  const h = parseInt($('total').value, 10) || 0;
  const t = parseFloat($('target-slider').value) || 75;

  $('sim-tbody').innerHTML = Array.from({ length: 10 }, (_, i) => {
    const step = i + 1;
    const att = calc(a + step, h + step, t);
    const bnk = calc(a, h + step, t);
    return `
      <tr>
        <td><strong>+${step} class${step > 1 ? 'es' : ''}</strong></td>
        <td class="${att.isSafe ? 'cell-safe' : 'cell-danger'}">${att.pctFmt}% (${a + step}/${h + step})</td>
        <td class="${bnk.isSafe ? 'cell-danger' : 'cell-danger'}">${bnk.pctFmt}% (${a}/${h + step})</td>
        <td><span class="mini-tag ${bnk.isSafe ? '' : 'tag-pink'}">${bnk.isSafe ? 'Safe to skip' : 'Need to attend'}</span></td>
      </tr>
    `;
  }).join('');
}

// UI Feedback
function showToast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type ? `toast-${type}` : ''}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); }, 2200);
}

function throwConfetti() {
  const cvs = $('confetti');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  cvs.width = window.innerWidth; cvs.height = window.innerHeight;
  const pts = Array.from({ length: 40 }, () => ({
    x: window.innerWidth / 2, y: window.innerHeight * 0.4,
    size: Math.random() * 8 + 6,
    color: ['#ffe600', '#00f59b', '#ff5470', '#00f0ff', '#121212'][Math.floor(Math.random() * 5)],
    vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.7) * 14,
    rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 8
  }));
  let f = 0;
  (function step() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.rotSpeed;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
    });
    if (++f < 40) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, cvs.width, cvs.height);
  })();
}

function updateLiveClock() {
  const now = new Date();
  $('current-day-badge').textContent = DAYS[now.getDay()].toUpperCase();
  $('live-time-badge').textContent = `🕒 ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;
}

// Initialization
function init() {
  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.tab-btn, .tab-pane').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    $(`pane-${btn.dataset.tab}`)?.classList.add('active');
    if (btn.dataset.tab === 'simulator') renderSimulator();
    if (btn.dataset.tab === 'timetable') renderTimetable();
  }));

  const adjustInputs = (dAtt = 0, dHeld = 0) => {
    if (dAtt || dHeld) {
      $('attended').value = Math.max(0, (parseInt($('attended').value, 10) || 0) + dAtt);
      $('total').value = Math.max(parseInt($('attended').value, 10), (parseInt($('total').value, 10) || 0) + dHeld);
    } else if (parseInt($('attended').value, 10) > parseInt($('total').value, 10)) {
      $('total').value = $('attended').value;
    }
    updateUI();
    syncFormToSubject();
  };

  $('attended').addEventListener('input', () => adjustInputs());
  $('total').addEventListener('input', () => adjustInputs());
  $('subject-name').addEventListener('input', () => syncSubjectFromName(false));
  $('subject-name').addEventListener('change', () => syncSubjectFromName(true));

  $('btn-attended-plus').addEventListener('click', () => adjustInputs(1, 0));
  $('btn-attended-minus').addEventListener('click', () => adjustInputs(-1, 0));
  $('btn-total-plus').addEventListener('click', () => adjustInputs(0, 1));
  $('btn-total-minus').addEventListener('click', () => adjustInputs(0, -1));

  $('btn-log-present').addEventListener('click', () => { adjustInputs(1, 1); throwConfetti(); showToast('✅ Logged +1 Present', 'success'); });
  $('btn-log-absent').addEventListener('click', () => { adjustInputs(0, 1); showToast('⚠️ Logged +1 Absent', 'warning'); });

  $('target-slider').addEventListener('input', e => { setPill(e.target.value); updateUI(); syncFormToSubject(); });
  $$('.pills .pill').forEach(pill => pill.addEventListener('click', () => { $('target-slider').value = pill.dataset.val; setPill(pill.dataset.val); updateUI(); syncFormToSubject(); }));

  $('btn-reset').addEventListener('click', () => {
    $('calc-form').reset();
    $('target-slider').value = 75;
    setPill(75);
    curSyncedId = null;
    updateSyncBadge('');
    updateUI();
    showToast('↺ Reset to 0');
  });

  $('btn-save-subject').addEventListener('click', () => {
    const name = $('subject-name').value.trim() || 'New Subject';
    $('subject-name').value = name;
    syncFormToSubject();
    showToast(`💾 Saved "${name}" to subjects!`, 'success');
  });

  $('btn-copy').addEventListener('click', () => {
    const res = calc($('attended').value, $('total').value, $('target-slider').value);
    const n = $('subject-name').value.trim() || 'Attendance';
    navigator.clipboard.writeText(`📊 *${n}*: ${res.att}/${res.held} (${res.pctFmt}%) | Target: ${res.target}%\n${res.isSafe ? `🌴 Can skip: ${res.skippable} class(es)` : `🚨 Need to attend: ${res.recover} class(es)`}\n⚡ Attandie`).then(() => showToast('📋 Copied to clipboard!', 'success'));
  });

  $('btn-share').addEventListener('click', () => {
    const res = calc($('attended').value, $('total').value, $('target-slider').value);
    const n = $('subject-name').value.trim() || 'Attendance';
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`📊 *${n}*: ${res.att}/${res.held} (${res.pctFmt}%)\n${res.isSafe ? `Can skip: ${res.skippable} class(es)!` : `Need to attend next ${res.recover} classes!`}`)}`, '_blank');
  });

  $('btn-mark-all-today').addEventListener('click', () => {
    const dateKey = getDateKey();
    const slots = timetable.filter(t => t.day.toLowerCase() === getToday().toLowerCase());
    if (!slots.length) return showToast('No classes scheduled today!', 'info');
    let count = 0;
    slots.forEach(slot => {
      const key = `${dateKey}_${slot.id}`;
      const prev = dailyLogs[key];
      if (prev !== 'present') {
        const sub = getOrAddSubject(slot.subject);
        if (prev === 'absent') {
          sub.attended += 1; // already counted in held
        } else {
          // was cancelled or unlogged
          sub.attended += 1;
          sub.held += 1;
        }
        dailyLogs[key] = 'present';
        count++;
      }
    });
    saveData();
    throwConfetti();
    showToast(`⚡ Marked ${count || 'all'} classes as present!`, 'success');
  });

  $('btn-mark-all-cancelled')?.addEventListener('click', () => {
    const dateKey = getDateKey();
    const slots = timetable.filter(t => t.day.toLowerCase() === getToday().toLowerCase());
    if (!slots.length) return showToast('No classes scheduled today!', 'info');
    slots.forEach(slot => {
      const key = `${dateKey}_${slot.id}`;
      const prev = dailyLogs[key];
      const sub = getOrAddSubject(slot.subject);
      if (prev === 'present') {
        sub.attended = Math.max(0, sub.attended - 1);
        sub.held = Math.max(0, sub.held - 1);
      } else if (prev === 'absent') {
        sub.held = Math.max(0, sub.held - 1);
      }
      dailyLogs[key] = 'cancelled';
    });
    saveData();
    showToast(`🌴 Marked today's schedule as Cancelled / Day Off (0 penalty)`, 'info');
  });

  // Modals
  $('btn-add-subject').addEventListener('click', () => { $('modal-id').value = ''; $('modal-form').reset(); $('modal-title').textContent = 'Add Subject'; $('modal-subject').showModal(); });
  $('btn-empty-add').addEventListener('click', () => $('btn-add-subject').click());
  $('modal-close').addEventListener('click', () => $('modal-subject').close());
  $('modal-cancel').addEventListener('click', () => $('modal-subject').close());

  $('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('modal-id').value, name = $('modal-name').value.trim();
    const attended = parseInt($('modal-attended').value, 10) || 0;
    const held = parseInt($('modal-held').value, 10) || 0;
    const target = parseFloat($('modal-target').value) || 75;
    if (!name) return;

    if (id) {
      const idx = subjects.findIndex(s => s.id === id);
      if (idx !== -1) subjects[idx] = { id, name, attended, held, target };
    } else {
      subjects.push({ id: String(Date.now()), name, attended, held, target });
    }
    saveData();
    if ($('subject-name').value.trim().toLowerCase() === name.toLowerCase()) {
      $('attended').value = attended; $('total').value = held; $('target-slider').value = target;
      setPill(target); updateUI(); updateSyncBadge(`⚡ Synced: ${name} (${attended}/${held})`, 'tag-green');
    }
    $('modal-subject').close();
    showToast(`💾 Saved ${name}`, 'success');
  });

  $('modal-slot-close').addEventListener('click', () => $('modal-slot').close());
  $('modal-slot-cancel').addEventListener('click', () => $('modal-slot').close());

  $('modal-slot-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = $('modal-slot-id').value, day = $('slot-day').value, sub = $('slot-subject').value.trim();
    const time = $('slot-time').value.trim(), room = $('slot-room').value.trim();
    if (!sub) return;

    if (id) {
      const idx = timetable.findIndex(x => x.id === id);
      if (idx !== -1) timetable[idx] = { id, day, subject: sub, time, room };
    } else {
      timetable.push({ id: 't_' + Date.now(), day, subject: sub, time, room });
    }
    getOrAddSubject(sub);
    saveData();
    $('modal-slot').close();
    showToast(`💾 Saved slot for ${day}`, 'success');
  });

  $('btn-sim-sync').addEventListener('click', () => { renderSimulator(); showToast('🔄 Synced'); });

  $('btn-clear').addEventListener('click', () => {
    if (confirm('Clear all data and reset to defaults?')) {
      localStorage.clear();
      subjects = []; timetable = []; dailyLogs = {};
      $('calc-form').reset();
      saveData();
      updateUI();
      showToast('🗑️ Cleared all data');
    }
  });

  // Boot
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
  saveData();

  const saved = store('attandie_state');
  if (saved) {
    $('subject-name').value = saved.subject || '';
    $('attended').value = saved.attended || 0;
    $('total').value = saved.held || 0;
    $('target-slider').value = saved.target || 75;
    setPill(saved.target || 75);
    syncSubjectFromName(true);
  } else {
    updateUI();
  }
}

document.addEventListener('DOMContentLoaded', init);
