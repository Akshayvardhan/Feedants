import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  event: { type: String, required: true },
  orderId: { type: String, index: true },
  paymentId: { type: String, index: true },
  status: { type: String, enum: ['created', 'captured', 'failed'], required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, required: true }
}, { timestamps: true, versionKey: false });

export const PaymentModel = model('Payment', paymentSchema);