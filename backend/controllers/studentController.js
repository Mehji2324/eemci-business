const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.getGrades = asyncHandler(async (req, res) => {
    const [rows] = await db.execute('SELECT module, note, type FROM grades WHERE student_id = ?', [req.user.id]);
    res.json(rows);
});

exports.getSchedule = asyncHandler(async (req, res) => {
    const { type } = req.query; // 'study' or 'exam'
    const [studentInfo] = await db.execute('SELECT group_name FROM students_info WHERE user_id = ?', [req.user.id]);
    if (studentInfo.length === 0) return res.json([]);
    
    let query = 'SELECT day, time, module FROM schedule WHERE group_name = ?';
    const params = [studentInfo[0].group_name];

    if (type) {
        query += ' AND type = ?';
        params.push(type);
    }

    const [rows] = await db.execute(query, params);
    res.json(rows);
});

exports.getCourses = asyncHandler(async (req, res) => {
    const [studentInfo] = await db.execute('SELECT department FROM students_info WHERE user_id = ?', [req.user.id]);
    if (studentInfo.length === 0) return res.json([]);

    const [rows] = await db.execute(`
        SELECT c.title, c.file_path, u.name as professor_name, u.email as professor_email
        FROM courses c 
        JOIN users u ON c.professor_id = u.id
        WHERE c.department = ?
    `, [studentInfo[0].department]);
    res.json(rows);
});

exports.getEvents = asyncHandler(async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM events ORDER BY date ASC');
    res.json(rows);
});
