const User = require('../models/User');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');

exports.getUsers = asyncHandler(async (req, res) => {
    const users = await User.getAll();
    res.json(users);
});

exports.addUser = asyncHandler(async (req, res) => {
    const { name, password, role, group_name, department } = req.body;

    if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and Role are required.' });
    }

    // Validate role-specific required fields
    if (role === 'student' && !group_name) {
        return res.status(400).json({ success: false, message: 'Group name is required for students.' });
    }

    // Generate academic email with collision handling
    const nameParts = name.trim().toLowerCase().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
    
    let baseEmail;
    if (role === 'professor') {
        baseEmail = `${firstName}.${lastName}.prof`;
    } else if (role === 'admin') {
        baseEmail = `${firstName}.${lastName}.admin`;
    } else {
        baseEmail = `${firstName}.${lastName}`;
    }

    const domain = role === 'admin' ? '@eemci.com' : '@eemci.edu.ma';
    let academicEmail = `${baseEmail}${domain}`;
    
    // Check for collisions and append number if needed
    let counter = 1;
    let exists = true;
    while (exists) {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [academicEmail]);
        if (existing.length === 0) {
            exists = false;
        } else {
            counter++;
            academicEmail = `${baseEmail}${counter}${domain}`;
        }
    }

    // Generate standard password
    const generatedPassword = password || `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}@2026`;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const [userResult] = await connection.execute(
            'INSERT INTO users (name, email, password, role, raw_password) VALUES (?, ?, ?, ?, ?)',
            [name, academicEmail, hashedPassword, role, generatedPassword]
        );
        const userId = userResult.insertId;

        if (role === 'student') {
            await connection.execute(
                'INSERT INTO students_info (user_id, group_name, department, academic_email) VALUES (?, ?, ?, ?)',
                [userId, group_name, department || 'Developpement Informatique', academicEmail]
            );
        } else if (role === 'professor') {
            await connection.execute(
                'INSERT INTO professors_info (user_id, academic_email, department) VALUES (?, ?, ?)',
                [userId, academicEmail, department || 'Developpement Informatique']
            );
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'User created.', user: { email: academicEmail, password: generatedPassword, role } });

    } catch (err) {
        await connection.rollback();
        console.error('[addUser] Transaction rolled back:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'This academic email already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Database transaction failed.', error: err.message });
    } finally {
        connection.release();
    }
});

exports.deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await User.delete(id);
    res.json({ success: true, message: 'User deleted' });
});

exports.getStats = asyncHandler(async (req, res) => {
    const stats = await User.getStats();
    res.json(stats);
});

exports.getAllGrades = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT g.id, u.name as student_name, g.module, g.note, g.type
        FROM grades g
        JOIN users u ON g.student_id = u.id
        ORDER BY g.id DESC LIMIT 50
    `);
    res.json(rows);
});

exports.getAllAttendance = asyncHandler(async (req, res) => {
    const [rows] = await db.execute(`
        SELECT a.id, u.name as student_name, a.module, a.status, a.date
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        ORDER BY a.date DESC LIMIT 50
    `);
    res.json(rows);
});
