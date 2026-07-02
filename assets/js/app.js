// ===== AUDIO ENGINE =====
const AC = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type = 'square', duration = 0.08, vol = 0.3) {
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain);
  gain.connect(AC.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, AC.currentTime);
  gain.gain.setValueAtTime(vol, AC.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + duration);
  osc.start(AC.currentTime);
  osc.stop(AC.currentTime + duration);
}

const SFX = {
  click:  () => playTone(440, 'square', 0.06, 0.2),
  wakka:  () => { playTone(600, 'square', 0.07, 0.25); setTimeout(() => playTone(400, 'square', 0.07, 0.25), 80); },
  select: () => { playTone(300,'square',0.05,0.2); setTimeout(()=>playTone(500,'square',0.05,0.2),60); setTimeout(()=>playTone(700,'square',0.08,0.2),120); },
  tick:   () => playTone(800, 'sine', 0.05, 0.15),
  next:   () => { playTone(350,'square',0.06,0.2); setTimeout(()=>playTone(500,'square',0.06,0.2),70); setTimeout(()=>playTone(650,'square',0.08,0.2),140); },
  error:  () => { playTone(200,'sawtooth',0.1,0.3); setTimeout(()=>playTone(150,'sawtooth',0.1,0.3),120); },
  win:    () => { const n=[523,659,784,1047]; n.forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.15,0.3),i*130)); }
};

function playStartupJingle() {
  const melody = [
    {f:220,t:0,d:0.12},{f:277,t:130,d:0.12},{f:330,t:260,d:0.12},
    {f:440,t:390,d:0.18},{f:392,t:540,d:0.10},{f:440,t:650,d:0.10},{f:523,t:760,d:0.25}
  ];
  melody.forEach(({f,t,d}) => setTimeout(() => playTone(f,'square',d,0.22), t));
  setTimeout(() => { playTone(1047,'sine',0.06,0.3); setTimeout(()=>playTone(784,'sine',0.12,0.3),70); }, 1050);
}

// ===== CURSOR =====
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});

// ===== LOADER =====
const loaderMessages = ['LOADING GAME DATA...','SPAWNING PLAYERS...','CALIBRATING TURRETS...','PRESS START!'];
let msgIdx = 0;
const loaderTextEl = document.querySelector('.loader-text');
let lp = 0;
const lf = document.getElementById('loaderFill');
const li = setInterval(() => {
  lp += Math.random() * 15;
  const newIdx = Math.min(Math.floor(lp / 26), 3);
  if (newIdx !== msgIdx) {
    msgIdx = newIdx;
    loaderTextEl.textContent = loaderMessages[msgIdx];
    playTone([300,400,500,600][msgIdx], 'square', 0.05, 0.15);
  }
  if (lp >= 100) {
    lp = 100;
    lf.style.width = '100%';
    clearInterval(li);
    loaderTextEl.textContent = 'PRESS START!';
    playStartupJingle();
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
      setTimeout(() => document.getElementById('loader').remove(), 500);
    }, 1400);
  }
  lf.style.width = lp + '%';
}, 80);

// ===== STATE =====
let selectedSport   = null;
let isIEEEMember    = true;
let isCaptain       = false;
let understoodRules = false;
let isSubmitting    = false;

// ===== SPORT DATA =====
const sportData = {
  badminton: {
    emoji: '🏸', ar: 'ريشة', en: 'BADMINTON', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '📋', text: 'نظام المباريات: خروج المغلوب' },
    ]
  },
  football: {
    emoji: '⚽', ar: 'كرة القدم', en: 'FOOTBALL', type: 'team',
    rules: [
      { icon: '👥', text: 'كل لاعب يسجل <strong>بشكل منفصل</strong> ويكتب اسم فريقه' },
      { icon: '⭐', text: 'يجب تحديد <strong>كابتن الفريق</strong> عند التسجيل' },
      { icon: '🔢', text: 'يجب أن يتكوّن الفريق من <strong>8 لاعبين</strong> فقط' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '🏫', text: 'جميع أعضاء الفريق من <strong>نفس الجامعة</strong>' },
    ]
  },
  basketball: {
    emoji: '🏀', ar: 'كرة السلة', en: 'BASKETBALL', type: 'team',
    rules: [
      { icon: '👥', text: 'كل لاعب يسجل <strong>بشكل منفصل</strong> ويكتب اسم فريقه' },
      { icon: '⭐', text: 'يجب تحديد <strong>كابتن الفريق</strong> عند التسجيل' },
      { icon: '🔢', text: 'عدد اللاعبين داخل الملعب: <strong>3 لاعبين</strong>' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '🏫', text: 'جميع أعضاء الفريق من <strong>نفس الجامعة</strong>' },
    ]
  },
  chess: {
    emoji: '♟️', ar: 'شطرنج', en: 'CHESS', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨👩', text: 'مسموح للذكور والإناث' },
      { icon: '⚠️', text: 'الحد الأقصى: <strong>3 مشاركين</strong> من كل جامعة' },
      { icon: '📋', text: 'نظام المباريات: خروج المغلوب' },
      { icon: '🏫', text: 'جميع أعضاء الفريق من <strong>نفس الجامعة</strong>' },
    ]
  },
  tabletennis: {
    emoji: '🏓', ar: 'تنس الطاولة', en: 'TABLE TENNIS', type: 'solo',
    rules: [
      { icon: '👤', text: 'التسجيل <strong>فردي</strong> — كل مشارك يسجل بياناته بشكل مستقل' },
      { icon: '👨', text: 'مخصص للذكور فقط' },
      { icon: '📋', text: 'نظام المباريات: خروج المغلوب' },
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
  SFX.next();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const id = n === 35 ? 'page35' : 'page' + n;
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== IEEE TOGGLE =====
function toggleIEEE() {
  AC.resume();
  SFX.tick();
  isIEEEMember = !isIEEEMember;
  document.getElementById('toggleSw').classList.toggle('on', isIEEEMember);
  document.getElementById('toggleLabel').textContent = isIEEEMember ? 'نعم، أنا عضو IEEE' : 'لا، لست عضوًا';
  document.getElementById('ieeeField').classList.toggle('show', isIEEEMember);
  const nb = document.getElementById('nonMemberBox');
  if (nb) nb.classList.toggle('show', !isIEEEMember);
}

function selectSport(sport, el) {
  // رياضات مكتملة — popup مباشرة
  const fullSports = {
    badminton:   'الريشة الطائرة 🏸',
  };
  if (fullSports[sport]) {
    AC.resume();
    SFX.error();
    showFullPopup(fullSports[sport]);
    return;
  }
 
  SFX.select();
  document.querySelectorAll('.sport-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSport = sport;
  el.style.outline = '3px solid var(--yellow)';
  setTimeout(() => el.style.outline = '', 200);
}

function showFullPopup(sportName) {
  const nameEl = document.getElementById('fullPopupSportName'); // لازم يكون فيه عنصر بهاد الـ id بالـ HTML
  if (nameEl) nameEl.textContent = sportName;
  document.getElementById('fullPopup').classList.add('show');
}

function closeFullPopup() {
  document.getElementById('fullPopup').classList.remove('show');
}

// ===== CAPTAIN TOGGLE =====
function toggleCaptain() {
  AC.resume();
  SFX.tick();
  isCaptain = !isCaptain;
  document.getElementById('captainSw').classList.toggle('on', isCaptain);
}

// ===== UNDERSTOOD CHECKBOX =====
function toggleUnderstood() {
  AC.resume();
  SFX.tick();
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
  const items = d.rules.map(r => `
    <div class="rule-item">
      <span class="ri">${r.icon}</span>
      <span>${r.text}</span>
    </div>
  `).join('');
  document.getElementById('rulesCard').innerHTML = `
    <div class="rules-section">
      <div class="rules-section-title" style="font-size:15px;">⚡ نوع الرياضة</div>
      ${typeLabel}
    </div>
    <div class="rules-section">
      <div class="rules-section-title">📋 شروط التسجيل</div>
      <div class="rules-items">${items}</div>
    </div>
  `;
  understoodRules = false;
  document.getElementById('checkBox').classList.remove('checked');
  document.getElementById('checkBox').textContent = '';
  const btn = document.getElementById('rulesGoBtn');
  btn.disabled = true;
  btn.style.opacity = '0.5';
  btn.style.cursor = 'not-allowed';
}

// ===== SHOW / HIDE TEAM SECTION =====
function updateTeamSection() {
  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';
  document.getElementById('teamSection').style.display = isTeam ? 'block' : 'none';
}

// ===== VALIDATE PAGE 2 =====
function validateP2() {
  AC.resume();
  if (!isIEEEMember) {
    SFX.error();
    document.getElementById('nonMemberBox').classList.add('show');
    return;
  }

  let ok = true;

  // IEEE ID validation
  const ieeeId = document.getElementById('ieeeId').value.trim();
  if (!ieeeId) {
    document.getElementById('ieeeIdError').classList.add('show');
    document.getElementById('ieeeId').classList.add('error');
    ok = false;
  } else {
    document.getElementById('ieeeIdError').classList.remove('show');
    document.getElementById('ieeeId').classList.remove('error');
  }

  const uni = document.getElementById('university').value;
  const sid = document.getElementById('studentId').value.trim();

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

  if (!ok) {
    SFX.error();
  } else {
    goTo(3);
  }
}

// ===== VALIDATE PAGE 3 =====
function validateP3() {
  AC.resume();
  if (!selectedSport) {
    SFX.error();
    document.getElementById('sportsGrid').style.outline = '3px solid red';
    setTimeout(() => document.getElementById('sportsGrid').style.outline = '', 1000);
    return;
  }
  buildRules();
  goTo(35);
}

// ===== VALIDATE UNDERSTOOD =====
function validateUnderstood() {
  AC.resume();
  if (!understoodRules) { SFX.error(); return; }
  updateTeamSection();
  goTo(4);
}

// ===== VALIDATE PAGE 4 =====
function validateP4() {
  AC.resume();
  const checks = [
    { id: 'firstName', err: 'fnError',    fn: v => v.trim() !== '' },
    { id: 'lastName',  err: 'lnError',    fn: v => v.trim() !== '' },
    { id: 'phone',     err: 'phoneError', fn: v => v.trim().length >= 7 },
  ];
  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';
  if (isTeam) {
    checks.push({ id: 'teamName', err: 'teamNameError', fn: v => v.trim() !== '' });
  }
  let ok = true;
  checks.forEach(({ id, err, fn }) => {
    const val  = document.getElementById(id).value;
    const pass = fn(val);
    document.getElementById(err).classList.toggle('show', !pass);
    document.getElementById(id).classList.toggle('error', !pass);
    if (!pass) ok = false;
  });
  if (!ok) { SFX.error(); return; }
  submitForm();
}

// ===== SUBMIT =====
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwCCCPDhruUno4accpabHUPSYxjLgCPp6Ih5WfTechk4Gd62ZLFpm5ZkbpSeX2Q5wKL/exec';

async function submitForm() {
  if (isSubmitting) return;
  isSubmitting = true;
  const g = id => document.getElementById(id).value;
  const isTeam = selectedSport === 'football' || selectedSport === 'basketball';
  const payload = {
    firstName:  g('firstName'),
    lastName:   g('lastName'),
    university: g('university'),
    studentId:  g('studentId'),
    ieeeId:     g('ieeeId') || '—',
    sport:      sportNames[selectedSport],
    teamName:   isTeam ? g('teamName') : '—',
    isCaptain:  isTeam ? (isCaptain ? 'نعم' : 'لا') : '—',
    phone:      g('phone'),
  };
  fetch(SHEET_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => console.error('خطأ في الحفظ:', err));
  isSubmitting = false;
  const teamRow = isTeam ? `
    <div class="sum-row"><span class="sl">اسم الفريق</span><span class="sv">${payload.teamName}</span></div>
    <div class="sum-row"><span class="sl">الكابتن</span><span class="sv">${payload.isCaptain}</span></div>
  ` : '';
  document.getElementById('summaryCard').innerHTML = `
    <div class="sum-row"><span class="sl">الاسم</span><span class="sv">${payload.firstName} ${payload.lastName}</span></div>
    <div class="sum-row"><span class="sl">الجامعة</span><span class="sv">${payload.university}</span></div>
    <div class="sum-row"><span class="sl">الرقم الجامعي</span><span class="sv">${payload.studentId}</span></div>
    <div class="sum-row"><span class="sl">الرياضة</span><span class="sv">${payload.sport}</span></div>
    ${teamRow}
    <div class="sum-row"><span class="sl">رقم IEEE</span><span class="sv">${payload.ieeeId}</span></div>
    <div class="sum-row"><span class="sl">الهاتف</span><span class="sv" dir="ltr">${payload.phone}</span></div>
  `;
  SFX.win();
  goTo(5);
  launchConfetti();
}

// ===== RESET =====
function resetAll() {
  AC.resume();
  SFX.click();
  ['university','studentId','ieeeId','firstName','lastName','phone','teamName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  selectedSport   = null;
  isIEEEMember    = true;
  isCaptain       = false;
  understoodRules = false;
  isSubmitting    = false;
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
  const c = document.getElementById('confetti');
  const cols = ['#FFD700','#00FFFF','#FF69B4','#FF0000','#FFA500','#fff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      const s = Math.random() * 10 + 6;
      p.style.cssText = `
        position:absolute;width:${s}px;height:${s}px;
        background:${cols[Math.floor(Math.random()*cols.length)]};
        left:${Math.random()*100}%;top:-10px;
        border-radius:${Math.random()>.5?'50%':'0'};
        animation:confettiFall ${Math.random()*2+1.5}s linear forwards;
        transform:rotate(${Math.random()*360}deg);
      `;
      c.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }, i * 60);
  }
}