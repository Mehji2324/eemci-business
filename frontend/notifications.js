// notifications.js - Isolated Notification Controller
// Wait for authorization to integrate into dashboard files

const NOTIF_CONFIG = {
    pollingInterval: 30000, // 30 seconds
    apiBase: '/api/notifications'
};

document.addEventListener("DOMContentLoaded", () => {
    const bellBtn = document.getElementById("notifBellBtn");
    const dropdownPanel = document.getElementById("notifDropdownPanel");
    const countBadge = document.getElementById("notifCountBadge");

    if (bellBtn) {
        bellBtn.addEventListener("click", () => {
            dropdownPanel.style.display = dropdownPanel.style.display === "block" ? "none" : "block";
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!bellBtn.contains(e.target) && !dropdownPanel.contains(e.target)) {
            dropdownPanel.style.display = "none";
        }
    });

    initNotifications();
});

async function initNotifications() {
    // Initial fetch
    await fetchNotifications();
    // Setup polling
    setInterval(fetchNotifications, NOTIF_CONFIG.pollingInterval);
}

async function fetchNotifications() {
    try {
        // Mocking the fetch call structure as requested
        const response = await fetch(`${NOTIF_CONFIG.apiBase}`);
        const data = await response.json();
        renderNotifications(data);
    } catch (err) {
        console.error("Failed to fetch notifications", err);
    }
}

function renderNotifications(items) {
    const container = document.getElementById("notifItemsContainer");
    const countBadge = document.getElementById("notifCountBadge");
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-notif-state">No new notifications</div>';
        countBadge.classList.remove("badge-visible");
        return;
    }

    countBadge.textContent = items.length;
    countBadge.classList.add("badge-visible");

    container.innerHTML = items.map(item => `
        <div class="notif-row-item ${!item.is_read ? 'unread' : ''}" onclick="handleNotifClick(${item.id}, '${item.type}')">
            ${formatNotificationText(item)}
        </div>
    `).join('');
}

function formatNotificationText(item) {
    switch (item.type) {
        case 'message': return `✉️ ${item.sender_name} sent you a message: ${item.subject_summary}`;
        case 'event': return `📅 New Event posted: ${item.event_title}`;
        case 'course': return `📚 New Course content uploaded: ${item.course_name}`;
        case 'exam': return `📝 New Exam Plan scheduled`;
        default: return item.content;
    }
}

async function handleNotifClick(id, type) {
    // Flag as read
    await fetch(`${NOTIF_CONFIG.apiBase}/read/${id}`, { method: 'POST' });
    
    // Redirect logic
    if (type === 'message') {
        switchTabById('secMessages'); // Assuming switchTabById exists in page
    } else if (['event', 'course', 'exam'].includes(type)) {
        // Placeholder for trigger view container swap
        console.log(`Navigate to ${type} context`);
    }
    
    // Refresh list
    fetchNotifications();
}
