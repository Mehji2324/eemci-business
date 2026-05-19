const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/users', adminController.getUsers);
router.post('/add-user', adminController.addUser);
router.delete('/delete-user/:id', adminController.deleteUser);
router.get('/stats', adminController.getStats);
router.get('/grades', adminController.getAllGrades);
router.get('/attendance', adminController.getAllAttendance);

module.exports = router;
