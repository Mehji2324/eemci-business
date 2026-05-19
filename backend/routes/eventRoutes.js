const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const eventController = require('../controllers/eventController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `plan-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Public routes (All authenticated users)
router.get('/', authMiddleware, eventController.getAllEvents);
router.get('/type/:type', authMiddleware, eventController.getEventsByType);

// Admin only routes
router.post('/', authMiddleware, roleMiddleware(['admin']), upload.single('planFile'), eventController.createEvent);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), eventController.deleteEvent);

module.exports = router;
