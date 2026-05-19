const db = require('../config/db');

class User {
    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(userData) {
        const { name, email, password, role, raw_password } = userData;
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, raw_password) VALUES (?, ?, ?, ?, ?)',
            [name, email, password, role, raw_password]
        );
        return result.insertId;
    }

    static async getAll() {
        const [rows] = await db.execute('SELECT id, name, email, role, raw_password FROM users');
        return rows;
    }

    static async delete(id) {
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
    }

    static async getStats() {
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [courses] = await db.execute('SELECT COUNT(*) as count FROM courses');
        return { users: users[0].count, courses: courses[0].count };
    }
}

module.exports = User;
