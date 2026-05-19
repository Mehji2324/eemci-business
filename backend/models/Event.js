const db = require('../config/db');

class Event {
    static async create(eventData) {
        const { title, description, date, location, type, file_path } = eventData;
        const [result] = await db.execute(
            'INSERT INTO events (title, description, date, location, type, file_path) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, date, location, type, file_path || null]
        );
        return result.insertId;
    }

    static async getAll() {
        const [rows] = await db.execute('SELECT * FROM events ORDER BY date ASC');
        return rows;
    }

    static async getByType(type) {
        const [rows] = await db.execute('SELECT * FROM events WHERE type = ? ORDER BY date ASC', [type]);
        return rows;
    }

    static async delete(id) {
        await db.execute('DELETE FROM events WHERE id = ?', [id]);
    }
}

module.exports = Event;
