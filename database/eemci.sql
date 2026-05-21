-- Create Database
CREATE DATABASE IF NOT EXISTS eemci_db;
USE eemci_db;

-- Users Table (Unified for all roles)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'professor', 'admin') NOT NULL,
    raw_password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Info Table (Extends users table for students)
CREATE TABLE IF NOT EXISTS students_info (
    user_id INT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    department ENUM('Développement Informatique', 'Systèmes et Réseaux') NOT NULL,
    academic_email VARCHAR(100) UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Professors Info Table (Extends users table for professors)
CREATE TABLE IF NOT EXISTS professors_info (
    user_id INT PRIMARY KEY,
    academic_email VARCHAR(100) UNIQUE,
    department ENUM('Développement Informatique', 'Systèmes et Réseaux'),
    modules TEXT, -- Stores comma-separated modules or JSON
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    professor_id INT,
    department ENUM('Développement Informatique', 'Systèmes et Réseaux'),
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Grades Table
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    module VARCHAR(100) NOT NULL,
    note DECIMAL(4, 2) NOT NULL,
    type ENUM('exam', 'assignment') DEFAULT 'exam',
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    module VARCHAR(100) NOT NULL,
    status ENUM('present', 'absent', 'retard') NOT NULL,
    date DATE DEFAULT (CURRENT_DATE),
    professor_id INT,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Schedule Table
CREATE TABLE IF NOT EXISTS schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    type ENUM('study', 'exam') NOT NULL,
    day VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    module VARCHAR(100) NOT NULL
);

-- Events Table (Activities, Debates, Trips, Plans)
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATETIME NOT NULL,
    location VARCHAR(255),
    type ENUM('exam_plan', 'course_plan', 'event', 'debate', 'trip') NOT NULL,
    file_path VARCHAR(255), -- Path for uploaded plans
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- Sample Data
-- Super Admin (Email: admin.eemci@eemci.com | Pass: Admin@2026)
INSERT INTO users (name, email, password, role) VALUES 
('Super Admin', 'admin.eemci@eemci.com', '$2b$10$P839s1R3aDSl.242RH62lugdbCkzIuY475TgnHmlDT.kWRq8COMTS', 'admin');

-- IT Manager (Email: it.manager@eemci.com | Pass: EEMCI_IT_2026)
INSERT INTO users (name, email, password, role) VALUES 
('IT Manager', 'it.manager@eemci.com', '$2b$10$JVnPoUyDVrF5eRtU3hsZL.XisDvgHZzZfERatilZSh0mC7joLNO0.', 'admin');

-- Sample Professor
INSERT INTO users (name, email, password, role) VALUES 
('Dr. Smith', 'smith.prof@eemci.edu.ma', '$2b$10$P839s1R3aDSl.242RH62lugdbCkzIuY475TgnHmlDT.kWRq8COMTS', 'professor');
INSERT INTO professors_info (user_id, academic_email, department, modules) VALUES (3, 'smith.prof@eemci.edu.ma', 'Développement Informatique', 'Web Development, Database');

-- Sample Student
INSERT INTO users (name, email, password, role) VALUES 
('John Doe', 'john.doe@eemci.edu.ma', '$2b$10$P839s1R3aDSl.242RH62lugdbCkzIuY475TgnHmlDT.kWRq8COMTS', 'student');
INSERT INTO students_info (user_id, group_name, department, academic_email) VALUES (4, 'Group A', 'Développement Informatique', 'john.doe@eemci.edu.ma');
