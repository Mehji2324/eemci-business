const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('./notificationController');

// Send a message
exports.sendMessage = asyncHandler(async (req, res) => {
    const { receiver_id, subject, content } = req.body;
    const sender_id = req.user.id;

    if (!receiver_id || !content) {
        return res.status(400).json({ success: false, message: 'Recipient and content are required' });
    }

    await db.execute(
        'INSERT INTO messages (sender_id, receiver_id, subject, content) VALUES (?, ?, ?, ?)',
        [sender_id, receiver_id, subject || '(No Subject)', content]
    );

    // Get sender name
    const [senderRows] = await db.execute('SELECT name FROM users WHERE id = ?', [sender_id]);
    const senderName = senderRows[0]?.name || 'Someone';

    // Notify receiver
    await createNotification(
      receiver_id,
      'message',
      '📩 New Message',
      `${senderName} sent you a message: "${subject || '(No Subject)'}"` 
    );

    res.status(201).json({ success: true, message: 'Message sent successfully' });
});

// Get inbox for current user
exports.getInbox = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT m.*, u.name as sender_name, u.email as sender_email 
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.receiver_id = ?
        ORDER BY m.created_at DESC
    `, [req.user.id]);
    res.json(rows);
});

// Get sent messages
exports.getSentMessages = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT m.*, u.name as receiver_name, u.email as receiver_email 
        FROM messages m
        JOIN users u ON m.receiver_id = u.id
        WHERE m.sender_id = ?
        ORDER BY m.created_at DESC
    `, [req.user.id]);
    res.json(rows);
});

// Mark message as read
exports.markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await db.execute('UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ?', [id, req.user.id]);
    res.json({ success: true });
});

// Get all possible recipients (simplified for now)
exports.getRecipients = asyncHandler(async (req, res) => {
    const [rows] = await db.execute('SELECT id, name, email, role FROM users WHERE id != ?', [req.user.id]);
    res.json(rows);
});
