const API_URL = '/api';

// ─── AUTHENTICATION & INITIALIZATION ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user'));

    // Real-time date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Protect dashboard pages
    const path = window.location.pathname;
    const isDashboard = path.includes('dashboard.html');
    const isAdminDashboard = path.includes('admin-dashboard.html');
    const isProfDashboard = path.includes('professor-dashboard.html');

    if (isDashboard || isAdminDashboard || isProfDashboard) {
        if (!token) {
            window.location.href = 'index.html';
        } else {
            // Check role authorization for specific dashboards
            if (isAdminDashboard && user.role !== 'admin') window.location.href = 'index.html';
            if (isProfDashboard && user.role !== 'professor') window.location.href = 'index.html';
            if (isDashboard && !isAdminDashboard && !isProfDashboard && user.role !== 'student') window.location.href = 'index.html';
            
            initDashboard(user);
        }
    }

    // Role-based redirect if on login page
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
        if (token && user) {
            redirectByRole(user.role);
        }
    }
});

function redirectByRole(role) {
    if (role === 'admin') window.location.href = 'admin-dashboard.html';
    else if (role === 'professor') window.location.href = 'professor-dashboard.html';
    else window.location.href = 'dashboard.html';
}

function logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function showNotify(message, type = 'success') {
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    }).fire({ icon: type, title: message });
}

function toggleLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.toggle('hidden');
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────
let notifOpen = false;
let notifPollInterval = null;

function getNotifIcon(type) {
    const icons = {
        message: '<i class="fas fa-envelope" style="color:var(--secondary)"></i>',
        event:   '<i class="fas fa-calendar-alt" style="color:var(--primary)"></i>',
        course:  '<i class="fas fa-book-open" style="color:var(--accent)"></i>',
        grade:   '<i class="fas fa-chart-bar" style="color:#f59e0b"></i>',
        general: '<i class="fas fa-bell" style="color:var(--text-secondary)"></i>'
    };
    return icons[type] || icons.general;
}

function getNotifTypeLabel(type) {
  const labels = {
    message: 'New message received',
    event: 'New event published',
    course: 'New course available',
    grade: 'Grade updated',
    general: 'Notification'
  };
  return labels[type] || 'Notification';
}

async function loadNotifications() {
  try {
    const res = await apiFetch('/notifications');
    if (!res || !res.ok) return;
    const notifs = await res.json();

    const unread = notifs.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = unread > 0 ? 'block' : 'none';
    }

    const list = document.getElementById('notifList');
    if (!list) return;

    if (notifs.length === 0) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash me-2"></i>No notifications yet</div>';
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick(${n.id}, '${n.type}')">
        <div class="notif-icon">${getNotifIcon(n.type)}</div>
        <div class="notif-body">
          <div class="notif-title">${n.title || getNotifTypeLabel(n.type)}</div>
          <p class="notif-msg">${n.message || ''}</p>
          <span class="notif-time">${new Date(n.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Notification load error:', e);
  }
}

async function handleNotifClick(notifId, type) {
  await apiFetch(`/notifications/read/${notifId}`, { method: 'PUT' });

  if (type === 'message') {
    const mailTab = document.querySelector('[onclick*="mailboxSection"]');
    if(mailTab) switchStudentSection('mailboxSection', mailTab);
    else switchAdminTab('mailboxSection', document.querySelector('[onclick*="mailboxSection"]'));
  } else if (type === 'event') {
    switchStudentSection('studentEvents', document.querySelector('[onclick*="studentEvents"]'));
  } else if (type === 'course') {
    switchStudentSection('studentCourses', document.querySelector('[onclick*="studentCourses"]'));
  }

  await loadNotifications();
  document.getElementById('notifDropdown').style.display = 'none';
  notifOpen = false;
}

async function markAllNotifsRead() {
  await apiFetch('/notifications/read-all', { method: 'PUT' });
  await loadNotifications();
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  if (!dropdown) return;
  notifOpen = !notifOpen;
  dropdown.style.display = notifOpen ? 'block' : 'none';
  if (notifOpen) loadNotifications();
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.notif-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.style.display = 'none';
    notifOpen = false;
  }
});

function startNotifPolling() {
  loadNotifications();
  notifPollInterval = setInterval(loadNotifications, 30000);
}
// ─── END NOTIFICATION SYSTEM ─────────────────────────────────────

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.landing-nav');
    if (nav) {
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    }
});

// Global API Fetch Helper with 401 handling
async function apiFetch(endpoint, options = {}) {
    const token = sessionStorage.getItem('token');
    
    // Set default headers
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    // If body is FormData, delete Content-Type entirely so the browser can set
    // the correct multipart/form-data boundary automatically.
    // If body is not FormData and no Content-Type set, default to JSON.
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    } else if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        
        if (response.status === 401) {
            console.warn('Session expired or unauthorized. Logging out...');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = 'index.html';
            return null;
        }
        
        return response;
    } catch (err) {
        console.error('Fetch error:', err);
        showNotify('Server connection failed', 'error');
        throw err;
    }
}


async function confirmAction(title, text) {
    const result = await Swal.fire({
        title, text, icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#ef4444'
    });
    return result.isConfirmed;
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                redirectByRole(data.user.role);
            } else {
                showNotify(data.message || 'Invalid credentials', 'error');
            }
        } catch (err) {
            showNotify('Connection error to server', 'error');
        }
    });
}

// ─── DASHBOARD LOGIC ─────────────────────────────────────────────────────────
async function loadUnreadCount() {
    try {
        const res = await apiFetch('/messages/inbox');
        if (!res) return 0;
        const messages = await res.json();
        return messages.filter(m => !m.is_read).length;
    } catch (err) { return 0; }
}

async function initDashboard(user) {
    const hour = new Date().getHours();
    const timeMsg = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const unread = await loadUnreadCount();
    const badge = unread > 0 ? `<span class="badge bg-danger ms-auto rounded-pill">${unread}</span>` : '';

    if (document.getElementById('userNameSidebar')) document.getElementById('userNameSidebar').textContent = user.name;
    if (document.getElementById('userAvatar')) document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    if (document.getElementById('welcomeText')) document.getElementById('welcomeText').textContent = `${timeMsg}, ${user.name.split(' ')[0]}!`;

    const menu = document.getElementById('sidebarMenu');
    if (user.role === 'student') {
        const studentSec = document.getElementById('studentSection');
        if (studentSec) studentSec.classList.remove('hidden');
        if (menu) {
            menu.innerHTML = `
                <li onclick="switchStudentSection('studentOverview', this)" class="active"><i class="fas fa-user"></i> Overview</li>
                <li onclick="switchStudentSection('studentGrades', this)"><i class="fas fa-graduation-cap"></i> My Grades</li>
                <li onclick="switchStudentSection('studentCourses', this)"><i class="fas fa-book"></i> My Courses</li>
                <li onclick="switchStudentSection('studentStudySchedule', this)"><i class="fas fa-calendar-alt"></i> Study Plan</li>
                <li onclick="switchStudentSection('studentExamSchedule', this)"><i class="fas fa-file-alt"></i> Exam Plan</li>
                <li onclick="switchStudentSection('studentEvents', this)"><i class="fas fa-bullhorn"></i> Events</li>
                <li onclick="switchStudentSection('mailboxSection', this)"><i class="fas fa-envelope"></i> Mailbox ${badge}</li>
            `;
        }
        loadStudentData(user);
    }
    else if (user.role === 'professor') {
        const profSec = document.getElementById('professorSection');
        if (profSec) profSec.classList.remove('hidden');
        loadProfessorData();
    }
    else if (user.role === 'admin') {
        const adminSec = document.getElementById('adminSection');
        if (adminSec) adminSec.classList.remove('hidden');
        
        if (menu) {
            menu.innerHTML = `
                <li onclick="switchAdminTab('user-mgmt', this)" class="active"><i class="fas fa-users"></i> Users</li>
                <li onclick="switchAdminTab('event-mgmt', this)"><i class="fas fa-calendar-alt"></i> Events</li>
                <li onclick="switchAdminTab('stats-mgmt', this)"><i class="fas fa-chart-pie"></i> Stats</li>
                <li onclick="window.location.href='payment-management.html'"><i class="fas fa-wallet"></i> Manage Payments</li>
                <li onclick="switchAdminTab('data-mgmt', this)"><i class="fas fa-database"></i> Data</li>
                <li onclick="switchAdminTab('mailboxSection', this)"><i class="fas fa-envelope"></i> Mailbox ${badge}</li>
            `;
        }
        loadAdminData();
    }
}

function updateStudentStats(grades, courses, events) {
    const statsEl = document.getElementById('statsOverview');
    if (!statsEl) return;

    const avg = grades.length > 0 
        ? (grades.reduce((acc, g) => acc + parseFloat(g.note), 0) / grades.length).toFixed(2)
        : 'N/A';
    
    statsEl.innerHTML = `
        <div class="stat-card glass">
            <i class="fas fa-book-open fa-2x mb-2 text-primary"></i>
            <h4>Courses</h4>
            <div class="value">${courses.length}</div>
        </div>
        <div class="stat-card glass">
            <i class="fas fa-star fa-2x mb-2 text-warning"></i>
            <h4>Avg. Grade</h4>
            <div class="value">${avg}/20</div>
        </div>
        <div class="stat-card glass">
            <i class="fas fa-calendar-day fa-2x mb-2 text-success"></i>
            <h4>Events</h4>
            <div class="value">${events.length}</div>
        </div>
    `;
}

function quickMessage(receiverId) {
    showComposeModal();
    setTimeout(() => {
        document.getElementById('msgRecipient').value = receiverId;
        document.getElementById('msgSubject').focus();
    }, 200);
}

function switchStudentSection(sectionId, el) {
    document.querySelectorAll('#studentSection .section-content, #mailboxSection').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('#sidebarMenu li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');
    
    if (sectionId === 'mailboxSection') loadInbox();
}

function switchAdminTab(id, el) {
    // Hide all sections
    document.querySelectorAll('#adminSection .section-content, #mailboxSection')
        .forEach(s => s?.classList.add('hidden'));

    // Show target with re-trigger animation
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        // Re-trigger CSS animation by forcing reflow
        void target.offsetWidth;
        target.style.animation = 'none';
        requestAnimationFrame(() => {
            target.style.animation = '';
        });
    }

    // Update active state
    document.querySelectorAll('#sidebarMenu li').forEach(li => li.classList.remove('active'));
    if (el) el.classList.add('active');

    if (id === 'mailboxSection') loadInbox();
}

// ─── MESSAGING FEATURES ──────────────────────────────────────────────────────
let allRecipients = [];

async function loadInbox() {
    document.getElementById('mailList').classList.remove('hidden');
    document.getElementById('messageView').classList.add('hidden');
    document.querySelectorAll('#mailTabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('#mailTabs button:first-child').classList.add('active');

    const res = await apiFetch('/messages/inbox');
    const messages = await res.json();
    
    renderMailList(messages, 'inbox');
}

async function loadSent() {
    document.getElementById('mailList').classList.remove('hidden');
    document.getElementById('messageView').classList.add('hidden');
    document.querySelectorAll('#mailTabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('#mailTabs button:last-child').classList.add('active');

    const res = await apiFetch('/messages/sent');
    const messages = await res.json();
    
    renderMailList(messages, 'sent');
}

function renderMailList(messages, type) {
    const list = document.getElementById('mailList');
    if (messages.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-muted">No ${type} messages.</div>`;
        return;
    }

    list.innerHTML = messages.map(m => `
        <button class="list-group-item list-group-item-action p-3 ${m.is_read || type === 'sent' ? '' : 'unread fw-bold'}" onclick="viewMessage(${JSON.stringify(m).replace(/"/g, '&quot;')}, '${type}')">
            <div class="d-flex justify-content-between mb-1">
                <span>${type === 'inbox' ? m.sender_name : m.receiver_name}</span>
                <small class="text-muted">${new Date(m.created_at).toLocaleDateString()}</small>
            </div>
            <div class="small text-primary">${m.subject}</div>
            <div class="small text-muted text-truncate">${m.content}</div>
        </button>
    `).join('');
}

async function viewMessage(msg, type) {
    const listView = document.getElementById('mailList');
    const detailView = document.getElementById('messageView');
    
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');

    detailView.innerHTML = `
        <button class="btn btn-sm btn-link mb-3 p-0" onclick="backToMailList('${type}')"><i class="fas fa-arrow-left"></i> Back to ${type}</button>
        <div class="border-bottom pb-3 mb-3">
            <h4 class="mb-1">${msg.subject}</h4>
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${type === 'inbox' ? 'From' : 'To'}:</strong> ${type === 'inbox' ? msg.sender_name : msg.receiver_name} 
                    <span class="text-muted small">&lt;${type === 'inbox' ? msg.sender_email : msg.receiver_email}&gt;</span>
                </div>
                <small class="text-muted">${new Date(msg.created_at).toLocaleString()}</small>
            </div>
        </div>
        <div class="message-body" style="white-space: pre-wrap; line-height: 1.6;">${msg.content}</div>
        ${type === 'inbox' ? `<button class="btn btn-primary mt-4" onclick="replyMessage('${msg.sender_id}', '${msg.subject}', '${msg.sender_name}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
    `;

    if (type === 'inbox' && !msg.is_read) {
        await apiFetch(`/messages/read/${msg.id}`, { method: 'PUT' });
    }
}

function backToMailList(type) {
    if (type === 'inbox') loadInbox();
    else loadSent();
}

async function showComposeModal() {
    const modal = document.getElementById('composeModal');
    modal.classList.remove('hidden');
    
    if (allRecipients.length === 0) {
        const res = await apiFetch('/messages/recipients');
        allRecipients = await res.json();
    }
    
    const select = document.getElementById('msgRecipient');
    select.innerHTML = '<option value="">Select recipient...</option>' + 
        allRecipients.map(r => `<option value="${r.id}">${r.name} (${r.role}) - ${r.email}</option>`).join('');
}

function hideComposeModal() {
    document.getElementById('composeModal').classList.add('hidden');
    document.getElementById('composeForm').reset();
}

function replyMessage(senderId, subject, senderName) {
    showComposeModal();
    setTimeout(() => {
        document.getElementById('msgRecipient').value = senderId;
        document.getElementById('msgSubject').value = `Re: ${subject}`;
        document.getElementById('msgContent').focus();
    }, 100);
}

const composeForm = document.getElementById('composeForm');
if (composeForm) {
    composeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            receiver_id: document.getElementById('msgRecipient').value,
            subject: document.getElementById('msgSubject').value,
            content: document.getElementById('msgContent').value
        };

        const res = await apiFetch('/messages/send', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showNotify('Message sent!');
            hideComposeModal();
            loadSent();
        } else {
            showNotify('Error sending message', 'error');
        }
    });
}

// ─── STUDENT FEATURES ────────────────────────────────────────────────────────
async function loadStudentData(user) {
    try {
        const [grades, courses, events, studySchedule, examSchedule, profile] = await Promise.all([
            apiFetch('/student/grades').then(r => r ? r.json() : []),
            apiFetch('/student/courses').then(r => r ? r.json() : []),
            apiFetch('/student/events').then(r => r ? r.json() : []),
            apiFetch('/student/schedule?type=study').then(r => r ? r.json() : []),
            apiFetch('/student/schedule?type=exam').then(r => r ? r.json() : []),
            apiFetch('/student/profile').then(r => r ? r.json() : null)
        ]);

        // Profile Display
        if (profile) {
            if (document.getElementById('studentDeptDisplay')) document.getElementById('studentDeptDisplay').textContent = profile.department;
            if (document.getElementById('studentGroupDisplay')) document.getElementById('studentGroupDisplay').textContent = profile.group_name;
        } else if (courses.length > 0) {
            const dept = courses[0].department || 'General';
            if (document.getElementById('studentDeptDisplay')) document.getElementById('studentDeptDisplay').textContent = dept;
        }
        if (document.getElementById('studentEmailDisplay')) document.getElementById('studentEmailDisplay').textContent = user.email;

        updateStudentStats(grades, courses, events);

        // Grades table
        const gTable = document.querySelector('#gradesTable tbody');
        if (gTable) {
            gTable.innerHTML = grades.length > 0 ? grades.map(g => `
                <tr><td>${g.module}</td><td>${g.note}</td><td><span class="badge ${g.note >= 10 ? 'bg-success' : 'bg-danger'}">${g.note >= 10 ? 'Valid' : 'Retake'}</span></td></tr>
            `).join('') : '<tr><td colspan="3" class="text-center">No grades recorded yet.</td></tr>';
        }

        // Study Schedule
        const sTable = document.querySelector('#scheduleTable tbody');
        if (sTable) {
            sTable.innerHTML = studySchedule.length > 0 ? studySchedule.map(s => `
                <tr><td>${s.day}</td><td>${s.time}</td><td>${s.module}</td></tr>
            `).join('') : '<tr><td colspan="3" class="text-center">No study plan available.</td></tr>';
        }

        // Exam Schedule
        const eSTable = document.querySelector('#examScheduleTable tbody');
        if (eSTable) {
            eSTable.innerHTML = examSchedule.length > 0 ? examSchedule.map(e => `
                <tr><td>${e.day}</td><td>${e.time}</td><td>${e.module}</td></tr>
            `).join('') : '<tr><td colspan="3" class="text-center">No exams scheduled.</td></tr>';
        }

        // Courses & Email Prof
        const cList = document.getElementById('studentCoursesList');
        if (cList) {
            cList.innerHTML = courses.length > 0 ? courses.map(c => `
                <div class="course-item glass p-3 mb-2">
                    <h5>${c.title}</h5>
                    <p class="mb-1">Prof: ${c.professor_name}</p>
                    <div class="d-flex gap-2">
                        <a href="${c.file_path}" target="_blank" class="btn btn-sm btn-primary">View Materials</a>
                        <button onclick="quickMessage(${c.professor_id})" class="btn btn-sm btn-outline-secondary"><i class="fas fa-envelope"></i> Message Prof</button>
                    </div>
                </div>
            `).join('') : '<p class="text-center w-100">No courses assigned to your department.</p>';
        }

        // Events & Plans
        const eList = document.getElementById('eventsContainer');
        if (eList) {
            eList.innerHTML = events.length > 0 ? events.map(e => `
                <div class="event-card glass p-3 mb-2">
                    <span class="badge bg-info">${e.type.replace('_', ' ')}</span>
                    <h6>${e.title}</h6>
                    <p class="small text-muted">${new Date(e.date).toLocaleDateString()}</p>
                    <p>${e.description || ''}</p>
                    ${e.file_path ? `<a href="${e.file_path}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">Download Plan</a>` : ''}
                </div>
            `).join('') : '<p class="text-center w-100">No upcoming events or plans.</p>';
        }
    } catch (err) { console.error('Student data error:', err); }
}

// ─── PROFESSOR FEATURES ──────────────────────────────────────────────────────
async function loadProfessorData() {
    const token = sessionStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const res = await apiFetch('/professor/students');
        if (!res) return;
        const students = await res.json();

        
        const selectors = document.querySelectorAll('#studentSelect, #attnStudentSelect');
        const options = '<option value="">Select Student</option>' + students.map(s => `<option value="${s.id}">${s.name} (${s.group_name})</option>`).join('');
        selectors.forEach(s => s.innerHTML = options);
    } catch (err) { console.error('Prof data error:', err); }
}

// ─── ADMIN FEATURES ──────────────────────────────────────────────────────────
async function loadAdminData() {
    const token = sessionStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // Load Users
        const usersRes = await apiFetch('/admin/users');
        if (!usersRes) return;
        const users = await usersRes.json();

        const uTable = document.querySelector('#usersTable tbody');
        if (uTable) {
            uTable.innerHTML = users.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="badge bg-secondary">${u.role}</span></td>
                    <td>
                        <div class="input-group input-group-sm" style="max-width: 150px;">
                            <input type="password" class="form-control border-0 bg-transparent" value="${u.raw_password || '********'}" readonly id="pwd-${u.id}">
                            <button class="btn btn-outline-secondary border-0" type="button" onclick="togglePwdVisibility(${u.id})">
                                <i class="fas fa-eye" id="eye-${u.id}"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex gap-1">
                            <button onclick="quickMessage(${u.id})" class="btn btn-sm btn-info text-white" title="Message User"><i class="fas fa-envelope"></i></button>
                            <button onclick="deleteUser(${u.id})" class="btn btn-sm btn-danger" title="Delete User"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Load Events for Admin
        const eventsRes = await apiFetch('/events');
        if (eventsRes) {
            const events = await eventsRes.json();
            const eTable = document.querySelector('#eventsListTable tbody');
            if (eTable) {
                eTable.innerHTML = events.map(e => `
                    <tr>
                        <td>${e.title}</td>
                        <td>${e.type}</td>
                        <td>${new Date(e.date).toLocaleDateString()}</td>
                        <td><button onclick="deleteEvent(${e.id})" class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button></td>
                    </tr>
                `).join('');
            }
        }

        // Load School Data
        const gradesRes = await apiFetch('/admin/grades');
        const attendanceRes = await apiFetch('/admin/attendance');
        
        if (gradesRes && attendanceRes) {
            const grades = await gradesRes.json();
            const attendance = await attendanceRes.json();

            const gList = document.getElementById('recentGradesList');
            if (gList) gList.innerHTML = grades.slice(0, 10).map(g => `<p class="small border-bottom mb-1"><b>${g.student_name}</b>: ${g.note} (${g.module})</p>`).join('');
            
            const aList = document.getElementById('recentAttendanceList');
            if (aList) aList.innerHTML = attendance.slice(0, 10).map(a => `<p class="small border-bottom mb-1"><b>${a.student_name}</b>: <span class="text-${a.status === 'absent' ? 'danger' : 'warning'}">${a.status}</span> (${a.module})</p>`).join('');
        }

        const statsRes = await apiFetch('/admin/stats');
        if (statsRes) {
            const stats = await statsRes.json();
            const statsCards = document.getElementById('statsCards');
            if (statsCards) {
                statsCards.innerHTML = `
                    <div class="col-md-4"><div class="stat-card glass p-3 text-center"><h4>Users</h4><div class="h2">${stats.users}</div></div></div>
                    <div class="col-md-4"><div class="stat-card glass p-3 text-center"><h4>Courses</h4><div class="h2">${stats.courses}</div></div></div>
                `;
            }
        }
    } catch (err) { console.error('Admin data error:', err); }
}

// ─── ADMIN ACTIONS ───────────────────────────────────────────────────────────
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('userName').value,
            role: document.getElementById('userRole').value,
            group_name: document.getElementById('userGroup').value,
            department: document.getElementById('userDept').value,
            password: document.getElementById('userPassword').value
        };

        const res = await apiFetch('/admin/add-user', {
            method: 'POST',
            body: JSON.stringify(payload)
        });


        if (res.ok) {
            const data = await res.json();
            
            // Display credentials in the new modal with guards
            const roleEl = document.getElementById('cred-role');
            if (roleEl) roleEl.textContent = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
            
            const emailEl = document.getElementById('cred-email');
            if (emailEl) emailEl.textContent = data.user.email;
            
            const pwdEl = document.getElementById('cred-password');
            if (pwdEl) pwdEl.textContent = data.user.password;
            
            document.getElementById('credentialModal').classList.remove('hidden');
            
            hideAddUserForm();
            loadAdminData();
            addUserForm.reset();
            const previewBox = document.getElementById('emailPreviewBox');
            if (previewBox) previewBox.classList.add('d-none');
        } else {
            const errorData = await res.json();
            Swal.fire({
                title: 'Operation Failed',
                text: errorData.message || 'Error creating user',
                icon: 'error'
            });
        }
    });
}

const eventForm = document.getElementById('eventForm');
if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', document.getElementById('eventTitle').value);
        formData.append('type', document.getElementById('eventType').value);
        formData.append('date', document.getElementById('eventDate').value);
        formData.append('description', document.getElementById('eventDescription').value);
        
        const fileInput = document.getElementById('planFile');
        if (fileInput.files.length > 0) {
            formData.append('planFile', fileInput.files[0]);
        }

        const res = await apiFetch('/events', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': undefined } // Let browser set boundary
        });
        
        // Fix for FormData: delete the Content-Type we added in apiFetch
        // (Handled automatically if body is FormData in modern fetch, 
        // but we need to ensure our helper doesn't force JSON)


        if (res.ok) {
            showNotify('Posted successfully!');
            e.target.reset();
            loadAdminData();
        } else {
            showNotify('Error posting event', 'error');
        }
    });
}

async function deleteUser(id) {
    if (await confirmAction('Delete User?', 'This action cannot be undone.')) {
        const res = await apiFetch(`/admin/delete-user/${id}`, {
            method: 'DELETE'
        });
        if (res && res.ok) { loadAdminData(); showNotify('User deleted'); }
    }
}

async function deleteEvent(id) {
    if (await confirmAction('Delete Event?', 'This will remove the plan/event.')) {
        const res = await apiFetch(`/events/${id}`, {
            method: 'DELETE'
        });
        if (res && res.ok) { loadAdminData(); showNotify('Deleted'); }
    }
}


function showAddUserForm() { 
    document.getElementById('addUserModal').classList.remove('hidden'); 
    toggleGroupInput(); // Initial state
}

function hideAddUserForm() { 
    document.getElementById('addUserModal').classList.add('hidden'); 
}

function toggleGroupInput() {
    const role = document.getElementById('userRole').value;
    const groupWrapper = document.getElementById('groupInputWrapper');
    const deptWrapper = document.getElementById('deptWrapper');
    
    // Group is only for students
    if (groupWrapper) groupWrapper.style.display = role === 'student' ? 'block' : 'none';
    
    // Department is for students and professors
    if (deptWrapper) deptWrapper.style.display = (role === 'student' || role === 'professor') ? 'block' : 'none';
}

function previewEmail() {
    const name = document.getElementById('userName').value.trim();
    const role = document.getElementById('userRole').value;
    const previewBox = document.getElementById('emailPreviewBox');
    const previewText = document.getElementById('emailPreviewText');

    if (!name) {
        previewBox.classList.add('d-none');
        return;
    }

    const nameParts = name.toLowerCase().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
    
    let academicEmail;
    if (role === 'professor') {
        academicEmail = `${firstName}.${lastName}.prof@eemci.edu.ma`;
    } else if (role === 'student') {
        academicEmail = `${firstName}.${lastName}@eemci.edu.ma`;
    } else {
        academicEmail = `${firstName}.${lastName}.admin@eemci.com`;
    }

    previewText.textContent = academicEmail;
    previewBox.classList.remove('d-none');
}

async function copyCredField(id) {
    const text = document.getElementById(id).textContent;
    try {
        await navigator.clipboard.writeText(text);
        showNotify('Copied to clipboard!');
    } catch (err) {
        // Fallback for non-https/unsupported browsers
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotify('Copied!');
    }
}

function togglePwdVisibility(id) {
    const pwdInput = document.getElementById(`pwd-${id}`);
    const eyeIcon = document.getElementById(`eye-${id}`);
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// ─── THEME TOGGLE ─────────────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('eemci-theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function initTheme() {
  const saved = localStorage.getItem('eemci-theme') || 'dark';
  applyTheme(saved);
}
// ─── END THEME TOGGLE ─────────────────────────────────────────────────────
