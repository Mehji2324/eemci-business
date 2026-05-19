const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(roleMiddleware(['student']));

router.get('/grades', studentController.getGrades);
router.get('/schedule', studentController.getSchedule);
router.get('/courses', studentController.getCourses);
router.get('/events', studentController.getEvents);

module.exports = router;
