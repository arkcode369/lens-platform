# Technical Design Document - AI Product Platform

> Enhanced Specification Implementation

## 1. System Architecture

### 1.1 Overview
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Auth**: Better Auth with 2FA (TOTP)
- **Payments**: Stripe
- **Deployment**: Docker + CI/CD

### 1.2 Tech Stack Details

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | SSR, API routes, type safety |
| Styling | Tailwind CSS + shadcn/ui | Responsive design, components |
| State | React Query (optional) | Server state management |
| Backend | Next.js API Routes | REST API endpoints |
| Database | PostgreSQL 15 | Relational data storage |
| ORM | Prisma 5 | Type-safe database access |
| Auth | Better Auth | Email/password + 2FA |
| Validation | Zod | Runtime type validation |
| Payments | Stripe | Subscription management |
| Testing | Jest + Playwright | Unit & E2E tests |
| CI/CD | GitHub Actions | Automated testing & deployment |

## 2. Database Schema

### 2.1 Complete Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTH MODELS (Better Auth)
// ============================================

model User {
  id                    String       @id @default(cuid())
  email                 String       @unique
  emailVerified         DateTime?
  passwordHash          String
  twoFactorSecret       String?
  twoFactorEnabled      Boolean      @default(false)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  
  accounts              Account[]
  sessions              Session[]
  validations           Validation[]
  subscription          Subscription?
  
  @@index([email])
  @@index([createdAt])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  tokenType         String?
  scope             String?
  idToken           String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionToken String   @unique
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([sessionToken])
  @@index([userId])
}

// ============================================
// CORE BUSINESS MODELS
// ============================================

model Validation {
  id                  String          @id @default(cuid())
  userId              String
  user                User            @relation(fields: [userId], references: [id])
  ideaDescription     String
  targetAudience      String?
  industry            String?
  
  // AI Analysis Results
  validationScore     Float?          // 0-100
  demandSignals       Json?           // { mentions, trends, sources }
  sentiment           Json?           // { positive, neutral, negative }
  painPoints          String[]
  keywords            String[]
  
  status              String          @default("pending") // pending, processing, completed, failed
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  
  competitors         Competitor[]
  interviews          Interview[]
  marketSize          MarketSize?
  mvpScope            MvpScope?
  landingPages        LandingPage[]
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@index([userId, createdAt])
}

model Competitor {
  id            String  @id @default(cuid())
  validationId  String
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  name          String
  url           String
  description   String?
  
  features      Json?   // [{name, description, status}]
  pricing       Json?   // [{plan, price, currency}]
  strengths     String[]
  weaknesses    String[]
  swot          Json?   // {strengths, weaknesses, opportunities, threats}
  
  analyzedAt    DateTime @default(now())
  
  @@index([validationId])
}

model Interview {
  id            String  @id @default(cuid())
  validationId  String
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  
  persona       String
  script        Json?   // Interview questions
  targetCount   Int     @default(10)
  
  transcripts   Json?   // [{question, answer, sentiment, timestamp}]
  themes        Json?   // [{name, count, quotes, sentiment}]
  insights      String[]
  completionRate Float?
  
  status        String  @default("pending") // pending, in_progress, completed
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  
  @@index([validationId])
  @@index([status])
}

model MarketSize {
  id            String  @id @default(cuid())
  validationId  String  @unique
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  
  tam           Float?  // Total Addressable Market (USD)
  sam           Float?  // Serviceable Addressable Market (USD)
  som           Float?  // Serviceable Obtainable Market (USD)
  growthRate    Float?  // Annual growth rate (%)
  confidence    Float?  // 0-1 confidence score
  sources       Json?   // [{name, url, date, metric}]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([validationId])
}

model MvpScope {
  id            String  @id @default(cuid())
  validationId  String  @unique
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  
  recommendedFeatures Json? // [{name, priority, rationale, effort, dependencies}]
  buildVsBuy    Json?   // {build: [], buy: [], integrate: []}
  totalEffort   String? // e.g., "3-4 months, 2 developers"
  risks         String[]
  recommendations String[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([validationId])
}

model LandingPage {
  id            String  @id @default(cuid())
  validationId  String
  validation    Validation @relation(fields: [validationId], references: [id], onDelete: Cascade)
  
  title         String
  headline      String
  subheadline   String?
  features      Json?   // [{title, description, icon, order}]
  testimonials  Json?   // [{name, role, quote, avatar}]
  ctaText       String  @default("Get Started")
  ctaLink       String?
  sections      Json?   // [{type, content, order}]
  
  status        String  @default("draft") // draft, published, archived
  publishedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([validationId])
  @@index([status])
}

model Subscription {
  id                      String  @id @default(cuid())
  userId                  String  @unique
  user                    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  stripeCustomerId        String
  stripeSubscriptionId    String?
  
  plan                    String  // individual, team, enterprise
  status                  String  // active, canceled, past_due, trialing
  currentPeriodStart      DateTime
  currentPeriodEnd        DateTime
  
  usage                   Json?   // {validationsUsed, validationsLimit, interviewsUsed, interviewsLimit}
  
  trialEnd                DateTime?
  cancelAtPeriodEnd       Boolean @default(false)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  @@index([userId])
  @@index([stripeCustomerId])
  @@index([status])
}
```

### 2.2 Schema Notes
- **Indexes**: Optimized for common queries (user validations, status filtering)
- **Cascade Deletes**: Automatic cleanup of related data
- **JSON Fields**: Flexible storage for AI-generated content
- **Timestamps**: All models have createdAt/updatedAt for auditing

## 3. API Endpoints

### 3.1 Authentication Endpoints

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/api/auth/signup` | Register new user | No | 5/min |
| POST | `/api/auth/login` | Email/password login | No | 5/min |
| POST | `/api/auth/logout` | Sign out user | Yes | 30/min |
| POST | `/api/auth/forgot-password` | Request password reset | No | 3/hour |
| POST | `/api/auth/reset-password` | Reset password with token | No | 5/min |
| POST | `/api/auth/2fa/enable` | Enable 2FA for user | Yes | 10/day |
| POST | `/api/auth/2fa/verify` | Verify 2FA code | Yes | 10/min |
| POST | `/api/auth/2fa/disable` | Disable 2FA | Yes | 10/day |

### 3.2 Validation Endpoints

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | `/api/validations` | List user's validations | Yes | 30/min |
| POST | `/api/validations` | Create new validation | Yes | 10/min |
| GET | `/api/validations/:id` | Get validation details | Yes | 60/min |
| DELETE | `/api/validations/:id` | Delete validation | Yes | 10/min |
| GET | `/api/validations/:id/status` | Check processing status | Yes | 60/min |
| POST | `/api/validations/:id/competitors` | Add competitor analysis | Yes | 20/min |
| GET | `/api/validations/:id/competitors` | List competitors | Yes | 60/min |
| POST | `/api/validations/:id/interviews` | Create interview | Yes | 20/min |
| GET | `/api/validations/:id/interviews` | List interviews | Yes | 60/min |
| POST | `/api/validations/:id/market-size` | Calculate market size | Yes | 10/min |
| GET | `/api/validations/:id/market-size` | Get market size | Yes | 60/min |
| POST | `/api/validations/:id/mvp-scope` | Generate MVP scope | Yes | 10/min |
| GET | `/api/validations/:id/mvp-scope` | Get MVP scope | Yes | 60/min |
| POST | `/api/validations/:id/landing-pages` | Generate landing pages | Yes | 10/min |
| GET | `/api/validations/:id/landing-pages` | List landing pages | Yes | 60/min |

### 3.3 Billing Endpoints

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | `/api/billing` | Get subscription info | Yes | 30/min |
| POST | `/api/billing/upgrade` | Upgrade subscription | Yes | 10/min |
| GET | `/api/billing/portal` | Open Stripe portal | Yes | 10/min |
| POST | `/api/billing/webhooks` | Stripe webhook handler | No* | N/A |
| GET | `/api/billing/usage` | Get usage statistics | Yes | 30/min |
| POST | `/api/billing/cancel` | Cancel subscription | Yes | 5/day |

*Webhook endpoint uses signature verification

## 4. Security Implementation

### 4.1 Authentication Flow
```
User → Sign Up → Email Verification → Login → 2FA (optional) → Session
```

### 4.2 Security Measures

#### Rate Limiting
```typescript
// Middleware: /lib/rate-limit.ts
const LIMITS = {
  signup: { max: 5, window: 60000 * 5 }, // 5/min
  login: { max: 5, window: 60000 * 5 },  // 5/min
  default: { max: 100, window: 60000 },  // 100/min
  passwordReset: { max: 3, window: 60000 * 60 * 3 }, // 3/hour
}
```

#### Input Validation
```typescript
// All endpoints use Zod schemas
const createValidationSchema = z.object({
  ideaDescription: z.string().min(10).max(5000),
  targetAudience: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
})
```

#### SQL Injection Prevention
- Prisma ORM with parameterized queries
- No raw SQL unless absolutely necessary
- Input sanitization on all user inputs

#### XSS Prevention
- React auto-escapes by default
- DOMPurify for any HTML content
- Content Security Policy headers

#### Session Security
- Secure, HTTP-only cookies
- Session expiration (7 days)
- Rotate session tokens on login
- 2FA for sensitive operations

### 4.3 Headers Configuration
```typescript
// middleware.ts
export const runtimeConfig = {
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'",
  }
}
```

## 5. Performance Requirements

### 5.1 Targets
- **API P95 Latency**: < 500ms
- **Page Load**: < 3s (LCP)
- **Time to Interactive**: < 5s
- **Database Query**: < 100ms (indexed)

### 5.2 Optimization Strategies

#### Database
- Indexes on foreign keys and frequently queried fields
- Connection pooling (PgBouncer in production)
- Query optimization with Prisma `select` for partial data

#### Caching
```typescript
// Redis cache for frequent queries
const cache = {
  validations: { ttl: 60 }, // 1 minute
  marketSize: { ttl: 300 }, // 5 minutes
  user: { ttl: 300 },
}
```

#### API Optimization
- Pagination for list endpoints (default 20, max 100)
- Selective field fetching
- Lazy loading for nested resources
- Response compression (gzip)

## 6. Testing Strategy

### 6.1 Test Coverage Requirements
- **Unit Tests**: ≥80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Load Tests**: Rate limiting, concurrent users

### 6.2 Test Structure
```
tests/
├── unit/
│   ├── api/
│   ├── utils/
│   └── services/
├── integration/
│   ├── auth.test.ts
│   ├── validations.test.ts
│   └── billing.test.ts
├── e2e/
│   ├── signup-flow.spec.ts
│   ├── validation-creation.spec.ts
│   └── subscription-flow.spec.ts
└── load/
    └── api-load-test.k6.js
```

### 6.3 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
stages:
  - lint
  - test-unit
  - test-integration
  - build
  - test-e2e
  - deploy
```

## 7. Deployment Architecture

### 7.1 Docker Setup
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

### 7.2 Docker Compose (Development)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_product_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ai_product_platform
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: http://localhost:3000
    depends_on:
      - postgres
```

### 7.3 Production Deployment
- **Platform**: Vercel / Railway / AWS ECS
- **Database**: Managed PostgreSQL (AWS RDS, Supabase, Neon)
- **Cache**: Redis (Upstash, AWS ElastiCache)
- **Monitoring**: Sentry, LogRocket, Datadog
- **Backup**: Automated daily database backups

## 8. Environment Variables

### 8.1 Required Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Auth
BETTER_AUTH_SECRET="32-character-minimum-secret-key"
BETTER_AUTH_URL="https://yourdomain.com"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_INDIVIDUAL="price_..."
STRIPE_PRICE_ID_TEAM="price_..."

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

### 8.2 Optional Variables
```bash
# Redis (for caching)
REDIS_URL="redis://..."

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."

# AI Services (for future)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-..."
```

## 9. Error Handling

### 9.1 API Error Format
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input data",
    details: [{ field: "email", message: "Invalid email format" }]
  }
}
```

### 9.2 Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## 10. Monitoring & Observability

### 10.1 Metrics to Track
- API response times (P50, P95, P99)
- Error rates by endpoint
- Database query performance
- User signups & activations
- Subscription conversions
- Churn rate

### 10.2 Logging Strategy
```typescript
// Structured JSON logging
{
  timestamp: "2026-04-08T16:00:00Z",
  level: "info",
  message: "Validation created",
  userId: "user_123",
  validationId: "val_456",
  duration: 145,
  requestId: "req_789"
}
```

## 11. Next Steps & Implementation Plan

### Phase 1: Core API Completion (Week 1)
- [ ] Implement all missing API endpoints
- [ ] Add comprehensive input validation
- [ ] Implement rate limiting middleware
- [ ] Add error handling & logging

### Phase 2: Frontend Completion (Week 2)
- [ ] Build validation detail page
- [ ] Create competitor analysis UI
- [ ] Build interview management page
- [ ] Add market size calculator UI
- [ ] Create MVP scope generator page
- [ ] Build landing page builder

### Phase 3: Testing (Week 3)
- [ ] Write unit tests (≥80% coverage)
- [ ] Implement integration tests
- [ ] Create E2E test suite
- [ ] Run load tests

### Phase 4: DevOps & Deployment (Week 4)
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Deploy to staging
- [ ] Performance optimization
- [ ] Deploy to production
- [ ] Monitor & iterate

---

**Document Version**: 2.0  
**Last Updated**: April 8, 2026  
**Status**: Ready for Implementation
