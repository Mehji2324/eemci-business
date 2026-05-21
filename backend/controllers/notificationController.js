const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
    );
    res.json(rows);
});

exports.markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await db.execute(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [id, req.user.id]
    );
    res.json({ success: true });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
    await db.execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [req.user.id]
    );
    res.json({ success: true });
});

exports.createNotification = async (userId, type, title, message) => {
    try {
        await db.execute(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [userId, type, title, message]
        );
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};
