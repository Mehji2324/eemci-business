const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const professorController = require('../controllers/professorController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ─── Multer Storage Config ───────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'backend/uploads/');
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.docx', '.pptx', '.xlsx', '.zip', '.png', '.jpg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed.`));
        }
    }
});

// ─── Protect all routes: must be authenticated + professor ───────────────────
router.use(authMiddleware);
router.use(roleMiddleware(['professor']));

// ─── Routes ──────────────────────────────────────────────────────────────────
router.get('/profile',           professorController.getProfile);
router.get('/students',          professorController.getStudents);
router.get('/my-courses',        professorController.getMyCourses);
router.get('/attendance',        professorController.getAttendanceRecords);
router.get('/export',            professorController.exportData);

router.post('/upload-course',    upload.single('courseFile'), professorController.uploadCourse);
router.post('/add-grade',        professorController.addGrade);
router.post('/mark-attendance',  professorController.markAttendance);
router.post('/bulk-attendance',  professorController.bulkMarkAttendance);

module.exports = router;
