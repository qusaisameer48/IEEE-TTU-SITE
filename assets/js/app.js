// ===== IEEE SPORTS TOURNAMENT 2026 — VERSION A — SCRIPT =====

// ===== CURSOR =====
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});

// ===== LOADER =====
let lp = 0;
const lf = document.getElementById('loaderFill');
const li = setInterval(() => {
  lp += Math.random() * 15;
  if (lp >= 100) {
    lp = 100;
    lf.style.width = '100%';
    clearInterval(li);
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
      setTimeout(() => document.getElementById('loader').remove(), 500);
    }, 300);
  }
  lf.style.width = lp + '%';
}, 80);

// ===== STATE =====
let selectedSport  = null;
let isIEEEMember   = true;
let isCaptain      = false;
let understoodRules = false;

// ===== SPORT DATA =====
const sportData = {
  badminton: {
    emoji: '🏸', ar: 'ريشة', en: 'BADMINTON', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨👩', text: 'مسموح للذكور والإناث' },
      { icon: '📋', text: 'نظام المباريات: إقصائي مباشر' },
      { icon: '🏸', text: 'يُلعب بريشة بدمنتون رسمية ومضرب قياسي' },
    ]
  },
  football: {
    emoji: '⚽', ar: 'كرة القدم', en: 'FOOTBALL', type: 'team',
    rules: [
      { icon: '👥', text: 'كل لاعب يسجل <strong>بشكل منفصل</strong> ويكتب اسم فريقه' },
      { icon: '⭐', text: 'يجب تحديد <strong>كابتن الفريق</strong> عند التسجيل' },
      { icon: '🔢', text: 'داخل الملعب: <strong>5 لاعبين</strong> · الحد الأقصى للفريق: <strong>8 لاعبين</strong>' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '🏫', text: 'يجب أن يكون جميع أعضاء الفريق من <strong>نفس الجامعة</strong>' },
    ]
  },
  basketball: {
    emoji: '🏀', ar: 'كرة السلة', en: 'BASKETBALL', type: 'team',
    rules: [
      { icon: '👥', text: 'كل لاعب يسجل <strong>بشكل منفصل</strong> ويكتب اسم فريقه' },
      { icon: '⭐', text: 'يجب تحديد <strong>كابتن الفريق</strong> عند التسجيل' },
      { icon: '🔢', text: 'عدد اللاعبين داخل الملعب: <strong>3 لاعبين</strong>' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '🏫', text: 'يجب أن يكون جميع أعضاء الفريق من <strong>نفس الجامعة</strong>' },
    ]
  },
  chess: {
    emoji: '♟️', ar: 'شطرنج', en: 'CHESS', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨👩', text: 'مسموح للذكور والإناث' },
      { icon: '⚠️', text: 'الحد الأقصى: <strong>3 مشاركين فقط</strong> من كل جامعة' },
      { icon: '🏆', text: 'نظام المباريات: دوري داخلي ثم إقصائي' },
    ]
  },
  tabletennis: {
    emoji: '🏓', ar: 'تنس الطاولة', en: 'TABLE TENNIS', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '📋', text: 'نظام المباريات: إقصائي مباشر' },
      { icon: '🏓', text: 'يُلعب بمضرب ومريشة بينغ بونغ رسمية' },
    ]
  }
};

const sportNames = {
  badminton:   'ريشة 🏸',
  football:    'كرة القدم ⚽',
  basketball:  'كرة السلة 🏀',
  chess:       'شطرنج ♟️',
  tabletennis: 'تنس الطاولة 🏓'
};

// ===== NAVIGATION =====
function goTo(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const id = n === 35 ? 'page35' : 'page' + n;
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== IEEE TOGGLE =====
function toggleIEEE() {
  isIEEEMember = !isIEEEMember;
  document.getElementById('toggleSw').classList.toggle('on', isIEEEMember);
  document.getElementById('toggleLabel').textContent = isIEEEMember ? 'نعم، أنا عضو IEEE' : 'لا، لست عضوًا';
  document.getElementById('ieeeField').classList.toggle('show', isIEEEMember);
  const nb = document.getElementById('nonMemberBox');
  if (nb) nb.classList.toggle('show', !isIEEEMember);
}

// ===== SPORT SELECTION =====
function selectSport(sport, el) {
  document.querySelectorAll('.sport-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSport = sport;
  el.style.outline = '3px solid var(--yellow)';
  setTimeout(() => el.style.outline = '', 200);
}

// ===== CAPTAIN TOGGLE =====
function toggleCaptain() {
  isCaptain = !isCaptain;
  document.getElementById('captainSw').classList.toggle('on', isCaptain);
}

// ===== UNDERSTOOD CHECKBOX =====
function toggleUnderstood() {
  understoodRules = !understoodRules;
  document.getElementById('checkBox').classList.toggle('checked', understoodRules);
  document.getElementById('checkBox').textContent = understoodRules ? '✓' : '';
  const btn = document.getElementById('rulesGoBtn');
  btn.disabled      = !understoodRules;
  btn.style.opacity = understoodRules ? '1' : '0.5';
  btn.style.cursor  = understoodRules ? 'pointer' : 'not-allowed';
}

// ===== BUILD RULES PAGE =====
function buildRules() {
  const d = sportData[selectedSport];

  document.getElementById('rulesHeader').innerHTML = `
    <span class="rules-emoji-big">${d.emoji}</span>
    <div class="rules-sport-title">${d.ar}</div>
    <div class="rules-sport-en">${d.en}</div>
  `;

  const typeLabel = d.type === 'team'
    ? '<span class="rules-team-type type-team">🏅 رياضة جماعية</span>'
    : '<span class="rules-team-type type-solo">👤 رياضة فردية</span>';

  const items = d.rules
    .map(r => `<div class="rule-item"><span class="ri">${r.icon}</span><span>${r.text}</span></div>`)
    .join('');

  document.getElementById('rulesCard').innerHTML = `
    <div class="rules-section">
      <div class="rules-section-title">⚡ نوع الرياضة</div>
      ${typeLabel}
      ${d.type === 'team' ? '<div class="captain-badge">⭐ يلزم تحديد كابتن الفريق عند التسجيل</div>' : ''}
    </div>
    <div class="rules-section">
      <div class="rules-section-title">📋 شروط التسجيل</div>
      <div class="rules-items">${items}</div>
    </div>
  `;

  // Reset checkbox each time
  understoodRules = false;
  document.getElementById('checkBox').classList.remove('checked');
  document.getElementById('checkBox').textContent = '';
  const btn = document.getElementById('rulesGoBtn');
  btn.disabled = true;
  btn.style.opacity = '0.5';
  btn.style.cursor  = 'not-allowed';
}

// ===== SHOW / HIDE TEAM SECTION =====
function updateTeamSection() {
  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';
  document.getElementById('teamSection').style.display = isTeam ? 'block' : 'none';
}

// ===== VALIDATE PAGE 2 =====
function validateP2() {
  if (!isIEEEMember) {
    document.getElementById('nonMemberBox').classList.add('show');
    return;
  }

  const uni = document.getElementById('university').value;
  const sid = document.getElementById('studentId').value.trim();
  let ok = true;

  if (!uni) {
    document.getElementById('uniError').classList.add('show');
    document.getElementById('university').classList.add('error');
    ok = false;
  } else {
    document.getElementById('uniError').classList.remove('show');
    document.getElementById('university').classList.remove('error');
  }

  if (!sid) {
    document.getElementById('sidError').classList.add('show');
    document.getElementById('studentId').classList.add('error');
    ok = false;
  } else {
    document.getElementById('sidError').classList.remove('show');
    document.getElementById('studentId').classList.remove('error');
  }

  if (ok) goTo(3);
}

// ===== VALIDATE PAGE 3 =====
function validateP3() {
  if (!selectedSport) {
    document.getElementById('sportsGrid').style.outline = '3px solid red';
    setTimeout(() => document.getElementById('sportsGrid').style.outline = '', 1000);
    return;
  }
  buildRules();
  goTo(35);
}

// ===== VALIDATE UNDERSTOOD =====
function validateUnderstood() {
  if (!understoodRules) return;
  updateTeamSection();
  goTo(4);
}

// ===== VALIDATE PAGE 4 =====
function validateP4() {
  const checks = [
    { id: 'firstName', err: 'fnError',    fn: v => v.trim() !== '' },
    { id: 'lastName',  err: 'lnError',    fn: v => v.trim() !== '' },
    { id: 'email',     err: 'emailError', fn: v => v.includes('@') && v.trim() !== '' },
    { id: 'phone',     err: 'phoneError', fn: v => v.trim().length >= 7 },
    { id: 'year',      err: 'yearError',  fn: v => v !== '' },
    { id: 'gender',    err: 'genderError',fn: v => v !== '' },
  ];

  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';
  if (isTeam) checks.push({ id: 'teamName', err: 'teamNameError', fn: v => v.trim() !== '' });

  let ok = true;
  checks.forEach(({ id, err, fn }) => {
    const val  = document.getElementById(id).value;
    const pass = fn(val);
    document.getElementById(err).classList.toggle('show', !pass);
    document.getElementById(id).classList.toggle('error', !pass);
    if (!pass) ok = false;
  });

  if (ok) submitForm();
}

// ===== SUBMIT =====
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwCCCPDhruUno4accpabHUPSYxjLgCPp6Ih5WfTechk4Gd62ZLFpm5ZkbpSeX2Q5wKL/exec'; // ← حط URL هون

async function submitForm() {
  const g = id => document.getElementById(id).value;
  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';

  // ===== جمع البيانات =====
  const payload = {
    firstName:  g('firstName'),
    lastName:   g('lastName'),
    university: g('university'),
    studentId:  g('studentId'),
    ieeeId:     g('ieeeId') || '—',
    sport:      sportNames[selectedSport],
    teamName:   isTeam ? g('teamName') : '—',
    isCaptain:  isTeam ? (isCaptain ? 'نعم' : 'لا') : '—',
    email:      g('email'),
    phone:      g('phone'),
    year:       g('year'),
    gender:     g('gender'),
  };

  // ===== إرسال لـ Google Sheets =====
  try {
await fetch(SHEET_URL, {
  method: 'POST',
  mode: 'no-cors',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});
  } catch (err) {
    console.error('خطأ في الحفظ:', err);
  }

  // ===== باقي الكود زي ما هو =====
  const teamRow = isTeam
    ? `<div class="sum-row"><span class="sl">اسم الفريق</span><span class="sv">${payload.teamName}</span></div>
       <div class="sum-row"><span class="sl">الكابتن</span><span class="sv">${payload.isCaptain}</span></div>`
    : '';

  document.getElementById('summaryCard').innerHTML = `
    <div class="sum-row"><span class="sl">الاسم</span>        <span class="sv">${payload.firstName} ${payload.lastName}</span></div>
    <div class="sum-row"><span class="sl">الجامعة</span>      <span class="sv">${payload.university}</span></div>
    <div class="sum-row"><span class="sl">الرقم الجامعي</span><span class="sv">${payload.studentId}</span></div>
    <div class="sum-row"><span class="sl">الرياضة</span>      <span class="sv">${payload.sport}</span></div>
    ${teamRow}
    <div class="sum-row"><span class="sl">رقم IEEE</span>     <span class="sv">${payload.ieeeId}</span></div>
    <div class="sum-row"><span class="sl">البريد</span>       <span class="sv" dir="ltr">${payload.email}</span></div>
    <div class="sum-row"><span class="sl">الهاتف</span>       <span class="sv" dir="ltr">${payload.phone}</span></div>
    <div class="sum-row"><span class="sl">السنة</span>        <span class="sv">${payload.year}</span></div>
  `;

  goTo(5);
  launchConfetti();
}

// ===== RESET =====
function resetAll() {
  const ids = ['university','studentId','ieeeId','firstName','lastName','email','phone','year','gender','teamName'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  selectedSport   = null;
  isIEEEMember    = true;
  isCaptain       = false;
  understoodRules = false;

  document.getElementById('toggleSw').classList.add('on');
  document.getElementById('toggleLabel').textContent = 'نعم، أنا عضو IEEE';
  document.getElementById('ieeeField').classList.add('show');
  document.getElementById('nonMemberBox').classList.remove('show');
  document.getElementById('captainSw').classList.remove('on');
  document.querySelectorAll('.sport-card').forEach(c => c.classList.remove('selected'));

  goTo(1);
}

// ===== CONFETTI =====
function launchConfetti() {
  const c    = document.getElementById('confetti');
  const cols = ['#FFD700','#00FFFF','#FF69B4','#FF0000','#FFA500','#fff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      const s = Math.random() * 10 + 6;
      p.style.cssText = `
        position: absolute;
        width: ${s}px; height: ${s}px;
        background: ${cols[Math.floor(Math.random() * cols.length)]};
        left: ${Math.random() * 100}%; top: -10px;
        border-radius: ${Math.random() > .5 ? '50%' : '0'};
        animation: confettiFall ${Math.random() * 2 + 1.5}s linear forwards;
        transform: rotate(${Math.random() * 360}deg);
      `;
      c.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }, i * 60);
  }
}