const db = require('../config/db');

class Payment {
    /**
     * Get monthly tuition fee for a specific filière
     */
    static async getFeeByFiliere(filiere) {
        const [rows] = await db.execute('SELECT * FROM filiere_fees WHERE filiere = ?', [filiere]);
        return rows[0];
    }

    /**
     * Update the monthly fee for a filière
     */
    static async updateFee(filiere, amount) {
        const [result] = await db.execute(
            'UPDATE filiere_fees SET monthly_fee = ? WHERE filiere = ?',
            [amount, filiere]
        );
        return result;
    }

    /**
     * Get all students with their payment status for a specific month/year/filière
     */
    static async getStudentsWithPayments(filiere, month, year) {
        const [rows] = await db.execute(`
            SELECT
                u.id AS student_id,
                u.name,
                si.group_name,
                si.department AS filiere,
                ff.monthly_fee AS amount_due,
                COALESCE(p.amount_paid, 0) AS amount_paid,
                COALESCE(p.status, 'pending') AS status,
                p.paid_at,
                (ff.monthly_fee - COALESCE(p.amount_paid, 0)) AS balance_remaining
            FROM users u
            INNER JOIN students_info si ON u.id = si.user_id
            INNER JOIN filiere_fees ff ON si.department = ff.filiere
            LEFT JOIN payments p ON p.student_id = u.id AND p.month = ? AND p.year = ?
            WHERE si.department = ?
            ORDER BY u.name ASC
        `, [month, year, filiere]);
        return rows;
    }

    /**
     * Insert or update a student's payment record
     */
    static async upsertPayment(studentId, filiere, month, year, amountPaid, amountDue, adminId) {
        let status = 'pending';
        if (amountPaid >= amountDue && amountDue > 0) {
            status = 'paid';
        } else if (amountPaid > 0) {
            status = 'partial';
        }

        const paidAt = status === 'paid' ? new Date() : null;

        const [result] = await db.execute(`
            INSERT INTO payments (student_id, filiere, month, year, amount_paid, amount_due, status, paid_at, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                amount_paid = VALUES(amount_paid),
                amount_due = VALUES(amount_due),
                status = VALUES(status),
                paid_at = VALUES(paid_at),
                recorded_by = VALUES(recorded_by)
        `, [studentId, filiere, month, year, amountPaid, amountDue, status, paidAt, adminId]);
        
        return result;
    }

    /**
     * Get payment history for a specific student (last 12 entries)
     */
    static async getPaymentHistory(studentId) {
        const [rows] = await db.execute(`
            SELECT month, year, amount_paid, amount_due, status, paid_at
            FROM payments
            WHERE student_id = ?
            ORDER BY year DESC, month DESC
            LIMIT 12
        `, [studentId]);
        return rows;
    }

    /**
     * Get all configured fees
     */
    static async getAllFees() {
        const [rows] = await db.execute('SELECT * FROM filiere_fees');
        return rows;
    }
}

module.exports = Payment;
