import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { app } from './app';
import { CompetitionModel } from './models/Competition';
import { PaymentModel } from './models/Payment';

const now = Date.now();
const competitionData = {
  slug: 'concurrency-test',
  title: 'Concurrency Test',
  category: 'Dance',
  description: 'Integration test competition',
  coverImage: 'https://example.com/cover.jpg',
  startsAt: new Date(now - 60_000),
  endsAt: new Date(now + 60_000),
  capacity: 1,
  prizePool: 100,
  entryFee: 10,
  judge: { name: 'Test Judge', role: 'Judge', experience: '1 year', image: 'https://example.com/judge.jpg' },
  registrationClosesAt: new Date(now + 60_000),
  submissionStartsAt: new Date(now + 60_000),
  submissionEndsAt: new Date(now + 120_000),
  resultDate: new Date(now + 180_000),
  winners: [],
  rewards: [],
  judgingParameters: 'Technique',
  rules: 'One entry',
  participantIds: []
};

async function run() {
  const mongo = await MongoMemoryServer.create();
  try {
    await mongoose.connect(mongo.getUri());
    const competition = await CompetitionModel.create(competitionData);
    process.env.RAZORPAY_WEBHOOK_SECRET = 'integration-webhook-secret';
    const webhookPayload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_integration', order_id: 'order_integration' } } } };
    const webhookBody = JSON.stringify(webhookPayload);
    const webhookSignature = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(webhookBody).digest('hex');
    const invalidWebhook = await request(app).post('/api/payments/webhook').set('x-razorpay-event-id', 'evt_invalid').set('x-razorpay-signature', 'invalid').set('content-type', 'application/json').send(webhookBody);
    assert.equal(invalidWebhook.status, 401);
    const webhook = await request(app).post('/api/payments/webhook').set('x-razorpay-event-id', 'evt_integration').set('x-razorpay-signature', webhookSignature).set('content-type', 'application/json').send(webhookBody);
    assert.equal(webhook.status, 200);
    const duplicateWebhook = await request(app).post('/api/payments/webhook').set('x-razorpay-event-id', 'evt_integration').set('x-razorpay-signature', webhookSignature).set('content-type', 'application/json').send(webhookBody);
    assert.equal(duplicateWebhook.status, 200);
    assert.equal(await PaymentModel.countDocuments({ eventId: 'evt_integration' }), 1);
    const ready = await request(app).get('/ready');
    assert.equal(ready.status, 200);
    assert.equal(ready.body.database, false, 'readiness is set by the production server after startup');
    const metrics = await request(app).get('/metrics');
    assert.equal(metrics.status, 200);
    assert.match(metrics.text, /feedants_http_requests_total/);
    const invalidRegistration = await request(app).post('/api/auth/register').send({ name: '', email: 'not-an-email', password: 'short' });
    assert.equal(invalidRegistration.status, 400);
    assert.equal(invalidRegistration.body.code, 'INVALID_INPUT');
    const userIds = Array.from({ length: 12 }, (_, index) => `concurrent-user-${index}`);
    const unauthenticated = await request(app).get(`/api/competitions/${competition.slug}`);
    assert.equal(unauthenticated.status, 401);
    const authResponses = await Promise.all(userIds.map((userId) => request(app)
      .post('/api/auth/register')
      .send({ name: userId, email: `${userId}@example.com`, password: 'password-123' })));
    assert.ok(authResponses.every((response) => response.status === 201));
    const tokens = authResponses.map((response) => response.body.token as string);
    const authenticatedUserIds = authResponses.map((response) => response.body.user.id as string);
    const login = await request(app).post('/api/auth/login').send({ email: 'concurrent-user-0@example.com', password: 'password-123' });
    assert.equal(login.status, 200);
    assert.equal(typeof login.body.token, 'string');

    const responses = await Promise.all(tokens.map((token) => request(app)
      .post(`/api/competitions/${competition.id}/register`)
      .set('authorization', `Bearer ${token}`)));

    const successful = responses.filter((response) => response.status === 201);
    const rejected = responses.filter((response) => response.status === 409);
    assert.equal(successful.length, 1, 'exactly one concurrent request should claim the only spot');
    assert.equal(rejected.length, userIds.length - 1, 'all other concurrent requests should be rejected');
    assert.ok(rejected.every((response) => response.body.code === 'FULL'));

    const stored = await CompetitionModel.findById(competition.id).lean();
    assert.ok(stored);
    assert.equal(stored.participantIds.length, 1, 'MongoDB must persist only one participant');
    const winnerIndex = responses.findIndex((response) => response.status === 201);
    assert.equal(stored.participantIds[0], authenticatedUserIds[winnerIndex], 'the successful user must be the persisted participant');

    const duplicate = await request(app)
      .post(`/api/competitions/${competition.id}/register`)
      .set('authorization', `Bearer ${tokens[winnerIndex]}`);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.code, 'ALREADY_REGISTERED');

    console.log('competition concurrency integration tests passed');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });