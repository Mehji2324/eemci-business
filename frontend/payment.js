(function() {
'use strict';

// ─── AUTH GUARD ──────────────────────────────────────────────────────────────
// script.js only guards files with 'dashboard.html' in the path.
// We guard this page manually.
const _token = sessionStorage.getItem('token');
const _user  = JSON.parse(sessionStorage.getItem('user') || 'null');
if (!_token || !_user || _user.role !== 'admin') {
    window.location.href = 'index.html';
}

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
    activeFiliere: 'Développement Informatique',
    month: new Date().getMonth() + 1,        // 1-12
    year:  new Date().getFullYear(),
    searchQuery: '',
    fees: {},            // { 'Développement Informatique': 1500, ... }
    students: [],        // raw list for current filiere/month/year
    filtered: [],        // after search filter
    loading: false
};

// ─── API LAYER ───────────────────────────────────────────────────────────────
async function fetchFees() {
    return await apiFetch('/payments/fees');
}

async function saveFee(filiere, amount) {
    return await apiFetch('/payments/fees', {
        method: 'PUT',
        body: JSON.stringify({ filiere, monthly_fee: amount })
    });
}

async function fetchStudents(filiere, month, year) {
    return await apiFetch(`/payments/students?filiere=${encodeURIComponent(filiere)}&month=${month}&year=${year}`);
}

async function recordPayment(studentId, filiere, month, year, amountPaid) {
    return await apiFetch('/payments/record', {
        method: 'PUT',
        body: JSON.stringify({ student_id: studentId, filiere, month, year, amount_paid: amountPaid })
    });
}

async function fetchHistory(studentId) {
    return await apiFetch(`/payments/history/${studentId}`);
}

// ─── RENDER LAYER ────────────────────────────────────────────────────────────
function renderSkeletons(count) {
    const container = document.getElementById('paymentTableBody');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const tr = document.createElement('tr');
        tr.className = 'skeleton-row';
        tr.innerHTML = Array(7).fill('<td><div class="skeleton-cell"></div></td>').join('');
        container.appendChild(tr);
    }
}

function hideSkeletons() {
    document.querySelectorAll('.skeleton-row').forEach(r => r.remove());
}

function renderTable(list) {
    const container = document.getElementById('paymentTableBody');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No students found.</td></tr>';
        return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.className = 'payment-row';
        tr.style.animationDelay = `${i * 45}ms`;
        tr.dataset.studentId = s.student_id;

        const balance = s.amount_due - s.amount_paid;
        const balanceClass = balance > 0 ? 'balance-cell has-deficit' : 'balance-cell cleared';
        const balanceText = balance > 0 ? `${balance.toFixed(2)} MAD` : 'Cleared';

        let statusClass = 'pending';
        let statusIcon = 'clock';
        if (s.status === 'paid') { statusClass = 'paid'; statusIcon = 'check-circle'; }
        else if (s.status === 'partial') { statusClass = 'partial'; statusIcon = 'adjust'; }

        tr.innerHTML = `
            <td class="fw-bold">${s.name}</td>
            <td><span class="badge bg-light text-dark border">${s.group_name}</span></td>
            <td>${s.amount_due} MAD</td>
            <td>
                <input type="number" class="form-control form-control-sm text-end" value="${s.amount_paid}" style="width: 100px;">
            </td>
            <td class="${balanceClass}">${balanceText}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="fas fa-${statusIcon}"></i> ${s.status}
                </span>
            </td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-primary btn-record">Record</button>
                    <button class="btn btn-sm btn-outline-secondary" data-student-id="${s.student_id}" data-student-name="${s.name}">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(tr);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
}

function updateSummary(list) {
    const summary = list.reduce((acc, s) => {
        acc[s.status]++;
        acc.total++;
        return acc;
    }, { paid: 0, partial: 0, pending: 0, total: 0 });

    document.getElementById('sumPaid').textContent = summary.paid;
    document.getElementById('sumPartial').textContent = summary.partial;
    document.getElementById('sumPending').textContent = summary.pending;
    document.getElementById('sumTotal').textContent = summary.total;
}

function updateTabCounts(filiere, count) {
    if (filiere === 'Développement Informatique') {
        document.getElementById('count-di').textContent = count;
    } else {
        document.getElementById('count-sr').textContent = count;
    }
}

function renderFeeCards(fees) {
    Object.keys(fees).forEach(f => {
        const input = document.querySelector(`[data-fee-filiere="${CSS.escape(f)}"]`);
        if (input) input.value = fees[f];
    });
}

function renderHistoryModal(studentName, history) {
    const content = document.getElementById('historyContent');
    if (history.length === 0) {
        content.innerHTML = '<div class="text-center py-4 text-muted">No payment records found.</div>';
        return;
    }

    content.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr><th>Period</th><th>Due</th><th>Paid</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${history.map(h => {
                        const mName = new Date(2000, h.month - 1).toLocaleString('en', { month: 'short' });
                        return `
                        <tr>
                            <td>${mName} ${h.year}</td>
                            <td>${h.amount_due}</td>
                            <td class="fw-bold">${h.amount_paid}</td>
                            <td><span class="status-badge ${h.status}" style="font-size:0.65rem;">${h.status}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function updateInkBar() {
    const activeTab = document.querySelector('.filiere-tab.active');
    const bar = document.getElementById('tabInkBar');
    if (!activeTab || !bar) return;
    bar.style.left  = activeTab.offsetLeft + 'px';
    bar.style.width = activeTab.offsetWidth + 'px';
}

function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
async function loadStudents() {
    state.loading = true;
    renderSkeletons(5);
    const wrapper = document.getElementById('paymentTableWrapper');
    wrapper.style.opacity = '0.4';
    
    try {
        const res = await fetchStudents(state.activeFiliere, state.month, state.year);
        if (res && res.ok) {
            const json = await res.json();
            state.students = json.data || [];
            state.filtered = state.searchQuery 
                ? state.students.filter(s => s.name.toLowerCase().includes(state.searchQuery))
                : [...state.students];
            
            renderTable(state.filtered);
            updateSummary(state.filtered);
            updateTabCounts(state.activeFiliere, state.students.length);
            
            wrapper.style.transition = 'opacity 280ms ease';
            wrapper.style.opacity = '1';
        } else {
            showNotify('Failed to load students.', 'error');
        }
    } catch (e) {
        console.error(e);
        showNotify('Connection error.', 'error');
    } finally {
        hideSkeletons();
        state.loading = false;
    }
}

async function handleRecord(btn, studentId, filiere, month, year) {
    const row = btn.closest('tr');
    const input = row.querySelector('input[type="number"]');
    const amountPaid = parseFloat(input.value);
    
    if (isNaN(amountPaid) || amountPaid < 0) {
        showNotify('Enter a valid amount.', 'warning');
        return;
    }
    
    btn.classList.add('loading');
    btn.textContent = '';

    try {
        const res = await recordPayment(studentId, filiere, month, year, amountPaid);
        if (res && res.ok) {
            btn.classList.remove('loading');
            btn.classList.add('success');
            btn.innerHTML = '<i class="fas fa-check me-1"></i> Saved';
            setTimeout(() => {
                btn.classList.remove('success');
                btn.innerHTML = 'Record';
            }, 2000);
            await loadStudents();
        } else {
            throw new Error('Record failed');
        }
    } catch (e) {
        btn.classList.remove('loading');
        btn.innerHTML = 'Record';
        showNotify('Failed to save payment.', 'error');
    }
}

async function openHistoryModal(studentId, studentName) {
    document.getElementById('historyStudentName').textContent = studentName;
    document.getElementById('historyContent').innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading...</div>';
    document.getElementById('historyModal').classList.remove('hidden');
    
    try {
        const res = await fetchHistory(studentId);
        if (res && res.ok) {
            const json = await res.json();
            renderHistoryModal(studentName, json.data || []);
        } else {
            document.getElementById('historyContent').innerHTML = '<div class="text-danger">Failed to load history.</div>';
        }
    } catch (e) {
        document.getElementById('historyContent').innerHTML = '<div class="text-danger">Error fetching history.</div>';
    }
}

// ─── INITIALIZATION ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Set month picker to current month
    const now = new Date();
    const picker = document.getElementById('monthPicker');
    if (picker) {
        picker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Initial load
    try {
        const feesRes = await fetchFees();
        if (feesRes && feesRes.ok) {
            const json = await feesRes.json();
            json.data.forEach(f => { state.fees[f.filiere] = f.monthly_fee; });
            renderFeeCards(state.fees);
        }
        await loadStudents();
    } catch (e) { console.error(e); }

    requestAnimationFrame(updateInkBar);

    // Tab switching
    document.querySelectorAll('.filiere-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.filiere-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.activeFiliere = tab.dataset.filiere;
            updateInkBar();
            await loadStudents();
        });
    });

    // Month/year picker
    document.getElementById('monthPicker').addEventListener('change', async (e) => {
        const [y, m] = e.target.value.split('-');
        state.year  = parseInt(y);
        state.month = parseInt(m);
        await loadStudents();
    });

    // Search
    document.getElementById('studentSearch').addEventListener('input', debounce(e => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.filtered = state.students.filter(s => s.name.toLowerCase().includes(state.searchQuery));
        renderTable(state.filtered);
        updateSummary(state.filtered);
    }, 300));

    // Record and History buttons (delegation)
    document.getElementById('paymentTableBody').addEventListener('click', e => {
        const recordBtn = e.target.closest('.btn-record');
        if (recordBtn) {
            const row = recordBtn.closest('tr');
            handleRecord(recordBtn, row.dataset.studentId, state.activeFiliere, state.month, state.year);
            return;
        }
        
        const histBtn = e.target.closest('[data-student-id]');
        if (histBtn && histBtn.classList.contains('btn-outline-secondary')) {
            openHistoryModal(histBtn.dataset.studentId, histBtn.dataset.studentName);
        }
    });

    // Fee save buttons
    document.getElementById('feeConfigSection').addEventListener('click', async e => {
        const saveBtn = e.target.closest('.btn-save-fee');
        if (!saveBtn) return;
        
        const filiere = saveBtn.dataset.filiere;
        const input = document.querySelector(`[data-fee-filiere="${CSS.escape(filiere)}"]`);
        const amount = parseFloat(input.value);
        
        if (isNaN(amount) || amount < 0) {
            showNotify('Enter a valid fee amount.', 'warning');
            return;
        }

        saveBtn.disabled = true;
        const res = await saveFee(filiere, amount);
        saveBtn.disabled = false;
        
        if (res && res.ok) {
            state.fees[filiere] = amount;
            showNotify(`Fee updated for ${filiere}.`);
            await loadStudents(); // Refresh balance columns
        } else {
            showNotify('Failed to update fee.', 'error');
        }
    });

    // History modal close
    document.getElementById('closeHistoryModal').addEventListener('click', () => {
        document.getElementById('historyModal').classList.add('hidden');
    });

    window.addEventListener('resize', updateInkBar);
});

})();
