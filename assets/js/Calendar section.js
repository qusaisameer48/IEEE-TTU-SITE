const events = [
  {
    date: '2026-02-15',
    title: 'BackEnd Workshop',
    location: 'Google meet',
    description: 'Learn basics of BackEnd programming',
    registerLink: 'https://forms.gle/AnKKtiDB37xdnHQY8'
  },
  {
    date: '2026-03-02',
    title: 'Ramadan Iftar Female',
    location: 'University Campus',
    description: 'Ramadan Iftar gathering for female students',
    registerLink: 'https://forms.gle/AnKKtiDB37xdnHQY8'
  },
  {
    date: '2026-03-03',
    title: 'Ramadan Iftar Male',
    location: 'University Campus',
    description: 'Ramadan Iftar gathering for male students',
    registerLink: 'https://forms.gle/AnKKtiDB37xdnHQY8'
  }
];

// Current date state
let currentDate = new Date();
let selectedDate = null;

// Initialize calendar
function initCalendar() {
  renderCalendar();
  renderUpcomingEvents();
}

// Render calendar days - معدل لعرض الشهر الحالي فقط
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update month/year display
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';
  
  // خلايا فارغة قبل بداية الشهر
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty-day';
    calendarDays.appendChild(emptyCell);
  }
  
  // أيام الشهر الحالي فقط
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasEvent = events.some(event => event.date === dateStr);
    
    const dayEl = createDayElement(day, '', isToday, hasEvent, dateStr);
    calendarDays.appendChild(dayEl);
  }
}

// Create day element
function createDayElement(day, className = '', isToday = false, hasEvent = false, dateStr = '') {
  const dayEl = document.createElement('div');
  dayEl.className = 'calendar-day';
  if (className) dayEl.classList.add(className);
  if (isToday) dayEl.classList.add('today');
  if (hasEvent) dayEl.classList.add('has-event');
  dayEl.textContent = day;
  
  if (dateStr) {
    dayEl.onclick = () => selectDate(dateStr, dayEl);
  }
  
  return dayEl;
}

// Select date
function selectDate(dateStr, element) {
  document.querySelectorAll('.calendar-day.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  element.classList.add('selected');
  selectedDate = dateStr;
  
  renderEventsForDate(dateStr);
}

// Render events for specific date
function renderEventsForDate(dateStr) {
  const dayEvents = events.filter(event => event.date === dateStr);
  const eventsList = document.getElementById('eventsList');
  
  if (dayEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="no-events">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <p>No events on this date</p>
      </div>
    `;
  } else {
    eventsList.innerHTML = dayEvents.map(event => createEventHTML(event)).join('');
  }
}

// Render upcoming events
function renderUpcomingEvents() {
  const today = new Date();
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);
  
  const eventsList = document.getElementById('eventsList');
  
  if (upcomingEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="no-events">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <p>No upcoming events</p>
      </div>
    `;
  } else {
    eventsList.innerHTML = upcomingEvents.map(event => createEventHTML(event)).join('');
  }
}

// Create event HTML
function createEventHTML(event) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const registerButton = event.registerLink ? `
    <a href="${event.registerLink}" target="_blank" class="event-register-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      Register Now
    </a>
  ` : '';
  
  return `
    <div class="event-item">
      <div class="event-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        ${formattedDate}
      </div>
      <div class="event-title">${event.title}</div>
      <div class="event-location">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        ${event.location}
      </div>
      ${registerButton}
    </div>
  `;
}

// Navigation functions
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initCalendar);