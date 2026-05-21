/* prof-script.js - Logic for Professor Dashboard */

const API_URL = '/api';
let allStudents = [];
let myCourses = [];
let allRecords = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user'));

    if (!token || user?.role !== 'professor') {
        window.location.href = 'index.html';
        return;
    }

    // Set Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Initialize
    loadProfile();
    loadDashboardData();
    setupDropZone();
    updateUnreadBadge();
});

function logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

function showNotify(title, icon = 'success') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: title,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// ─── UI Navigation ───
function switchTab(clickedLi) {
    const targetId = clickedLi.getAttribute('data-section');
    switchTabById(targetId);
}

// ─── DASHBOARD LOGIC EXTENSION ───
async function loadUnreadCount() {
    try {
        const res = await apiFetch('/messages/inbox');
        if (!res) return 0;
        const messages = await res.json();
        return messages.filter(m => !m.is_read).length;
    } catch (err) { return 0; }
}

async function updateUnreadBadge() {
    const unread = await loadUnreadCount();
    const badge = document.getElementById('msgBadge');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function switchTabById(targetId) {
    document.querySelectorAll('.dash-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
    const targetLi = document.querySelector(`.nav-item[data-section="${targetId}"]`);
    if (targetLi) targetLi.classList.add('active');

    if (targetId === 'secMessages') {
        loadInbox();
        updateUnreadBadge();
    }
}

function quickMessage(receiverId) {
    showComposeModal();
    setTimeout(() => {
        document.getElementById('msgRecipient').value = receiverId;
        document.getElementById('msgSubject').focus();
    }, 200);
}

// ─── Data Loading ───
async function fetchWithAuth(endpoint, options = {}) {
    const token = sessionStorage.getItem('token');
    if (!options.headers) options.headers = {};
    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }
    options.headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    return res;
}

async function apiFetch(endpoint, options = {}) {
    const res = await fetchWithAuth(endpoint, options);
    return res;
}

async function loadProfile() {
    try {
        const res = await fetchWithAuth('/professor/profile');
        if (res.ok) {
            const profile = await res.json();
            document.getElementById('profName').textContent = profile.name;
            document.getElementById('profEmail').textContent = profile.academic_email || profile.email;
            document.getElementById('profDept').textContent = profile.department || 'EEMCI Faculty';
            document.getElementById('welcomeText').textContent = `Good day, ${profile.name.split(' ')[0]}!`;
            document.getElementById('profAvatar').textContent = profile.name.charAt(0).toUpperCase();
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadDashboardData() {
    try {
        // 1. Students
        const resStudents = await fetchWithAuth('/professor/students');
        if (resStudents.ok) {
            allStudents = await resStudents.json();
            document.getElementById('statStudents').textContent = allStudents.length;
            populateStudentSelects();
            renderAttendanceTable(allStudents);
            
            // Populate groups filter
            const groupSelect = document.getElementById('bulkGroup');
            groupSelect.innerHTML = '<option value="">All Groups</option>';
            const groups = [...new Set(allStudents.map(s => s.group_name))];
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                groupSelect.appendChild(opt);
            });
        }

        // 2. Courses
        const resCourses = await fetchWithAuth('/professor/my-courses');
        if (resCourses.ok) {
            myCourses = await resCourses.json();
            document.getElementById('statCourses').textContent = myCourses.length;
            renderCourses();
        }

        // 3. Records (Attendance & trigger stats)
        const resRecords = await fetchWithAuth('/professor/attendance');
        if (resRecords.ok) {
            allRecords = await resRecords.json();
            document.getElementById('statAttendance').textContent = allRecords.length;
            renderRecordsTable(allRecords);
            document.getElementById('statGrades').textContent = "—"; 
        }

    } catch (err) {
        console.error("Failed to load dashboard data", err);
        showNotify('Failed to load data', 'error');
    }
}

function populateStudentSelects() {
    const gradeSelect = document.getElementById('gradeStudentSelect');
    
    let html = '<option value="">Select Student</option>';
    allStudents.forEach(s => {
        html += `<option value="${s.id}">${s.name} (${s.group_name})</option>`;
    });

    if (gradeSelect) gradeSelect.innerHTML = html;
}

// ─── MESSAGING FEATURES ──────────────────────────────────────────────────────
let allRecipients = [];

async function loadInbox() {
    document.getElementById('mailList').classList.remove('hidden');
    document.getElementById('messageView').classList.add('hidden');
    document.getElementById('btnInbox').classList.add('active');
    document.getElementById('btnSent').classList.remove('active');

    const res = await apiFetch('/messages/inbox');
    const messages = await res.json();
    
    renderMailList(messages, 'inbox');
}

async function loadSent() {
    document.getElementById('mailList').classList.remove('hidden');
    document.getElementById('messageView').classList.add('hidden');
    document.getElementById('btnInbox').classList.remove('active');
    document.getElementById('btnSent').classList.add('active');

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
        <button class="list-group-item list-group-item-action p-3 border-0 border-bottom ${m.is_read || type === 'sent' ? '' : 'unread fw-bold'}" onclick="viewMessage(${JSON.stringify(m).replace(/"/g, '&quot;')}, '${type}')">
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
        <button class="btn btn-sm btn-link mb-3 p-0 text-decoration-none" onclick="backToMailList('${type}')">← Back to ${type}</button>
        <div class="border-bottom pb-3 mb-3">
            <h4 class="mb-1">${msg.subject}</h4>
            <div class="d-flex justify-content-between align-items-center">
                <div class="small">
                    <strong>${type === 'inbox' ? 'From' : 'To'}:</strong> ${type === 'inbox' ? msg.sender_name : msg.receiver_name} 
                    <span class="text-muted">&lt;${type === 'inbox' ? msg.sender_email : msg.receiver_email}&gt;</span>
                </div>
                <small class="text-muted">${new Date(msg.created_at).toLocaleString()}</small>
            </div>
        </div>
        <div class="message-body" style="white-space: pre-wrap; line-height: 1.6;">${msg.content}</div>
        ${type === 'inbox' ? `<button class="btn btn-primary mt-4" style="width:auto;" onclick="replyMessage('${msg.sender_id}', '${msg.subject}', '${msg.sender_name}')">Reply</button>` : ''}
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

document.getElementById('composeForm')?.addEventListener('submit', async (e) => {
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
        Swal.fire('Sent!', 'Your message has been delivered.', 'success');
        hideComposeModal();
        if (document.getElementById('secMessages').classList.contains('hidden')) {
             // do nothing
        } else {
            loadSent();
        }
    } else {
        Swal.fire('Error', 'Failed to send message.', 'error');
    }
});


// ─── Upload Notes ───
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('courseFile');
    const nameDisplay = document.getElementById('fileNameDisplay');

    if (!dropZone) return;

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            nameDisplay.textContent = `Selected: ${e.target.files[0].name}`;
            nameDisplay.classList.remove('hidden');
        } else {
            nameDisplay.classList.add('hidden');
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
    });
}

document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('uploadBtn');
    const btnText = document.getElementById('uploadBtnText');
    
    const title = document.getElementById('courseTitle').value;
    const dept = document.getElementById('courseDepartment').value;
    const file = document.getElementById('courseFile').files[0];

    if (!file) {
        showNotify('Please select a file', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('department', dept);
    formData.append('courseFile', file);

    btn.disabled = true;
    btnText.textContent = 'Uploading...';

    try {
        const res = await fetchWithAuth('/professor/upload-course', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showNotify('Notes uploaded successfully!');
            document.getElementById('uploadForm').reset();
            document.getElementById('fileNameDisplay').classList.add('hidden');
            loadDashboardData(); // reload courses
        } else {
            showNotify(data.message || 'Upload failed', 'error');
        }
    } catch (err) {
        showNotify('Upload failed due to network error', 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Upload to Platform';
    }
});

function renderCourses() {
    const html = myCourses.map(c => `
        <div class="course-card">
            <span class="course-dept">${c.department}</span>
            <h4>${c.title}</h4>
            <a href="${c.file_path}" target="_blank" class="btn-outline" style="display:inline-block; margin-top:1rem; text-decoration:none;">View File</a>
        </div>
    `).join('');

    const recentHtml = myCourses.slice(0, 3).map(c => `
        <div class="course-card">
            <span class="course-dept">${c.department}</span>
            <h4>${c.title}</h4>
        </div>
    `).join('');

    const empty = '<p class="empty-msg">No notes uploaded yet.</p>';

    const myCoursesList = document.getElementById('myCoursesList');
    const recentCoursesList = document.getElementById('recentCoursesList');

    if (myCoursesList) myCoursesList.innerHTML = myCourses.length ? html : empty;
    if (recentCoursesList) recentCoursesList.innerHTML = myCourses.length ? recentHtml : empty;
}

// ─── Attendance ───
function renderAttendanceTable(students) {
    const wrap = document.getElementById('attendanceList');
    if (!wrap) return;

    const tbody = document.createElement('tbody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-msg">No students found.</td></tr>';
    } else {
        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.name}</strong></td>
                <td>${s.group_name}</td>
                <td>
                    <div class="status-toggle" data-student-id="${s.id}">
                        <input type="radio" name="status_${s.id}" id="pres_${s.id}" value="present" class="status-radio" checked>
                        <label for="pres_${s.id}" class="status-label">Present</label>
                        
                        <input type="radio" name="status_${s.id}" id="abs_${s.id}" value="absent" class="status-radio">
                        <label for="abs_${s.id}" class="status-label">Absent</label>
                        
                        <input type="radio" name="status_${s.id}" id="late_${s.id}" value="retard" class="status-radio">
                        <label for="late_${s.id}" class="status-label">Retard</label>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `<thead><tr><th>Student</th><th>Group</th><th>Status</th></tr></thead>`;
    table.appendChild(tbody);

    wrap.innerHTML = '';
    wrap.appendChild(table);
}

function filterAttendanceList() {
    const group = document.getElementById('bulkGroup').value;
    if (group) {
        const filtered = allStudents.filter(s => s.group_name === group);
        renderAttendanceTable(filtered);
    } else {
        renderAttendanceTable(allStudents);
    }
}

function markAll(status) {
    const inputs = document.querySelectorAll(`.status-radio[value="${status}"]`);
    inputs.forEach(inp => inp.checked = true);
}

async function saveBulkAttendance() {
    const module = document.getElementById('bulkModule').value;
    let date = document.getElementById('bulkDate').value;

    if (!module) {
        showNotify('Please enter a Module / Class name', 'warning');
        return;
    }

    const toggles = document.querySelectorAll('.status-toggle');
    const records = [];

    toggles.forEach(t => {
        const student_id = t.getAttribute('data-student-id');
        const checked = t.querySelector('.status-radio:checked');
        if (checked) {
            records.push({
                student_id: student_id,
                status: checked.value
            });
        }
    });

    if (records.length === 0) {
        showNotify('No students in list to mark.', 'warning');
        return;
    }

    const btn = document.getElementById('saveAttendanceBtn');
    btn.disabled = true;

    try {
        const res = await fetchWithAuth('/professor/bulk-attendance', {
            method: 'POST',
            body: JSON.stringify({ module, date, records })
        });
        const data = await res.json();
        
        if (res.ok) {
            showNotify(data.message);
            loadDashboardData(); // reload records
        } else {
            showNotify(data.message || 'Error saving attendance', 'error');
        }
    } catch (err) {
        showNotify('Network error', 'error');
    } finally {
        btn.disabled = false;
    }
}

// ─── Grades ───
document.getElementById('gradeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        student_id: document.getElementById('gradeStudentSelect').value,
        module: document.getElementById('gradeModule').value,
        note: document.getElementById('gradeNote').value,
        type: document.getElementById('gradeType').value
    };

    try {
        const res = await fetchWithAuth('/professor/add-grade', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            showNotify('Grade posted successfully!');
            document.getElementById('gradeForm').reset();
        } else {
            showNotify(data.message || 'Failed to post grade', 'error');
        }
    } catch (err) {
        showNotify('Network error', 'error');
    }
});

// ─── Records Table ───
function renderRecordsTable(records) {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => `
        <tr>
            <td><strong>${r.student_name}</strong></td>
            <td>${r.group_name}</td>
            <td>${r.module}</td>
            <td><span class="badge ${r.status}">${r.status}</span></td>
            <td>${new Date(r.date).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function filterRecords() {
    const modFilter = document.getElementById('filterModule').value.toLowerCase();
    const dateFilter = document.getElementById('filterDate').value; 

    let filtered = allRecords;

    if (modFilter) {
        filtered = filtered.filter(r => r.module.toLowerCase().includes(modFilter));
    }
    if (dateFilter) {
        filtered = filtered.filter(r => r.date.startsWith(dateFilter));
    }

    renderRecordsTable(filtered);
}

// ─── Export ───
async function exportData(type) {
    showNotify(`Preparing ${type} export...`, 'info');
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/professor/export?type=${type}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EEMCI_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotify('Export complete');
    } catch (err) {
        showNotify('Export failed', 'error');
    }
}
