/**
 * Payment Controller (MySQL Version - Enhanced for Balance Tracking)
 */
const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.fetchPayments = asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
    }

    const [rows] = await db.execute(`
        SELECT u.id as student_id, u.name, u.email, si.group_name,
               p.status, p.total_amount, p.paid_amount, p.paid_at
        FROM users u
        JOIN students_info si ON u.id = si.user_id
        LEFT JOIN payments p ON u.id = p.student_id AND p.month = ? AND p.year = ?
        WHERE u.role = 'student'
        ORDER BY si.group_name, u.name
    `, [month, year]);

    const formatted = rows.map(r => ({
        student_id: { id: r.student_id, name: r.name, email: r.email, group_name: r.group_name },
        status: r.status || 'pending',
        total_amount: r.total_amount || 0,
        paid_amount: r.paid_amount || 0,
        paid_at: r.paid_at
    }));

    res.json(formatted);
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const { studentId, month, year, status, total_amount, paid_amount } = req.body;
    
    if (!studentId || !month || !year || !status) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const paidAt = status === 'paid' ? new Date() : null;
    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(paid_amount) || 0;

    await db.execute(`
        INSERT INTO payments (student_id, month, year, status, paid_at, total_amount, paid_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            status = VALUES(status), 
            paid_at = VALUES(paid_at),
            total_amount = VALUES(total_amount),
            paid_amount = VALUES(paid_amount)
    `, [studentId, month, year, status, paidAt, total, paid]);

    res.json({ success: true, message: 'Payment updated' });
});

exports.fetchHistory = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const [rows] = await db.execute(`
        SELECT * FROM payments 
        WHERE student_id = ? 
        ORDER BY year DESC, month DESC
    `, [studentId]);
    
    res.json(rows);
});
