// ===== IEEE SPORTS TOURNAMENT 2026 — MAIN JS =====

// ===== CUSTOM CURSOR =====
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

// ===== LOADING SCREEN =====
let loadProgress = 0;
const loaderFill = document.getElementById('loaderFill');
const loaderInterval = setInterval(() => {
  loadProgress += Math.random() * 15;
  if (loadProgress >= 100) {
    loadProgress = 100;
    loaderFill.style.width = '100%';
    clearInterval(loaderInterval);
    setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
      setTimeout(() => document.getElementById('loader').remove(), 500);
    }, 300);
  }
  loaderFill.style.width = loadProgress + '%';
}, 80);

// ===== STATE =====
let selectedSport = null;
let isIEEEMember = false;

const sportNames = {
  badminton:   'ريشة 🏸',
  football:    'كرة القدم ⚽',
  basketball:  'كرة السلة 🏀',
  chess:       'شطرنج ♟️',
  tabletennis: 'تنس الطاولة 🏓'
};

// ===== PAGE NAVIGATION =====
function goToPage(num) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page' + num).classList.add('active');
  window.scrollTo(0, 0);
}

// ===== IEEE TOGGLE =====
function toggleIEEE() {
  isIEEEMember = !isIEEEMember;
  const sw    = document.getElementById('toggleSwitch');
  const label = document.getElementById('toggleLabel');
  const field = document.getElementById('ieeeIdField');
  sw.classList.toggle('on', isIEEEMember);
  label.textContent = isIEEEMember ? 'نعم، أنا عضو IEEE' : 'لا، لست عضوًا';
  field.classList.toggle('show', isIEEEMember);
}

// ===== SPORT SELECTION =====
function selectSport(sport, el) {
  document.querySelectorAll('.sport-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSport = sport;
  // Visual flash feedback
  el.style.outline = '3px solid var(--yellow)';
  setTimeout(() => el.style.outline = '', 200);
}

// ===== VALIDATION HELPERS =====
function showError(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
}

function markInput(id, hasError) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle('error', hasError);
  }
}

// ===== PAGE 2 VALIDATION =====
function validatePage2() {
  const uni = document.getElementById('university').value;
  const sid = document.getElementById('studentId').value.trim();
  let valid = true;

  if (!uni) {
    showError('uniError', true);
    markInput('university', true);
    valid = false;
  } else {
    showError('uniError', false);
    markInput('university', false);
  }

  if (!sid) {
    showError('studentIdError', true);
    markInput('studentId', true);
    valid = false;
  } else {
    showError('studentIdError', false);
    markInput('studentId', false);
  }

  if (valid) goToPage(3);
}

// ===== PAGE 3 VALIDATION =====
function validatePage3() {
  if (!selectedSport) {
    const grid = document.getElementById('sportsGrid');
    grid.style.outline = '3px solid var(--red)';
    grid.style.borderRadius = '8px';
    setTimeout(() => { grid.style.outline = ''; }, 1000);

    const msg = document.createElement('div');
    msg.textContent = '⚠ الرجاء اختيار رياضة!';
    msg.style.cssText = `
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: red;
      text-align: center;
      margin-top: 10px;
      animation: fadeInOut 2s forwards;
    `;
    document.querySelector('#page3 .page3-content').appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
    return;
  }
  goToPage(4);
}

// ===== PAGE 4 VALIDATION =====
function validatePage4() {
  const fields = [
    { id: 'firstName', errId: 'firstNameError', check: v => v.trim() !== '' },
    { id: 'lastName',  errId: 'lastNameError',  check: v => v.trim() !== '' },
    { id: 'email',     errId: 'emailError',     check: v => v.includes('@') && v.trim() !== '' },
    { id: 'phone',     errId: 'phoneError',     check: v => v.trim().length >= 7 },
    { id: 'year',      errId: 'yearError',      check: v => v !== '' },
    { id: 'gender',    errId: 'genderError',    check: v => v !== '' },
  ];

  let valid = true;
  fields.forEach(({ id, errId, check }) => {
    const val = document.getElementById(id).value;
    const ok  = check(val);
    showError(errId, !ok);
    markInput(id, !ok);
    if (!ok) valid = false;
  });

  if (valid) submitForm();
}

// ===== FORM SUBMISSION =====
function submitForm() {
  const get = id => document.getElementById(id).value;
  const uni       = get('university');
  const sid       = get('studentId');
  const firstName = get('firstName');
  const lastName  = get('lastName');
  const email     = get('email');
  const phone     = get('phone');
  const year      = get('year');
  const ieeeId    = isIEEEMember ? (get('ieeeId') || 'N/A') : 'غير عضو';

  const summaryCard = document.getElementById('summaryCard');
  summaryCard.innerHTML = `
    <div class="summary-row"><span class="s-label">الاسم</span>      <span class="s-value">${firstName} ${lastName}</span></div>
    <div class="summary-row"><span class="s-label">الجامعة</span>    <span class="s-value">${uni}</span></div>
    <div class="summary-row"><span class="s-label">الرقم الجامعي</span><span class="s-value">${sid}</span></div>
    <div class="summary-row"><span class="s-label">الرياضة</span>    <span class="s-value">${sportNames[selectedSport]}</span></div>
    <div class="summary-row"><span class="s-label">عضوية IEEE</span> <span class="s-value">${ieeeId}</span></div>
    <div class="summary-row"><span class="s-label">البريد</span>     <span class="s-value" dir="ltr">${email}</span></div>
    <div class="summary-row"><span class="s-label">الهاتف</span>     <span class="s-value" dir="ltr">${phone}</span></div>
    <div class="summary-row"><span class="s-label">السنة</span>      <span class="s-value">${year}</span></div>
  `;

  goToPage(5);
  launchConfetti();
}

// ===== RESET =====
function resetForm() {
  const ids = ['university','studentId','ieeeId','firstName','lastName','email','phone','year','gender','notes'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  selectedSport = null;
  isIEEEMember  = false;
  document.getElementById('toggleSwitch').classList.remove('on');
  document.getElementById('toggleLabel').textContent = 'لا، لست عضوًا';
  document.getElementById('ieeeIdField').classList.remove('show');
  document.querySelectorAll('.sport-card').forEach(c => c.classList.remove('selected'));
  goToPage(1);
}

// ===== CONFETTI =====
function launchConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#FFD700','#00FFFF','#FF69B4','#FF0000','#FFA500','#FFFFFF'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const piece = document.createElement('div');
      const size  = Math.random() * 10 + 6;
      piece.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confettiFall ${Math.random() * 2 + 1.5}s linear forwards;
        transform: rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }, i * 60);
  }
}