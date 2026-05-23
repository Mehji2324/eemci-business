/**
 * Payment Routes
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware: protect } = require('../middleware/auth');

router.get('/', protect, paymentController.fetchPayments);
router.put('/status', protect, paymentController.updateStatus);
router.get('/history/:studentId', protect, paymentController.fetchHistory);

module.exports = router;
