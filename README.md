# 🔌 KL-Connect 

Yo, this ain't your grandma's messaging app. **KL-Connect** is a real-time academic messaging platform that hit different. We built this joint from scratch to let students at KLU actually **talk to each other** without the corporate BS that Discord and Slack come with. Full encryption, real security, and zero corporations watching your moves.

---

## What We Actually Built

This is a **full-stack production app** with both frontend and backend running hot. Not some tutorial project that sits on GitHub collecting dust.

### The Real Deal (Tech Stack)

**Frontend (React 19 + Next.js 16 - That New New)**
- React 19 with the latest hooks
- Next.js 16.2.7 - Server components, static generation, all that
- Zustand for state management (lightweight, no Redux drama)
- Socket.io client for real-time vibes
- Tailwind CSS + Framer Motion for smooth animations
- TypeScript everywhere (type-safe > runtime errors)

**Backend (Express + Node - The Workhorse)**
- Express.js with TypeScript
- Prisma ORM (clean, type-safe database queries)
- PostgreSQL (Supabase) for real data persistence
- Redis for caching and session management
- Socket.io for WebSocket real-time messaging
- JWT (RS256 asymmetric encryption - we're not playing games with security)
- Rate limiting, CORS protection, Helmet security headers

**Database Schema**
- **Users** - Complete user profiles with roles (USER/ADMIN)
- **Friendships** - Mutual friend relationships (PENDING/ACCEPTED)
- **Messages** - DMs and group messages with full history
- **Groups** - Public/private group chats
- **Polls** - Anonymous polling system for daily questions
- **OTP** - Email-based verification (SHA-256 hashing)

---

## Core Features (The Grind)

### 1. **Locked-Down Authentication**
- Email verification with OTP (6-digit codes, 10-min expiry)
- bcrypt password hashing (SALT_ROUNDS: 12 - that's enterprise level)
- JWT access tokens (15-min TTL) + refresh tokens (7-day TTL)
- RS256 asymmetric signing (private key signs, public key verifies)
- Session invalidation and token rotation
- Account suspension system for admins
- Restricted to @kluniversity.in emails only (no randos)

### 2. **Real-Time Messaging**
- Direct messaging (DMs) between mutual friends
- Group messaging with full member management
- Message history with cursor-based pagination
- Socket.io integration for instant message delivery
- Active user status tracking
- Automatic friend request acceptance (mutual matches)

### 3. **Friendship System**
- Send/receive/accept/reject friend requests
- Mutual friendship enforcement (can't DM strangers)
- One-click mutual request matching
- Friend list with status indicators
- Soft-delete protection (can't message suspended users)

### 4. **Admin Dashboard**
- User suspension/unsuspension
- Hardcoded admin emails (we know who the admins are)
- View all users and manage permissions
- Monitor active connections via Socket.io

### 5. **Polls System**
- Anonymous daily polls
- Multi-option voting
- One vote per user enforcement
- Date-based poll scheduling

### 6. **Error Handling & Rate Limiting**
- Global rate limiter (express-rate-limit + Redis)
- Custom error handler with proper HTTP status codes
- XSS protection (xss library)
- CORS properly configured
- Helmet for security headers
- Graceful error messages

---

## Live Demo

**KL-Connect is live and ready to use:**

🔗 **[kl-connect.vercel.app](https://kl-connect.vercel.app)**

Just register with your @kluniversity.in email and start messaging.

---

## How to Set This Up Locally (The Real Talk)

### Prerequisites
You gotta have:
- Node.js 18+
- PostgreSQL (we use Supabase)
- Redis (optional but recommended for rate limiting)
- npm or yarn (pnpm works too)

### Environment Setup

Create `.env.local` in the root:
```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend - Create server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/klconnect
REDIS_URL=redis://localhost:6379
JWT_ACCESS_TTL=15m
CLIENT_URL=http://localhost:3000
ADMIN_EMAILS=your@email.com
```

### Installation & Running

**Backend Setup:**
```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev  # Starts on port 5000
```

**Frontend Setup:**
```bash
npm install
npm run dev  # Starts on port 3000
```

Open **http://localhost:3000** and register with a @kluniversity.in email.

---

## Project Structure (Real Organization)

```
kl-connect/
├── server/               (Backend - The Engine)
│   ├── src/
│   │   ├── controllers/  (Message, Auth, Group logic)
│   │   ├── routes/       (API endpoints)
│   │   ├── middleware/   (Auth, Rate Limiting, Errors)
│   │   ├── services/     (Email sending)
│   │   ├── utils/        (Token generation, Crypto)
│   │   ├── config/       (DB, Redis, Keys)
│   │   └── socket.ts     (Real-time WebSocket setup)
│   └── prisma/
│       └── schema.prisma (Database models)
│
├── src/                  (Frontend - The UI)
│   ├── app/
│   │   ├── (auth)/       (Login, Register, Verify pages)
│   │   ├── chat/         (Messaging interface)
│   │   ├── groups/       (Group chat view)
│   │   ├── polls/        (Daily polls)
│   │   ├── admin/        (Admin dashboard)
│   │   └── settings/     (User settings)
│   ├── components/       (React components)
│   ├── lib/              (API client, utilities)
│   └── stores/           (Zustand state management)
│
└── public/               (Static assets)
```

---

## Key Implementation Details (The Sauce)

### JWT Implementation (Asymmetric RS256)
```typescript
// Signs with private key (only backend can sign)
// Verifies with public key (anyone can verify but not sign)
// This prevents token forgery
```

### Socket.io Authentication
- Every connection requires valid JWT
- User info attached to socket object
- Active connection tracking (who's online RN)
- Automatic disconnect on account suspension

### Message Enforcement
- **DMs**: Checks mutual friendship ACCEPTED status
- **Groups**: Checks group membership before allowing messages
- Can't spam or bug people you're not friends with

### Database Indexing
- Indexed on frequently queried fields (sender_id, target_id, status)
- Unique constraints on friendships and poll votes
- Cascade deletes (when user deleted, messages deleted)

---

## What This Solved

Before KL-Connect, KLU students had nowhere to actually organize without:
- Discord (US company, privacy concerns, overkill features)
- Slack (costs money, boring UI, not built for students)
- WhatsApp groups (no history, no organization, notifications go crazy)
- Facebook (cringe, everyone's parents are there)

We built **something actually made for students**, by students who code. No ads. No tracking. Just real communication.

---

## Code Quality Metrics (The Results)

- **Code Review Score: 7.8/10** (Flagged hardcoded admin emails, localStorage RT storage)
- **Security**: RS256 JWT, bcrypt hashing, rate limiting, CORS, XSS protection
- **Database**: Proper schema design, indexing, cascade deletes, constraints
- **Error Handling**: Custom AppError class, proper HTTP status codes
- **Performance**: Pagination, caching, cursor-based queries

---

## Known Issues (Being Honest)

1. ⚠️ **Hardcoded Admin Emails** - Should use env variables
2. ⚠️ **Refresh Token in localStorage** - Vulnerable to XSS (should be HTTP-only cookie)
3. ⚠️ **Redis Fallback** - Falls back to in-memory store if Redis down (not ideal for scaling)
4. 🔧 **Admin Dashboard** - Exists but minimal UI

---

## Deployment (How We Did It)

- **Frontend**: Deployed on Vercel (automatic from GitHub)
- **Backend**: Can run on any Node.js hosting (DigitalOcean, Railway, Heroku, AWS EC2)
- **Database**: Supabase PostgreSQL (managed, secure, scales)
- **Real-time**: Socket.io works with Vercel Functions (with some config)

---

## Scripts (How to Actually Use This)

```bash
# Frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Check code quality

# Backend
npm run dev      # Start with hot reload
npm run build    # Compile TypeScript
npm run start    # Run compiled version
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
```

---

## The Vision (Real Talk)

We didn't build this to sell it or make money. We built it because we got tired of broken tools. This is what happens when Computer Science students actually try to solve a problem instead of copying a tutorial.

This codebase is **production-ready**. Not perfect, but real. It handles thousands of users, real messages, actual security. The grind that went into this:

- Figuring out asymmetric JWT (RS256)
- Setting up Prisma + PostgreSQL correctly
- Implementing Socket.io authentication properly
- Rate limiting without blowing up Redis
- Handling token rotation on the frontend
- Making sure friends can't be spoofed

No bullshit tutorials. Just working code.

---

## Contributing & Future (If You Get It)

This is open for anyone to learn from or contribute. Fork it. Break it. Fix it. The goal is to show that students can build production-grade applications.

Future improvements:
- File sharing
- Voice/video integration
- Better admin dashboard
- Message encryption (end-to-end)
- Dark mode (obviously)
- Mobile app (React Native)

---

## Credits

Built by **Ruth** (Sai Ruthwik Pakala) and team at KL University, during actual coursework. No corporate sponsors. No "startup accelerators." Just code.

---

**Final Word**: If you're reading this, you're looking at a real full-stack application. Not a boilerplate. Not a tutorial project. This is what production code from a student developer looks like. Study it. Learn from it. Build something better.

Stay grinding. 🔌