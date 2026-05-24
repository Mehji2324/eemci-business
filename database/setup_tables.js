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
        raw_password VARCHAR(255) DEFAULT NULL,
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
        status ENUM('present', 'absent', 'retard') NOT NULL,
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
    )`,

    `CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATETIME NOT NULL,
        location VARCHAR(255),
        type ENUM('exam_plan', 'course_plan', 'event', 'debate', 'trip') NOT NULL,
        file_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT,
        receiver_id INT,
        subject VARCHAR(255),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        title VARCHAR(255),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS filiere_fees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filiere ENUM('Développement Informatique', 'Systèmes et Réseaux') NOT NULL UNIQUE,
        monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        filiere ENUM('Développement Informatique', 'Systèmes et Réseaux') NOT NULL,
        month TINYINT NOT NULL COMMENT '1-12',
        year SMALLINT NOT NULL,
        amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status ENUM('paid', 'partial', 'pending') NOT NULL DEFAULT 'pending',
        paid_at DATETIME DEFAULT NULL,
        recorded_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_student_month (student_id, month, year),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
    )`
];

const seeds = [
    `INSERT IGNORE INTO filiere_fees (filiere, monthly_fee) VALUES
        ('Développement Informatique', 0.00),
        ('Systèmes et Réseaux', 0.00)`
];

async function setup() {
    console.log('--- Creating EEMCI database tables ---\n');

    for (const sql of tables) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        try {
            // Append charset to CREATE TABLE
            const sqlWithCharset = sql + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
            await db.execute(sqlWithCharset);
            console.log(`  [Done] ${tableName}`);
        } catch (err) {
            console.error(`  [Error] ${tableName}: ${err.message}`);
        }
    }

    console.log('\n--- Seeding default values ---\n');
    for (const sql of seeds) {
        try {
            await db.execute(sql);
            console.log(`  [Done] Seed data inserted`);
        } catch (err) {
            console.error(`  [Error] Seed error: ${err.message}`);
        }
    }

    console.log('\nAll tables ready!\n');
    process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
