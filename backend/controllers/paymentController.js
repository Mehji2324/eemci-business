const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/payments/fees
 * Returns fee configuration for all filières
 */
exports.getAllFees = asyncHandler(async (req, res) => {
    const fees = await Payment.getAllFees();
    res.json({ success: true, data: fees });
});

/**
 * PUT /api/payments/fees
 * Body: { filiere, monthly_fee }
 * Admin sets the monthly fee for a filière
 */
exports.updateFee = asyncHandler(async (req, res) => {
    const { filiere, monthly_fee } = req.body;
    if (!filiere || monthly_fee === undefined) {
        return res.status(400).json({ success: false, message: 'Filière and fee amount are required.' });
    }
    await Payment.updateFee(filiere, parseFloat(monthly_fee));
    res.json({ success: true, message: 'Fee updated successfully.' });
});

/**
 * GET /api/payments/students?filiere=...&month=...&year=...
 * Returns students with payment status for the given criteria
 */
exports.getStudentsByFiliere = asyncHandler(async (req, res) => {
    const { filiere, month, year } = req.query;
    if (!filiere || !month || !year) {
        return res.status(400).json({ success: false, message: 'filiere, month, and year are required.' });
    }
    const students = await Payment.getStudentsWithPayments(filiere, parseInt(month), parseInt(year));
    res.json({ success: true, data: students });
});

/**
 * PUT /api/payments/record
 * Body: { student_id, filiere, month, year, amount_paid }
 * Records or updates a payment entry
 */
exports.recordPayment = asyncHandler(async (req, res) => {
    const { student_id, filiere, month, year, amount_paid } = req.body;
    
    if (!student_id || !filiere || !month || !year || amount_paid === undefined) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const feeConfig = await Payment.getFeeByFiliere(filiere);
    if (!feeConfig) {
        return res.status(404).json({ success: false, message: 'Filière fee not configured.' });
    }

    await Payment.upsertPayment(
        student_id, 
        filiere, 
        parseInt(month), 
        parseInt(year),
        parseFloat(amount_paid), 
        feeConfig.monthly_fee, 
        req.user.id
    );

    res.json({ success: true, message: 'Payment recorded successfully.' });
});

/**
 * GET /api/payments/history/:studentId
 * Returns payment history for a specific student
 */
exports.getStudentHistory = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const history = await Payment.getPaymentHistory(studentId);
    res.json({ success: true, data: history });
});
