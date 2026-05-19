/**
 * Create all EEMCI database tables
 * Run: node database/setup_tables.js
 */
const db = require('../backend/config/db');

const tables = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'professor', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS students_info (
        user_id INT PRIMARY KEY,
        group_name VARCHAR(50) NOT NULL,
        department ENUM('Développement Informatique', 'Systèmes et Réseaux') NOT NULL,
        academic_email VARCHAR(100) UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS professors_info (
        user_id INT PRIMARY KEY,
        academic_email VARCHAR(100) UNIQUE,
        department ENUM('Développement Informatique', 'Systèmes et Réseaux'),
        modules TEXT DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        professor_id INT,
        department ENUM('Développement Informatique', 'Systèmes et Réseaux'),
        FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        module VARCHAR(100) NOT NULL,
        note DECIMAL(4, 2) NOT NULL,
        type ENUM('exam', 'assignment') DEFAULT 'exam',
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        module VARCHAR(100) NOT NULL,
        status ENUM('present', 'absent', 'late') NOT NULL,
        date DATE DEFAULT (CURRENT_DATE),
        professor_id INT,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS schedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_name VARCHAR(50) NOT NULL,
        type ENUM('study', 'exam') NOT NULL,
        day VARCHAR(20) NOT NULL,
        time VARCHAR(20) NOT NULL,
        module VARCHAR(100) NOT NULL
    )`
];

async function setup() {
    console.log('🔧 Creating EEMCI database tables...\n');

    for (const sql of tables) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        try {
            await db.execute(sql);
            console.log(`  ✅ ${tableName}`);
        } catch (err) {
            console.error(`  ❌ ${tableName}: ${err.message}`);
        }
    }

    console.log('\n✅ All tables ready!\n');
    process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
