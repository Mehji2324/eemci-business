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

    console.log('[addUser] Payload:', { name, role, group_name, department });

    if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and Role are required' });
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
    
    try {
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        
        // 1. Create Main User
        const userId = await User.create({
            name,
            email: academicEmail,
            password: hashedPassword,
            role,
            raw_password: generatedPassword
        });

        console.log(`[addUser] Created user ID: ${userId}`);

        // 2. Add Role-Specific Info
        if (role === 'student') {
            await db.execute(
                'INSERT INTO students_info (user_id, group_name, department, academic_email) VALUES (?, ?, ?, ?)', 
                [userId, group_name || 'N/A', department || 'Développement Informatique', academicEmail]
            );
        } else if (role === 'professor') {
            await db.execute(
                'INSERT INTO professors_info (user_id, academic_email, department) VALUES (?, ?, ?)', 
                [userId, academicEmail, department || 'Développement Informatique']
            );
        }

        return res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            user: { 
                email: academicEmail, 
                password: generatedPassword, 
                role 
            } 
        });

    } catch (err) {
        console.error('[addUser] CRITICAL ERROR:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'This academic email already exists in the system.' });
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Internal Database Error', 
            error: err.message 
        });
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
