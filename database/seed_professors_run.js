/**
 * Seed Professors into eemci_db
 * Run: node database/seed_professors_run.js
 * Password for ALL professors: Prof@2025
 */
const bcrypt = require('bcryptjs');
const db = require('../backend/config/db');

const professors = [
    { id: 101, name: 'Ahmed Benali',           email: 'ahmed.benali@eemci.edu.ma',     dept: 'Développement Informatique', modules: 'Algorithmes et Structures de Données,Programmation Web,Base de Données' },
    { id: 102, name: 'Fatima Zahra Moussaoui',  email: 'fatima.moussaoui@eemci.edu.ma', dept: 'Systèmes et Réseaux',        modules: 'Administration Réseaux,Sécurité Informatique,Protocoles de Communication' },
    { id: 103, name: 'Youssef El Amrani',       email: 'youssef.amrani@eemci.edu.ma',   dept: 'Développement Informatique', modules: 'Développement Mobile,Architecture Logicielle,DevOps et CI/CD' },
    { id: 104, name: 'Nadia Rachidi',           email: 'nadia.rachidi@eemci.edu.ma',    dept: 'Systèmes et Réseaux',        modules: 'Virtualisation,Cloud Computing,Systèmes Linux' },
];

async function seed() {
    const password = 'Prof@2025';
    const hashed = await bcrypt.hash(password, 10);

    console.log('\n🔧 Adding modules column to professors_info (if missing)...');
    try {
        await db.execute("ALTER TABLE professors_info ADD COLUMN modules TEXT DEFAULT NULL");
        console.log('   ✅ Column added.');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log('   ℹ️  Column already exists.');
        else console.error('   ⚠️', e.message);
    }

    for (const p of professors) {
        try {
            // Check if user already exists
            const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [p.email]);
            if (existing.length > 0) {
                console.log(`⏩ ${p.name} (${p.email}) already exists — skipped.`);
                continue;
            }

            // Insert user
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [p.name, p.email, hashed, 'professor']
            );
            const userId = result.insertId;

            // Insert professor info
            await db.execute(
                'INSERT INTO professors_info (user_id, academic_email, department, modules) VALUES (?, ?, ?, ?)',
                [userId, p.email, p.dept, p.modules]
            );

            console.log(`✅ ${p.name} — ${p.email} — inserted (id: ${userId})`);
        } catch (err) {
            console.error(`❌ Failed for ${p.name}:`, err.message);
        }
    }

    console.log('\n📋 Professor Credentials:');
    console.log('┌─────────────────────────────────────────────────────┐');
    professors.forEach(p => {
        console.log(`│  ${p.email.padEnd(38)} │  Prof@2025 │`);
    });
    console.log('└─────────────────────────────────────────────────────┘\n');

    process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
