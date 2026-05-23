/**
 * Payment Module - Client side logic (Enhanced with Balance Tracking)
 */
const state = { data: [], currentTab: 'pending' };

document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    fetchPayments();
});

function initFilters() {
    const mSelect = document.getElementById('monthSelect');
    const ySelect = document.getElementById('yearSelect');
    const searchInput = document.getElementById('searchInput');

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    if (mSelect) {
        mSelect.innerHTML = months.map((m, i) => `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`).join('');
        mSelect.onchange = fetchPayments;
    }

    if (ySelect) {
        ySelect.innerHTML = [currentYear - 1, currentYear, currentYear + 1].map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
        ySelect.onchange = fetchPayments;
    }

    if (searchInput) {
        searchInput.oninput = render;
    }
}

async function fetchPayments() {
    renderSkeletons(5);
    const m = document.getElementById('monthSelect').value;
    const y = document.getElementById('yearSelect').value;
    
    try {
        const res = await apiFetch(`/payments?month=${m}&year=${y}`);
        if (res.ok) {
            state.data = await res.json();
            render();
        }
    } catch (e) {
        showNotify('Failed to load payments', 'error');
    } finally {
        hideSkeletons();
    }
}

async function openPayModal(studentId, name, currentTotal, currentPaid) {
    const { value: formValues } = await Swal.fire({
        title: `Payment for ${name}`,
        html:
            `<div class="text-start mb-2"><label class="small fw-bold">Total Due (MAD)</label></div>` +
            `<input id="swal-total" class="swal2-input mt-0" placeholder="Total Due" value="${currentTotal || 0}">` +
            `<div class="text-start mb-2 mt-3"><label class="small fw-bold">Amount Paid (MAD)</label></div>` +
            `<input id="swal-paid" class="swal2-input mt-0" placeholder="Amount Paid" value="${currentPaid || 0}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save Payment',
        preConfirm: () => {
            return {
                total: document.getElementById('swal-total').value,
                paid: document.getElementById('swal-paid').value
            }
        }
    });

    if (formValues) {
        const status = parseFloat(formValues.paid) >= parseFloat(formValues.total) && parseFloat(formValues.total) > 0 ? 'paid' : 'pending';
        updatePayment(studentId, status, formValues.total, formValues.paid);
    }
}

async function updatePayment(studentId, status, total_amount, paid_amount) {
    const m = document.getElementById('monthSelect').value;
    const y = document.getElementById('yearSelect').value;

    try {
        const res = await apiFetch('/payments/status', {
            method: 'PUT',
            body: JSON.stringify({ 
                studentId, 
                month: m, 
                year: y, 
                status, 
                total_amount, 
                paid_amount 
            })
        });
        
        if (res.ok) {
            showNotify(`Payment updated!`);
            fetchPayments();
        }
    } catch (e) {
        showNotify('Update failed', 'error');
    }
}

function render() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('cardContainer');
    
    const filtered = state.data.filter(p => {
        const matchesTab = p.status === state.currentTab;
        const matchesSearch = p.student_id.name.toLowerCase().includes(search) || 
                              p.student_id.email.toLowerCase().includes(search);
        return matchesTab && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center w-100 py-5 text-muted">No ${state.currentTab} payments found.</div>`;
        return;
    }

    container.innerHTML = filtered.map((item, i) => {
        const balance = item.total_amount - item.paid_amount;
        const progress = item.total_amount > 0 ? (item.paid_amount / item.total_amount) * 100 : 0;
        
        return `
        <div class="card stagger" style="animation-delay: ${i * 0.05}s">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h5 class="mb-0 fw-bold">${item.student_id.name}</h5>
                    <small class="text-muted">${item.student_id.group_name}</small>
                </div>
                <span class="badge ${item.status === 'paid' ? 'bg-success' : 'bg-warning'}">${item.status}</span>
            </div>
            
            <div class="payment-details mb-3">
                <div class="d-flex justify-content-between small mb-1">
                    <span>Paid: <strong>${item.paid_amount} MAD</strong></span>
                    <span>Total: ${item.total_amount} MAD</span>
                </div>
                <div class="progress mb-2" style="height: 6px; background: rgba(255,255,255,0.1);">
                    <div class="progress-bar ${balance <= 0 ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${progress}%"></div>
                </div>
                <div class="text-end small">
                    <span class="${balance > 0 ? 'text-danger fw-bold' : 'text-success'}">
                        ${balance > 0 ? `Remaining: ${balance} MAD` : 'Fully Paid'}
                    </span>
                </div>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm flex-grow-1" onclick="openPayModal(${item.student_id.id}, '${item.student_id.name}', ${item.total_amount}, ${item.paid_amount})">
                    <i class="fas fa-coins me-1"></i> Update Payment
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="viewHistory(${item.student_id.id})" title="View History">
                    <i class="fas fa-history"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

async function viewHistory(studentId) {
    const modal = document.getElementById('historyModal');
    const content = document.getElementById('historyContent');
    modal.classList.remove('hidden');
    content.innerHTML = '<p class="text-center py-4">Loading history...</p>';

    try {
        const res = await apiFetch(`/payments/history/${studentId}`);
        const history = await res.json();
        
        if (history.length === 0) {
            content.innerHTML = '<div class="d-flex justify-content-between"><h4>Payment History</h4><button onclick="closeModal()" class="btn-close btn-close-white"></button></div><p class="text-muted">No history found.</p>';
        } else {
            content.innerHTML = `
                <div class="d-flex justify-content-between mb-4">
                    <h4 class="mb-0">Payment History</h4>
                    <button onclick="closeModal()" class="btn-close btn-close-white"></button>
                </div>
                <div class="table-responsive">
                    <table class="table table-dark table-hover">
                        <thead><tr><th>Period</th><th>Status</th><th>Paid</th><th>Total</th></tr></thead>
                        <tbody>
                            ${history.map(h => `
                                <tr>
                                    <td>${getMonthName(h.month)} ${h.year}</td>
                                    <td><span class="badge ${h.status === 'paid' ? 'bg-success' : 'bg-warning'}">${h.status}</span></td>
                                    <td>${h.paid_amount} MAD</td>
                                    <td>${h.total_amount} MAD</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (e) {
        content.innerHTML = '<p class="text-danger">Error loading history.</p>';
    }
}

function getMonthName(m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m-1];
}

function closeModal() {
    document.getElementById('historyModal').classList.add('hidden');
}

function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('#tabs button').forEach(b => {
        b.classList.toggle('active', b.getAttribute('onclick').includes(tab));
    });
    render();
}

function renderSkeletons(count) {
    document.getElementById('cardContainer').innerHTML = '<div class="text-center w-100 py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i> Loading data...</div>';
}

function hideSkeletons() {}
