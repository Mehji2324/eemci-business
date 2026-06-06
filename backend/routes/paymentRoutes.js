const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// All payment routes require authentication
router.use(authMiddleware);

// Students can see their own history
router.get('/my-history', paymentController.getMyHistory);

// Admin-only routes
router.use(roleMiddleware(['admin']));

router.get('/fees', paymentController.getAllFees);
router.put('/fees', paymentController.updateFee);
router.get('/students', paymentController.getStudentsByFiliere);
router.put('/record', paymentController.recordPayment);
router.get('/history/:studentId', paymentController.getStudentHistory);

module.exports = router;
