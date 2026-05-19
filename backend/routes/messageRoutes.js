const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/send', messageController.sendMessage);
router.get('/inbox', messageController.getInbox);
router.get('/sent', messageController.getSentMessages);
router.get('/recipients', messageController.getRecipients);
router.put('/read/:id', messageController.markAsRead);

module.exports = router;
