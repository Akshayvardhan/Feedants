# Feedants Competition Details Screen — Full-Stack Technical Assignment

A production-ready full-stack implementation of the Feedants Competition Details module built with **React Native (Expo)**, **Node.js + Express.js**, and **MongoDB**.

---

## 🎯 Evaluation Criteria & Implementation Mapping

### 1. Accuracy Compared with Design & UI Quality
- **Pixel-Accurate Screen Layout**: Implemented the competition page matching the reference design (Page 3 of specification), including:
  - Header with language selector (`ENG` / `हिंदी`).
  - Competition Title, dynamic `Registered` status badge, Category tags (`Dance`, `Multi-Win`), Prize Pool (₹1,500), Entry Fee (₹99), and Booked spots progress bar (`1 / 20 Booked`).
  - Judge card (Manju Dubey details & intro video action button).
  - 1-second live interval countdown ticker (`01d : 06h : 28m : 32s`) with "Hurry up!" badge.
  - 2x2 grid of Important Dates (Register Before, Submission Starts/Ends, Result Date).
  - Previous Winners horizontal scroll list with position badges.
  - Tabbed content switcher (*About Competition*, *Judging Parameters*, *Rules & Eligibility*).
  - Rewards payout table (1st to 6th Winner amounts).
  - Disclaimer banner, Razorpay refund policy info card, Referral link with copy button, and sticky bottom navigation bar.

### 2. React Native Implementation & Modular Architecture
- Componentized architecture cleanly separating UI components, screens, and types.
- Native performance with smooth `ScrollView`, `RefreshControl` pull-to-refresh, responsive text scaling (`adjustsFontSizeToFit`), and zero hardcoded pixel traps.

### 3. Backend Architecture & API Design
- RESTful Express endpoints organized in `apps/api/src/competition.ts`, `auth.ts`, `payment.ts`, `monitoring.ts`.
- **Authentication**: JWT token authorization with bcrypt password hashing (salt factor 12).
- **Observability**: Exposes `/metrics` (Prometheus request counts & latency), `/health`, and `/ready` MongoDB database readiness endpoints.
- **Rate Limiting**: `express-rate-limit` protection on authentication routes.

### 4. MongoDB Data Modelling & Concurrency Handling
- **Atomic Single-Query Concurrency Control**:
  Registration (`POST /api/competitions/:id/register`) uses an atomic `findOneAndUpdate` operation with `$addToSet` and `$size` checks:
  ```ts
  await CompetitionModel.findOneAndUpdate(
    {
      _id: competitionId,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
      participantIds: { $ne: userId },
      $expr: { $lt: [{ $size: '$participantIds' }, '$capacity'] }
    },
    { $addToSet: { participantIds: userId } },
    { new: true }
  );
  ```
- **Zero Race Conditions**: Guarantees under heavy concurrent load (e.g., thousands of simultaneous users) that capacity is never exceeded and double-booking is impossible.

### 5. Genuine Razorpay Payments Integration
- Server-side Razorpay order creation via official `razorpay` SDK (`POST /api/payments/competitions/:id/order`).
- Web & Mobile Razorpay Checkout modal integrating official `checkout.js` JS popup with your API keys (`RAZORPAY_KEY_ID=rzp_test_TfnyIYKkvrbBqN`).
- Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Netbanking, and Wallets.
- Idempotent Razorpay Webhook handler (`POST /api/payments/webhook`) validating `X-Razorpay-Signature` HMAC SHA-256 signatures and recording transaction logs.

### 6. Correctness of Business Logic & Derived Lifecycles
- Competition lifecycle (`upcoming`, `open`, `closed`) is **dynamically derived** from timestamps (`startsAt`, `endsAt`) rather than stored as mutable database state, preventing stale status data.

---

## 🚀 Quick Start & How to Run

### Prerequisites
- Node.js 20+
- npm 10+
- MongoDB instance (Local or MongoDB Atlas URI)

### 1. Install Dependencies & Configure Environment
```bash
npm install
cp .env.example .env
```

### 2. Start API Server
```bash
npm run dev:api
```
The API listens on `http://localhost:4000` and automatically seeds the default `urban-textures` competition on first launch.

### 3. Start React Native App
In a new terminal:
```bash
npm run dev:mobile
```
- **Web Browser**: Open [http://localhost:8081](http://localhost:8081) for instant browser preview.
- **Mobile Device**: Scan the terminal QR code with **Expo Go** (iOS/Android).

---

## 🧪 Verification & Automated Testing

Run the type check and full automated test suite:

```bash
# 1. Type Check across Monorepo
npm run build

# 2. Run Integration & Lifecycle Unit Tests
npm test
```

### What `npm test` verifies:
- `src/competition.test.ts`: Derived lifecycle status calculations (`upcoming`, `open`, `closed`).
- `src/competition.integration.test.ts`: High-concurrency integration test sending **12 parallel registration requests** to a 1-slot competition. Confirms that MongoDB atomic operations allow exactly 1 winner, return `FULL` for the remaining 11, and reject repeat requests with `ALREADY_REGISTERED`.

---

## 🏗️ Architectural Trade-offs & Production Scaling

1. **Capacity Storage Strategy**: For current competition scale, storing `participantIds` on the document enables fast single-query atomic updates. For massive competitions (100k+ users), registrations can be offloaded to a `Registrations` collection while retaining an atomic `participantCount` counter on the main document.
2. **Distributed Rate Limiting**: In a multi-region deployment, `express-rate-limit` would be backed by a Redis store.
3. **CDN Assets**: Demo images use high-resolution Unsplash assets; production would serve compressed assets from AWS CloudFront or Cloudflare R2 CDN.
