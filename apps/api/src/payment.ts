import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import Razorpay from 'razorpay';
import { CompetitionModel } from './models/Competition';
import { requireAuth } from './auth';
import { objectIdSchema, validateParam } from './validation';
import { PaymentModel } from './models/Payment';

export const paymentRouter = Router();
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
function validSignature(payload: Buffer, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) return false;
  const expected = createHmac('sha256', webhookSecret).update(payload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

paymentRouter.post('/webhook', async (request, response, next) => {
  try {
    if (!request.rawBody || !validSignature(request.rawBody, request.header('x-razorpay-signature') || '')) {
      return response.status(401).json({ error: 'Invalid webhook signature', code: 'INVALID_WEBHOOK_SIGNATURE' });
    }
    const eventId = request.header('x-razorpay-event-id');
    if (!eventId) return response.status(400).json({ error: 'Missing webhook event id', code: 'INVALID_WEBHOOK' });
    const event = request.body as any;
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const status = event.event === 'payment.captured' || event.event === 'order.paid' ? 'captured' : event.event === 'payment.failed' ? 'failed' : 'created';
    await PaymentModel.updateOne(
      { eventId },
      { $setOnInsert: { eventId, event: event.event || 'unknown', orderId: paymentEntity?.order_id || orderEntity?.id, paymentId: paymentEntity?.id, status, payload: event, receivedAt: new Date() } },
      { upsert: true }
    );
    return response.json({ received: true });
  } catch (error) { return next(error); }
});

paymentRouter.post('/competitions/:id/order', requireAuth, validateParam('id', objectIdSchema), async (request, response, next) => {
  try {
    if (!razorpay) return response.status(503).json({ error: 'Payments are not configured', code: 'PAYMENTS_NOT_CONFIGURED' });
    const competition = await CompetitionModel.findById(request.params.id).lean();
    if (!competition) return response.status(404).json({ error: 'Competition not found', code: 'NOT_FOUND' });
    if (!competition.participantIds.includes(request.userId!)) return response.status(403).json({ error: 'Register before starting payment', code: 'NOT_REGISTERED' });
    if (new Date() >= competition.endsAt) return response.status(409).json({ error: 'Competition is closed', code: 'NOT_OPEN' });
    const order = await razorpay.orders.create({ amount: competition.entryFee * 100, currency: 'INR', receipt: `competition_${competition._id.toString()}`, notes: { competitionId: competition._id.toString(), userId: request.userId! } });
    return response.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  } catch (error) { return next(error); }
});