const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/read/:id', markAsRead);
router.put('/read-all', markAllAsRead);

module.exports = router;
