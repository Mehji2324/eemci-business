-- ============================================================
-- EEMCI Platform — Professor Seed Script
-- Run this in MySQL after importing eemci.sql
-- Password for ALL professors: Prof@2025
-- Hash generated with bcrypt rounds=10
-- ============================================================

USE eemci_db;

-- Add modules column to professors_info if not already present
ALTER TABLE professors_info
    ADD COLUMN IF NOT EXISTS modules TEXT DEFAULT NULL COMMENT 'Comma-separated module names';

-- ============================================================
-- Seed Professors (password = "Prof@2025")
-- Hashed: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGa07dYc60KHx1.VAi
-- ============================================================

-- Clear existing professors for clean re-seed (optional)
-- DELETE FROM professors_info WHERE 1=1;
-- DELETE FROM users WHERE role='professor';

-- Professor 1 — Ahmed Benali (Informatique)
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
(101, 'Ahmed Benali', 'ahmed.benali@eemci.edu.ma',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGa07dYc60KHx1.VAi',
 'professor');

INSERT IGNORE INTO professors_info (user_id, academic_email, department, modules) VALUES
(101, 'ahmed.benali@eemci.edu.ma',
 'Développement Informatique',
 'Algorithmes et Structures de Données,Programmation Web,Base de Données');

-- Professor 2 — Fatima Zahra Moussaoui (Réseaux)
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
(102, 'Fatima Zahra Moussaoui', 'fatima.moussaoui@eemci.edu.ma',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGa07dYc60KHx1.VAi',
 'professor');

INSERT IGNORE INTO professors_info (user_id, academic_email, department, modules) VALUES
(102, 'fatima.moussaoui@eemci.edu.ma',
 'Systèmes et Réseaux',
 'Administration Réseaux,Sécurité Informatique,Protocoles de Communication');

-- Professor 3 — Youssef El Amrani (Informatique)
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
(103, 'Youssef El Amrani', 'youssef.amrani@eemci.edu.ma',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGa07dYc60KHx1.VAi',
 'professor');

INSERT IGNORE INTO professors_info (user_id, academic_email, department, modules) VALUES
(103, 'youssef.amrani@eemci.edu.ma',
 'Développement Informatique',
 'Développement Mobile,Architecture Logicielle,DevOps et CI/CD');

-- Professor 4 — Nadia Rachidi (Réseaux)
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
(104, 'Nadia Rachidi', 'nadia.rachidi@eemci.edu.ma',
 '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGa07dYc60KHx1.VAi',
 'professor');

INSERT IGNORE INTO professors_info (user_id, academic_email, department, modules) VALUES
(104, 'nadia.rachidi@eemci.edu.ma',
 'Systèmes et Réseaux',
 'Virtualisation,Cloud Computing,Systèmes Linux');

-- ============================================================
-- Verify inserted professors
-- ============================================================
SELECT u.id, u.name, u.email, u.role, pi.academic_email, pi.department, pi.modules
FROM users u
LEFT JOIN professors_info pi ON u.id = pi.user_id
WHERE u.role = 'professor';
