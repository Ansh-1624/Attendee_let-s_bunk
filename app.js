// Attandie — Attendance & Weekly Routine Calculator

const STORAGE_KEY = 'attandie_state';
const MULTI_KEY = 'attandie_subjects';
const TIMETABLE_KEY = 'attandie_timetable';
const LOGS_KEY = 'attandie_daily_logs';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEMO_SUBJECTS = [
  { id: '1', name: 'Data Structures & Algorithms', attended: 26, held: 28, target: 75 },
  { id: '2', name: 'Computer Systems & OS', attended: 18, held: 24, target: 75 },
  { id: '3', name: 'Database Management', attended: 21, held: 30, target: 75 },
  { id: '4', name: 'Linear Algebra', attended: 22, held: 25, target: 80 }
];

const DEMO_TIMETABLE = [
  { id: 't1', day: 'Monday', subject: 'Data Structures & Algorithms', time: '09:30 AM', room: 'Lab 1' },
  { id: 't2', day: 'Monday', subject: 'Computer Systems & OS', time: '11:30 AM', room: 'Hall 2' },
  { id: 't3', day: 'Monday', subject: 'Database Management', time: '02:00 PM', room: 'Room 304' },
  { id: 't4', day: 'Tuesday', subject: 'Linear Algebra', time: '09:30 AM', room: 'Hall 1' },
  { id: 't5', day: 'Tuesday', subject: 'Data Structures & Algorithms', time: '11:30 AM', room: 'Lab 1' },
  { id: 't6', day: 'Tuesday', subject: 'Computer Systems & OS', time: '02:00 PM', room: 'Room 201' },
  { id: 't7', day: 'Wednesday', subject: 'Database Management', time: '09:30 AM', room: 'Room 304' },
  { id: 't8', day: 'Wednesday', subject: 'Linear Algebra', time: '11:30 AM', room: 'Hall 1' },
  { id: 't9', day: 'Wednesday', subject: 'Computer Systems & OS', time: '02:00 PM', room: 'Lab 2' },
  { id: 't10', day: 'Thursday', subject: 'Data Structures & Algorithms', time: '09:30 AM', room: 'Lab 1' },
  { id: 't11', day: 'Thursday', subject: 'Linear Algebra', time: '11:30 AM', room: 'Hall 1' },
  { id: 't12', day: 'Thursday', subject: 'Database Management', time: '02:00 PM', room: 'Room 304' },
  { id: 't13', day: 'Friday', subject: 'Computer Systems & OS', time: '09:30 AM', room: 'Hall 2' },
  { id: 't14', day: 'Friday', subject: 'Data Structures & Algorithms', time: '11:30 AM', room: 'Lab 1' },
  { id: 't15', day: 'Friday', subject: 'Database Management', time: '02:00 PM', room: 'Room 304' },
  { id: 't16', day: 'Saturday', subject: 'Linear Algebra', time: '10:00 AM', room: 'Tutorial Room' }
];

// Core DOM Elements
const attendedInput = document.getElementById('attended');
const totalInput = document.getElementById('total');
const subjectNameInput = document.getElementById('subject-name');
const targetSlider = document.getElementById('target-slider');
const targetDisplay = document.getElementById('target-display');
const pills = document.querySelectorAll('.pills .pill');

const verdictBanner = document.getElementById('verdict-banner');
const verdictTag = document.getElementById('verdict-tag');
const verdictIcon = document.getElementById('verdict-icon');
const verdictSubtitle = document.getElementById('verdict-subtitle');
const verdictTitle = document.getElementById('verdict-title');
const verdictText = document.getElementById('verdict-text');
const pctDisplay = document.getElementById('pct-display');
const progressBar = document.getElementById('progress-bar');
const targetLine = document.getElementById('target-line');
const marginText = document.getElementById('margin-text');

const statAttended = document.getElementById('stat-attended');
const statHeld = document.getElementById('stat-held');
const statMissed = document.getElementById('stat-missed');
const statTarget = document.getElementById('stat-target');

const hintAttended = document.getElementById('hint-attended-pct');
const hintMissed = document.getElementById('hint-missed');

let subjects = [];
let timetable = [];
let dailyLogs = {};

// Helpers
const getTodayName = () => {
  const day = DAYS[new Date().getDay()];
  return day === 'Sunday' ? 'Monday' : day;
};

const getTodayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Math Calculation Engine
function calculate(attended, held, target) {
  attended = Math.max(0, parseInt(attended, 10) || 0);
  held = Math.max(0, parseInt(held, 10) || 0);
  target = Math.max(1, Math.min(99, parseFloat(target) || 75));

  if (attended > held) held = attended;

  const missed = held - attended;
  const pct = held === 0 ? 100 : (attended / held) * 100;
  const isSafe = pct >= target;
  const diff = Math.abs(pct - target).toFixed(1);

  let skippable = 0;
  let recover = 0;

  if (held > 0) {
    if (isSafe) {
      skippable = Math.max(0, Math.floor((100 * attended - target * held) / target));
    } else {
      recover = Math.max(0, Math.ceil((target * held - 100 * attended) / (100 - target)));
    }
  }

  return { attended, held, missed, target, pct, pctFormatted: pct.toFixed(1), isSafe, diff, skippable, recover };
}

// Single Calculator UI
function updateUI() {
  const res = calculate(attendedInput.value, totalInput.value, targetSlider.value);

  hintAttended.textContent = `${res.pctFormatted}%`;
  hintMissed.textContent = `Missed: ${res.missed}`;
  targetDisplay.textContent = `${res.target}%`;

  statAttended.textContent = res.attended;
  statHeld.textContent = res.held;
  statMissed.textContent = res.missed;
  statTarget.textContent = `${res.target}%`;

  pctDisplay.textContent = `${res.pctFormatted}%`;
  progressBar.style.width = `${Math.min(100, Math.max(0, res.pct))}%`;
  targetLine.style.left = `${res.target}%`;
  targetLine.querySelector('.target-badge').textContent = `${res.target}%`;

  const subject = subjectNameInput.value.trim() ? `in ${subjectNameInput.value.trim()}` : '';

  if (res.held === 0) {
    verdictBanner.className = 'verdict-banner state-edge';
    verdictTag.textContent = 'NO CLASSES';
    verdictIcon.textContent = '🚀';
    verdictSubtitle.textContent = 'SEMESTER START';
    verdictTitle.innerHTML = `No classes held yet ${subject}`;
    verdictText.textContent = 'Attend upcoming classes to build your attendance buffer.';
    progressBar.style.background = 'var(--yellow)';
    marginText.textContent = '0 classes';
  } else if (res.isSafe) {
    progressBar.style.background = 'var(--green)';
    marginText.textContent = `Safe by +${res.diff}%`;
    marginText.style.color = '#059669';

    if (res.skippable === 0) {
      verdictBanner.className = 'verdict-banner state-edge';
      verdictTag.textContent = 'ON THE EDGE';
      verdictIcon.textContent = '⚠️';
      verdictSubtitle.textContent = 'CRITICAL MARGIN';
      verdictTitle.innerHTML = `Cannot skip any classes ${subject}`;
      verdictText.textContent = `You are right on your ${res.target}% target line.`;
    } else {
      verdictBanner.className = 'verdict-banner state-safe';
      verdictTag.textContent = 'SAFE TO BUNK';
      verdictIcon.textContent = '😎';
      verdictSubtitle.textContent = 'YOU ARE IN THE CLEAR!';
      verdictTitle.innerHTML = `Can skip <span class="highlight">${res.skippable}</span> class${res.skippable > 1 ? 'es' : ''} ${subject}`;
      verdictText.textContent = `You can safely miss ${res.skippable} consecutive class(es) and remain $\\ge ${res.target}%$.`;
    }
  } else {
    progressBar.style.background = 'var(--pink)';
    marginText.textContent = `Deficit by -${res.diff}%`;
    marginText.style.color = '#dc2626';

    verdictBanner.className = 'verdict-banner state-danger';
    verdictTag.textContent = 'DANGER ZONE';
    verdictIcon.textContent = '🚨';
    verdictSubtitle.textContent = 'ATTENDANCE DEFICIT';
    verdictTitle.innerHTML = `Attend next <span class="highlight" style="background:var(--pink);color:#fff">${res.recover}</span> class${res.recover > 1 ? 'es' : ''} ${subject}`;
    verdictText.textContent = `Must attend the next ${res.recover} consecutive class(es) to bounce back to ${res.target}%.`;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    subject: subjectNameInput.value,
    attended: attendedInput.value,
    held: totalInput.value,
    target: targetSlider.value
  }));
}

function loadSingle() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data) {
      subjectNameInput.value = data.subject || '';
      attendedInput.value = data.attended || 28;
      totalInput.value = data.held || 32;
      targetSlider.value = data.target || 75;
      setPill(data.target || 75);
    }
  } catch (e) {}
  updateUI();
}

// Storage Helpers
function saveSubjects() {
  localStorage.setItem(MULTI_KEY, JSON.stringify(subjects));
  renderSubjects();
  renderTodaySchedule();
}

function loadSubjects() {
  try {
    subjects = JSON.parse(localStorage.getItem(MULTI_KEY)) || DEMO_SUBJECTS;
  } catch (e) {
    subjects = DEMO_SUBJECTS;
  }
  renderSubjects();
}

function saveTimetable() {
  localStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
  renderTimetable();
  renderTodaySchedule();
  updateSuggestions();
}

function loadTimetable() {
  try {
    timetable = JSON.parse(localStorage.getItem(TIMETABLE_KEY)) || DEMO_TIMETABLE;
    dailyLogs = JSON.parse(localStorage.getItem(LOGS_KEY)) || {};
  } catch (e) {
    timetable = DEMO_TIMETABLE;
    dailyLogs = {};
  }
  renderTimetable();
  renderTodaySchedule();
  updateSuggestions();
}

function setPill(val) {
  pills.forEach(p => p.classList.toggle('active', p.dataset.val === String(val)));
}

function updateSuggestions() {
  const list = document.getElementById('subject-suggestions');
  if (list) {
    list.innerHTML = [...new Set(subjects.map(s => s.name))].map(n => `<option value="${n}">`).join('');
  }
}

function getOrAddSubject(name) {
  let sub = subjects.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
  if (!sub) {
    sub = { id: String(Date.now() + Math.random()), name: name.trim(), attended: 0, held: 0, target: 75 };
    subjects.push(sub);
    saveSubjects();
  }
  return sub;
}

// Today's Schedule View
function renderTodaySchedule() {
  const container = document.getElementById('today-slots-container');
  const today = getTodayName();
  const dateKey = getTodayDateKey();

  document.getElementById('current-day-badge').textContent = today.toUpperCase();
  document.getElementById('today-card-title').textContent = `📅 Today's Classes (${today})`;

  const todaySlots = timetable.filter(t => t.day.toLowerCase() === today.toLowerCase());
  document.getElementById('today-class-count').textContent = todaySlots.length;

  if (todaySlots.length === 0) {
    container.innerHTML = `<div class="slot-empty" style="grid-column: 1 / -1;">🎉 No classes scheduled for today (${today})!</div>`;
    return;
  }

  container.innerHTML = todaySlots.map(slot => {
    const log = dailyLogs[`${dateKey}_${slot.id}`];
    const sub = subjects.find(s => s.name.toLowerCase() === slot.subject.toLowerCase()) || { attended: 0, held: 0, target: 75 };
    const res = calculate(sub.attended, sub.held, sub.target);

    const statusTag = log === 'present'
      ? '<span class="mini-tag">✅ Present</span>'
      : log === 'absent'
      ? '<span class="mini-tag tag-pink">❌ Absent</span>'
      : `<span style="font-size:0.75rem;font-family:'Space Mono';color:#666;">Current: ${res.pctFormatted}%</span>`;

    return `
      <div class="today-slot ${log === 'present' ? 'logged-present' : log === 'absent' ? 'logged-absent' : ''}">
        <div>
          <div class="today-slot-top">
            <div>
              <span class="slot-name">${slot.subject}</span>
              <div style="font-size:0.75rem;color:#555;font-family:'Space Mono'">${slot.room || 'Room'}</div>
            </div>
            <span class="slot-time">${slot.time || 'Class'}</span>
          </div>
          <div style="margin-top:4px;">${statusTag}</div>
        </div>
        <div class="btn-group mt-2">
          <button type="button" class="btn btn-sm btn-green" onclick="logTodayClass('${slot.id}', true)">
            ${log === 'present' ? '✓ Present' : '+1 Present'}
          </button>
          <button type="button" class="btn btn-sm btn-pink" onclick="logTodayClass('${slot.id}', false)">
            ${log === 'absent' ? '✕ Absent' : '+1 Absent'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.logTodayClass = function(slotId, isPresent) {
  const slot = timetable.find(t => t.id === slotId);
  if (!slot) return;

  const dateKey = getTodayDateKey();
  const logKey = `${dateKey}_${slotId}`;
  const prev = dailyLogs[logKey];
  const sub = getOrAddSubject(slot.subject);

  if (prev === 'present' && isPresent) return showToast('Already marked present!', 'info');
  if (prev === 'absent' && !isPresent) return showToast('Already marked absent!', 'info');

  if (prev === 'present') sub.attended = Math.max(0, sub.attended - 1);

  if (isPresent) {
    sub.attended += 1;
    if (!prev) sub.held += 1;
    dailyLogs[logKey] = 'present';
    throwConfetti();
    showToast(`✅ +1 Present for ${slot.subject}!`, 'success');
  } else {
    if (!prev) sub.held += 1;
    dailyLogs[logKey] = 'absent';
    showToast(`⚠️ +1 Absent for ${slot.subject}`, 'warning');
  }

  localStorage.setItem(LOGS_KEY, JSON.stringify(dailyLogs));
  saveSubjects();

  if (subjectNameInput.value.trim().toLowerCase() === sub.name.toLowerCase()) {
    attendedInput.value = sub.attended;
    totalInput.value = sub.held;
    updateUI();
  }
};

// Weekly Timetable View
function renderTimetable() {
  const container = document.getElementById('timetable-container');
  if (!container) return;
  const todayName = getTodayName();

  container.innerHTML = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
    const slots = timetable.filter(t => t.day.toLowerCase() === day.toLowerCase());
    const isToday = day.toLowerCase() === todayName.toLowerCase();

    const slotsHTML = slots.length === 0
      ? `<div class="slot-empty">No classes scheduled</div>`
      : slots.map(s => `
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
      `).join('');

    return `
      <div class="day-card ${isToday ? 'is-today' : ''}" id="day-card-${day}">
        <div class="day-header">
          <h3>${day} ${isToday ? '<span class="tag tag-yellow" style="font-size:0.65rem">TODAY</span>' : ''}</h3>
          <button type="button" class="btn btn-sm btn-ghost" onclick="openAddSlotModal('${day}')">+ Add</button>
        </div>
        <div class="slot-list">${slotsHTML}</div>
      </div>
    `;
  }).join('');
}

window.openAddSlotModal = day => {
  document.getElementById('modal-slot-id').value = '';
  document.getElementById('modal-slot-form').reset();
  document.getElementById('slot-day').value = day;
  document.getElementById('modal-slot-title').textContent = `Add Class Slot (${day})`;
  updateSuggestions();
  document.getElementById('modal-slot').showModal();
};

window.editSlot = id => {
  const slot = timetable.find(t => t.id === id);
  if (!slot) return;
  document.getElementById('modal-slot-id').value = slot.id;
  document.getElementById('slot-day').value = slot.day;
  document.getElementById('slot-subject').value = slot.subject;
  document.getElementById('slot-time').value = slot.time || '';
  document.getElementById('slot-room').value = slot.room || '';
  document.getElementById('modal-slot-title').textContent = 'Edit Slot';
  document.getElementById('modal-slot').showModal();
};

window.deleteSlot = id => {
  const slot = timetable.find(t => t.id === id);
  if (slot && confirm(`Remove "${slot.subject}" from ${slot.day}?`)) {
    timetable = timetable.filter(t => t.id !== id);
    saveTimetable();
    showToast('🗑️ Slot removed');
  }
};

// All Subjects View
function renderSubjects() {
  const container = document.getElementById('subjects-container');
  const emptyState = document.getElementById('empty-state');
  document.getElementById('subject-count').textContent = subjects.length;

  if (subjects.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    updateAggregates();
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = subjects.map(sub => {
    const res = calculate(sub.attended, sub.held, sub.target);
    const tagBg = res.isSafe ? 'var(--green)' : 'var(--pink)';
    const verdictBg = res.isSafe ? 'var(--green-lt)' : 'var(--pink-lt)';
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
            <span class="tag" style="background:${tagBg};color:${res.isSafe ? 'var(--ink)' : '#fff'}">
              ${res.pctFormatted}%
            </span>
          </div>

          <div class="progress-track" style="height:12px;margin:6px 0;">
            <div class="progress-bar" style="width:${Math.min(100, res.pct)}%;background:${res.isSafe ? 'var(--green)' : 'var(--pink)'}"></div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:0.78rem;font-family:'Space Mono';font-weight:700;">
            <span>Attended: ${res.attended}/${res.held}</span>
            <span>Missed: ${res.missed}</span>
          </div>

          <div class="sub-verdict" style="background:${verdictBg}">
            ${vText}
          </div>
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
  let att = 0;
  let held = 0;
  let safe = 0;
  let risk = 0;

  subjects.forEach(s => {
    att += (s.attended || 0);
    held += (s.held || 0);
    if (calculate(s.attended, s.held, s.target).isSafe) safe++;
    else risk++;
  });

  const overall = held === 0 ? 100 : (att / held) * 100;
  document.getElementById('agg-pct').textContent = `${overall.toFixed(1)}%`;
  document.getElementById('agg-safe').textContent = safe;
  document.getElementById('agg-risk').textContent = risk;
  document.getElementById('agg-total').textContent = held;
}

window.logSubject = (id, isPresent) => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  if (isPresent) s.attended += 1;
  s.held += 1;
  saveSubjects();
  showToast(isPresent ? `✅ +1 Present for ${s.name}` : `⚠️ +1 Absent for ${s.name}`, isPresent ? 'success' : 'warning');
};

window.deleteSubject = id => {
  const s = subjects.find(x => x.id === id);
  if (s && confirm(`Delete "${s.name}"?`)) {
    subjects = subjects.filter(x => x.id !== id);
    saveSubjects();
    showToast(`🗑️ Deleted ${s.name}`);
  }
};

window.editSubject = id => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modal-id').value = s.id;
  document.getElementById('modal-name').value = s.name;
  document.getElementById('modal-attended').value = s.attended;
  document.getElementById('modal-held').value = s.held;
  document.getElementById('modal-target').value = s.target;
  document.getElementById('modal-title').textContent = 'Edit Subject';
  document.getElementById('modal-subject').showModal();
};

window.loadIntoCalc = id => {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  subjectNameInput.value = s.name;
  attendedInput.value = s.attended;
  totalInput.value = s.held;
  targetSlider.value = s.target;
  setPill(s.target);
  updateUI();
  document.querySelector('[data-tab="calculator"]').click();
  showToast(`⚡ Loaded ${s.name}`);
};

// Simulator Table
function renderSimulator() {
  const tbody = document.getElementById('sim-tbody');
  const a = parseInt(attendedInput.value, 10) || 0;
  const h = parseInt(totalInput.value, 10) || 0;
  const t = parseFloat(targetSlider.value) || 75;

  tbody.innerHTML = Array.from({ length: 10 }, (_, idx) => {
    const i = idx + 1;
    const att = calculate(a + i, h + i, t);
    const bnk = calculate(a, h + i, t);
    return `
      <tr>
        <td><strong>+${i} class${i > 1 ? 'es' : ''}</strong></td>
        <td class="${att.isSafe ? 'cell-safe' : 'cell-danger'}">${att.pctFormatted}% (${a + i}/${h + i})</td>
        <td class="${bnk.isSafe ? 'cell-safe' : 'cell-danger'}">${bnk.pctFormatted}% (${a}/${h + i})</td>
        <td><span class="mini-tag ${bnk.isSafe ? '' : 'tag-pink'}">${bnk.isSafe ? 'Safe to skip' : 'Need to attend'}</span></td>
      </tr>
    `;
  }).join('');
}

// Toast System
function showToast(msg, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'warning' ? 'toast-warning' : ''}`;
  toast.textContent = msg;
  document.getElementById('toasts').appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

// Confetti Animation
function throwConfetti() {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 40 }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.4,
    size: Math.random() * 8 + 6,
    color: ['#ffe600', '#00f59b', '#ff5470', '#00f0ff', '#121212'][Math.floor(Math.random() * 5)],
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.7) * 14,
    rot: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 8
  }));

  let f = 0;
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rot += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    if (++f < 40) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(step);
}

// Initialization & Event Listeners
function init() {
  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`pane-${btn.dataset.tab}`);
      if (pane) pane.classList.add('active');

      if (btn.dataset.tab === 'simulator') renderSimulator();
      if (btn.dataset.tab === 'timetable') renderTimetable();
    });
  });

  // Mark All Present Today
  document.getElementById('btn-mark-all-today').addEventListener('click', () => {
    const today = getTodayName();
    const dateKey = getTodayDateKey();
    const todaySlots = timetable.filter(t => t.day.toLowerCase() === today.toLowerCase());

    if (todaySlots.length === 0) return showToast('No classes scheduled today!', 'info');

    let count = 0;
    todaySlots.forEach(slot => {
      const logKey = `${dateKey}_${slot.id}`;
      if (dailyLogs[logKey] !== 'present') {
        const sub = getOrAddSubject(slot.subject);
        if (dailyLogs[logKey] === 'absent') {
          sub.attended += 1;
        } else {
          sub.attended += 1;
          sub.held += 1;
        }
        dailyLogs[logKey] = 'present';
        count++;
      }
    });

    localStorage.setItem(LOGS_KEY, JSON.stringify(dailyLogs));
    saveSubjects();
    throwConfetti();
    showToast(`⚡ Marked ${count || 'all'} classes as present!`, 'success');
  });

  // Direct Inputs
  const handleInput = () => {
    if (parseInt(attendedInput.value, 10) > parseInt(totalInput.value, 10)) {
      totalInput.value = attendedInput.value;
    }
    updateUI();
  };

  attendedInput.addEventListener('input', handleInput);
  totalInput.addEventListener('input', handleInput);
  subjectNameInput.addEventListener('input', updateUI);

  // Steppers
  document.getElementById('btn-attended-plus').addEventListener('click', () => {
    attendedInput.value = (parseInt(attendedInput.value, 10) || 0) + 1;
    handleInput();
  });

  document.getElementById('btn-attended-minus').addEventListener('click', () => {
    const v = parseInt(attendedInput.value, 10) || 0;
    if (v > 0) {
      attendedInput.value = v - 1;
      updateUI();
    }
  });

  document.getElementById('btn-total-plus').addEventListener('click', () => {
    totalInput.value = (parseInt(totalInput.value, 10) || 0) + 1;
    updateUI();
  });

  document.getElementById('btn-total-minus').addEventListener('click', () => {
    const t = parseInt(totalInput.value, 10) || 0;
    const a = parseInt(attendedInput.value, 10) || 0;
    if (t > a) {
      totalInput.value = t - 1;
      updateUI();
    }
  });

  // Quick Action Buttons
  document.getElementById('btn-log-present').addEventListener('click', () => {
    attendedInput.value = (parseInt(attendedInput.value, 10) || 0) + 1;
    totalInput.value = (parseInt(totalInput.value, 10) || 0) + 1;
    updateUI();
    throwConfetti();
    showToast('✅ Logged +1 Present', 'success');
  });

  document.getElementById('btn-log-absent').addEventListener('click', () => {
    totalInput.value = (parseInt(totalInput.value, 10) || 0) + 1;
    updateUI();
    showToast('⚠️ Logged +1 Absent', 'warning');
  });

  // Target Slider & Pills
  targetSlider.addEventListener('input', e => {
    setPill(e.target.value);
    updateUI();
  });

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      targetSlider.value = pill.dataset.val;
      setPill(pill.dataset.val);
      updateUI();
    });
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    subjectNameInput.value = '';
    attendedInput.value = 28;
    totalInput.value = 32;
    targetSlider.value = 75;
    setPill(75);
    updateUI();
    showToast('↺ Reset to defaults');
  });

  // Save to Subjects
  document.getElementById('btn-save-subject').addEventListener('click', () => {
    const name = subjectNameInput.value.trim() || 'New Subject';
    const sub = getOrAddSubject(name);
    sub.attended = parseInt(attendedInput.value, 10) || 0;
    sub.held = parseInt(totalInput.value, 10) || 0;
    sub.target = parseFloat(targetSlider.value) || 75;
    saveSubjects();
    showToast(`💾 Saved "${name}" to subjects!`, 'success');
  });

  // Copy & Share
  document.getElementById('btn-copy').addEventListener('click', () => {
    const res = calculate(attendedInput.value, totalInput.value, targetSlider.value);
    const n = subjectNameInput.value.trim() || 'Attendance';
    navigator.clipboard.writeText(`📊 *${n}*: ${res.attended}/${res.held} (${res.pctFormatted}%) | Target: ${res.target}%\n${res.isSafe ? `🌴 Can skip: ${res.skippable} class(es)` : `🚨 Need to attend: ${res.recover} class(es)`}\n⚡ Attandie`).then(() => showToast('📋 Copied to clipboard!', 'success'));
  });

  document.getElementById('btn-share').addEventListener('click', () => {
    const res = calculate(attendedInput.value, totalInput.value, targetSlider.value);
    const n = subjectNameInput.value.trim() || 'Attendance';
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`📊 *${n}*: ${res.attended}/${res.held} (${res.pctFormatted}%)\n${res.isSafe ? `Can skip: ${res.skippable} class(es)!` : `Need to attend next ${res.recover} classes!`}`)}`, '_blank');
  });

  // Subject Modal
  document.getElementById('btn-add-subject').addEventListener('click', () => {
    document.getElementById('modal-id').value = '';
    document.getElementById('modal-form').reset();
    document.getElementById('modal-title').textContent = 'Add Subject';
    document.getElementById('modal-subject').showModal();
  });

  document.getElementById('btn-empty-add').addEventListener('click', () => document.getElementById('btn-add-subject').click());

  document.getElementById('btn-demo').addEventListener('click', () => {
    subjects = JSON.parse(JSON.stringify(DEMO_SUBJECTS));
    saveSubjects();
    showToast('✨ Loaded Demo Subjects', 'success');
  });

  document.getElementById('modal-close').addEventListener('click', () => document.getElementById('modal-subject').close());
  document.getElementById('modal-cancel').addEventListener('click', () => document.getElementById('modal-subject').close());

  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('modal-id').value;
    const name = document.getElementById('modal-name').value.trim();
    const attended = parseInt(document.getElementById('modal-attended').value, 10) || 0;
    const held = parseInt(document.getElementById('modal-held').value, 10) || 0;
    const target = parseFloat(document.getElementById('modal-target').value) || 75;

    if (!name) return;

    if (id) {
      const idx = subjects.findIndex(s => s.id === id);
      if (idx !== -1) subjects[idx] = { id, name, attended, held, target };
    } else {
      subjects.push({ id: String(Date.now()), name, attended, held, target });
    }

    saveSubjects();
    document.getElementById('modal-subject').close();
    showToast(`💾 Saved ${name}`, 'success');
  });

  // Timetable Slot Modal Handlers
  document.getElementById('modal-slot-close').addEventListener('click', () => document.getElementById('modal-slot').close());
  document.getElementById('modal-slot-cancel').addEventListener('click', () => document.getElementById('modal-slot').close());

  document.getElementById('modal-slot-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('modal-slot-id').value;
    const day = document.getElementById('slot-day').value;
    const sub = document.getElementById('slot-subject').value.trim();
    const time = document.getElementById('slot-time').value.trim();
    const room = document.getElementById('slot-room').value.trim();

    if (!sub) return;

    if (id) {
      const idx = timetable.findIndex(x => x.id === id);
      if (idx !== -1) timetable[idx] = { id, day, subject: sub, time, room };
    } else {
      timetable.push({ id: 't_' + Date.now(), day, subject: sub, time, room });
    }

    getOrAddSubject(sub);
    saveTimetable();
    document.getElementById('modal-slot').close();
    showToast(`💾 Saved class slot for ${day}`, 'success');
  });

  document.getElementById('btn-sim-sync').addEventListener('click', () => {
    renderSimulator();
    showToast('🔄 Synced');
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Clear all data and reset to defaults?')) {
      localStorage.clear();
      subjects = [];
      timetable = [];
      dailyLogs = {};
      loadSingle();
      loadSubjects();
      loadTimetable();
      showToast('🗑️ Cleared all data');
    }
  });

  // Boot
  loadSingle();
  loadSubjects();
  loadTimetable();
}

document.addEventListener('DOMContentLoaded', init);
