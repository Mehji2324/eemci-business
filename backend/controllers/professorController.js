const db = require('../config/db');
const ExcelJS = require('exceljs');
const asyncHandler = require('../utils/asyncHandler');

// ─── Upload Course ──────────────────────────────────────────────────────────
exports.uploadCourse = asyncHandler(async (req, res) => {
    const { title, department } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const filePath = `/uploads/${file.filename}`;
    await db.execute(
        'INSERT INTO courses (title, file_path, professor_id, department) VALUES (?, ?, ?, ?)',
        [title, filePath, req.user.id, department]
    );

    res.status(201).json({ success: true, message: 'Resource uploaded successfully.', file: file.filename });
});

// ─── Add Grade ──────────────────────────────────────────────────────────────
exports.addGrade = asyncHandler(async (req, res) => {
    const { student_id, module, note, type } = req.body;

    if (!student_id || !module || note === undefined) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const gradeValue = parseFloat(note);
    if (gradeValue < 0 || gradeValue > 20) {
        return res.status(400).json({ message: 'Note must be between 0 and 20.' });
    }

    await db.execute(
        'INSERT INTO grades (student_id, module, note, type) VALUES (?, ?, ?, ?)',
        [student_id, module, gradeValue, type || 'exam']
    );

    res.status(201).json({ success: true, message: 'Grade recorded successfully.' });
});

// ─── Mark Attendance ────────────────────────────────────────────────────────
exports.markAttendance = asyncHandler(async (req, res) => {
    const { student_id, module, status } = req.body; // status: 'present', 'absent', 'late'

    if (!student_id || !module || !status) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    await db.execute(
        'INSERT INTO attendance (student_id, module, status, professor_id) VALUES (?, ?, ?, ?)',
        [student_id, module, status, req.user.id]
    );
    res.status(201).json({ success: true, message: 'Attendance recorded.' });
});

// ─── Bulk Mark Attendance ───────────────────────────────────────────────────
exports.bulkMarkAttendance = asyncHandler(async (req, res) => {
    const { module, date, records } = req.body;
    // records = [ { student_id, status }, ... ]

    if (!module || !records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'Invalid attendance data.' });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    for (const record of records) {
        await db.execute(
            'INSERT INTO attendance (student_id, module, status, professor_id, date) VALUES (?, ?, ?, ?, ?)',
            [record.student_id, module, record.status, req.user.id, attendanceDate]
        );
    }
    res.status(201).json({ success: true, message: `Attendance recorded for ${records.length} students.` });
});

// ─── Get Students ───────────────────────────────────────────────────────────
exports.getStudents = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT u.id, u.name, u.email, si.group_name, si.department, si.academic_email
        FROM users u
        JOIN students_info si ON u.id = si.user_id
        WHERE u.role = 'student'
        ORDER BY si.group_name, u.name
    `);
    res.json(rows);
});

// ─── Get My Courses ─────────────────────────────────────────────────────────
exports.getMyCourses = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(
        'SELECT id, title, file_path, department FROM courses WHERE professor_id = ? ORDER BY id DESC',
        [req.user.id]
    );
    res.json(rows);
});

// ─── Get Attendance Records ─────────────────────────────────────────────────
exports.getAttendanceRecords = asyncHandler(async (req, res) => {
    const { module, date } = req.query;
    let query = `
        SELECT a.id, u.name AS student_name, si.group_name, a.module, a.status, a.date
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        JOIN students_info si ON u.id = si.user_id
        WHERE a.professor_id = ?
    `;
    const params = [req.user.id];

    if (module) { query += ' AND a.module = ?'; params.push(module); }
    if (date)   { query += ' AND a.date = ?';   params.push(date); }

    query += ' ORDER BY a.date DESC, si.group_name, u.name';

    const [rows] = await db.execute(query, params);
    res.json(rows);
});

// ─── Get Profile ─────────────────────────────────────────────────────────────
exports.getProfile = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT u.id, u.name, u.email, u.role,
               pi.academic_email, pi.department, pi.modules
        FROM users u
        LEFT JOIN professors_info pi ON u.id = pi.user_id
        WHERE u.id = ?
    `, [req.user.id]);

    if (!rows[0]) return res.status(404).json({ message: 'Profile not found.' });
    res.json(rows[0]);
});

// ─── Export to Excel ─────────────────────────────────────────────────────────
exports.exportData = asyncHandler(async (req, res) => {
    const { type } = req.query;
    const workbook = new ExcelJS.Workbook();
    const sheetName = type === 'grades' ? 'Grades' : 'Attendance';
    const sheet = workbook.addWorksheet(sheetName);

    if (type === 'grades') {
        const [rows] = await db.execute(`
            SELECT u.name AS student, si.group_name, g.module, g.note, g.type
            FROM grades g
            JOIN users u ON g.student_id = u.id
            JOIN students_info si ON u.id = si.user_id
            ORDER BY si.group_name, u.name
        `);
        sheet.columns = [
            { header: 'Student Name',  key: 'student',    width: 28 },
            { header: 'Group',         key: 'group_name', width: 15 },
            { header: 'Module',        key: 'module',     width: 25 },
            { header: 'Grade / 20',    key: 'note',       width: 12 },
            { header: 'Type',          key: 'type',       width: 15 }
        ];
        sheet.addRows(rows);
    } else if (type === 'attendance') {
        const [rows] = await db.execute(`
            SELECT u.name AS student, si.group_name, a.module, a.status, a.date
            FROM attendance a
            JOIN users u ON a.student_id = u.id
            JOIN students_info si ON u.id = si.user_id
            WHERE a.professor_id = ?
            ORDER BY a.date DESC, si.group_name, u.name
        `, [req.user.id]);
        sheet.columns = [
            { header: 'Student Name', key: 'student',    width: 28 },
            { header: 'Group',        key: 'group_name', width: 15 },
            { header: 'Module',       key: 'module',     width: 25 },
            { header: 'Status',       key: 'status',     width: 12 },
            { header: 'Date',         key: 'date',       width: 15 }
        ];
        sheet.addRows(rows);
    } else {
        return res.status(400).json({ message: 'Invalid export type.' });
    }

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
});
