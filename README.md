# Feedants Competition Details Screen — Full-Stack Technical Assignment

A production-ready full-stack implementation of the Feedants Competition Details module built with **React Native (Expo)**, **Node.js + Express.js**, and **MongoDB**.

---

## 🔗 Submission Details

* **GitHub Repository**: [https://github.com/Akshayvardhan/Feedants.git](https://github.com/Akshayvardhan/Feedants.git)
* **Frontend Framework**: React Native (Expo SDK 57)
* **Backend Framework**: Node.js + Express.js
* **Database**: MongoDB (Mongoose ODM)
* **Payment Gateway**: Razorpay (API Orders + Web Checkout Popup)

---

## 🚀 Quick Start & Running Instructions

### Prerequisites
- **Node.js**: 20+ (Required for Expo SDK 57)
- **npm**: 10+
- **MongoDB**: Local MongoDB server running on `mongodb://127.0.0.1:27017/feedants` or a MongoDB Atlas URI.

### 1. Installation & Setup
```bash
# Clone repository
git clone https://github.com/Akshayvardhan/Feedants.git
cd Feedants

# Install monorepo dependencies
npm install

# Setup environment configuration
cp .env.example .env
```

### 2. Start the Backend API
```bash
npm run dev:api
```
* **Endpoint**: Runs on `http://localhost:4000`.
* **Database Seeding**: Automatically seeds the default `urban-textures` competition (*"Feedants Classical Dance"*) on initial startup.

### 3. Start the React Native Expo Application
In a separate terminal window:
```bash
npm run dev:mobile
```
* **Web Preview**: Open [http://localhost:8081](http://localhost:8081) in Google Chrome, Safari, or Arc.
* **Mobile Phone / Simulator**: Scan the terminal QR code with **Expo Go** (iOS / Android) or press `i` for iOS Simulator / `a` for Android Emulator.

---

## ⚙️ Required Environment Variables (`.env`)

Create a `.env` file in the project root:

```env
# Server Port
PORT=4000

# Database URI
MONGODB_URI=mongodb://127.0.0.1:27017/feedants

# Authentication Secret
JWT_SECRET=a819e81e81e175baf03fcbcd3f71a6d2a834d92a7230482d1ea0aa87dd57f4dc

# Razorpay Payment Credentials
RAZORPAY_KEY_ID=rzp_test_TfnyIYKkvrbBqN
RAZORPAY_KEY_SECRET=s4AJWZ2vTjF3e8i5QlukkE9A
RAZORPAY_WEBHOOK_SECRET=068fe46d55d0cc8a511197cb91f2bb33f9a542c64e0c97857d69530203877e82
```

---

## 🧪 Verification & Automated Tests

Run the TypeScript build check and full automated integration test suite:

```bash
# 1. Type check across all monorepo workspaces
npm run build

# 2. Run unit and concurrency integration tests
npm test
```

### What `npm test` Verifies:
* `src/competition.test.ts`: Validates dynamic lifecycle status calculations (`upcoming`, `open`, `closed`).
* `src/competition.integration.test.ts`: Sends **12 parallel registration requests** simultaneously to a 1-slot competition. Confirms that MongoDB atomic operations allow exactly 1 winner, return `FULL` for the remaining 11, and reject duplicate attempts with `ALREADY_REGISTERED`.

---

## 📌 Important Assumptions Made

1. **User Authentication Flow**: User authentication uses email/password credentials with bcrypt password hashing (cost factor 12) and signed JSON Web Tokens (JWT). The client registers an account before interacting with competition registration.
2. **Competition Lifecycle Derivation**: Competition lifecycle (`upcoming`, `open`, `closed`) is **dynamically derived** on read from `startsAt` and `endsAt` timestamps, preventing status drift or out-of-sync cron state.
3. **Data Availability**: Seeding is idempotent and ensures that the competition details, judges, previous winners, and reward tiers exist upon application launch.

---

## 💡 Major Technical Decisions

1. **Atomic Concurrency Control (Zero Race Conditions)**:
   Registration uses a single MongoDB `findOneAndUpdate` operation with `$addToSet` and `$size` checks:
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
   This guarantees that even under thousands of concurrent registration attempts, overbooking is mathematically impossible without requiring distributed locks.

2. **Genuine Razorpay Integration**:
   - Backend creates server-side orders via the official `razorpay` SDK (`POST /api/payments/competitions/:id/order`).
   - Web frontend dynamically loads official `https://checkout.razorpay.com/v1/checkout.js` and opens the genuine Razorpay Checkout Popup window (`rzp_test_TfnyIYKkvrbBqN`).
   - Webhook endpoint (`POST /api/payments/webhook`) validates `X-Razorpay-Signature` HMAC SHA-256 signatures and logs events idempotently.

3. **Observability & Health Probes**:
   - `/health`: Liveness probe.
   - `/ready`: Database connectivity readiness probe.
   - `/metrics`: Prometheus-compatible endpoint exposing request latency, throughput, and Node.js process metrics.

---

## ⚖️ Trade-offs Considered

1. **Embedded vs. Separate Participant Collection**: Storing `participantIds` array directly on the Competition document optimizes single-query reads and atomic updates for normal competition sizes. For ultra-high volume scale (100k+ registrations per event), registrations would be decoupled into a separate `Registrations` collection with a counter.
2. **In-Memory Rate Limiting**: `express-rate-limit` is configured in-memory for simplicity. A distributed production environment with multiple API instances would back this with Redis.

---

## 🚀 Future Production Improvements

1. **Refresh Token Rotation**: Implement short-lived access tokens (15m) paired with HTTP-only refresh tokens stored in Redis.
2. **CDN Media Asset Optimization**: Serve judge avatars, winner media, and video streams through AWS CloudFront or Cloudflare R2 with image optimization.
3. **Reconciliation Cron Job**: Add an automated background job for Razorpay order state reconciliation in cases where client browser tabs close before webhook delivery.
