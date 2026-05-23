/**
 * Payment Model
 * Defines the structure for student payment tracking
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
  amount: { type: Number, required: true },
  paid_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
