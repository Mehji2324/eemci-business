const db = require('./backend/config/db');

async function test() {
    try {
        const [rows] = await db.execute('SELECT 1 + 1 AS result');
        console.log('✅ Database connection successful:', rows[0].result === 2);
        
        const [databases] = await db.execute('SHOW DATABASES LIKE "eemci_db"');
        if (databases.length > 0) {
            console.log('✅ Database "eemci_db" exists.');
        } else {
            console.log('❌ Database "eemci_db" does NOT exist.');
        }

        const [tables] = await db.execute('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
