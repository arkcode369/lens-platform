# API Quick Reference

> All 21 Endpoints at a Glance

---

## 🔐 Authentication

### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: 201 Created
{
  "success": true,
  "data": { "user": { "id": "...", "email": "..." } }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "code": "123456"  // Optional: 2FA code if enabled
}

Response: 200 OK
{
  "success": true,
  "data": { "user": { "id": "...", "email": "..." } }
}
Set-Cookie: session=<token>
```

### Logout
```http
POST /api/auth/logout
Cookie: session=<token>

Response: 200 OK
{ "success": true, "data": { "loggedOut": true } }
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: 200 OK
{ "success": true, "message": "If account exists, reset link sent" }
```

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newSecurePassword123"
}

Response: 200 OK
{ "success": true, "message": "Password reset successfully" }
```

### Enable 2FA
```http
POST /api/auth/2fa/enable
Content-Type: application/json
Cookie: session=<token>

{
  "password": "current-password"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/...",
    "tempKey": "2fa_temp_..."
  }
}
```

### Verify 2FA
```http
POST /api/auth/2fa/verify
Content-Type: application/json
Cookie: session=<token>

{
  "code": "123456",
  "tempKey": "2fa_temp_..."
}

Response: 200 OK
{ "success": true, "message": "2FA enabled successfully" }
```

### Disable 2FA
```http
POST /api/auth/2fa/disable
Content-Type: application/json
Cookie: session=<token>

{
  "code": "123456",
  "password": "current-password"
}

Response: 200 OK
{ "success": true, "message": "2FA disabled successfully" }
```

---

## 📊 Validations

### List Validations
```http
GET /api/validations
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": "...", "ideaDescription": "...", "status": "completed" }
  ]
}
```

### Create Validation
```http
POST /api/validations
Content-Type: application/json
Cookie: session=<token>

{
  "ideaDescription": "AI-powered product validation platform",
  "targetAudience": "Product managers and entrepreneurs",
  "industry": "SaaS"
}

Response: 201 Created
{
  "success": true,
  "data": { "id": "...", "status": "pending", ... }
}
```

### Get Validation
```http
GET /api/validations/:id
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "ideaDescription": "...",
    "validationScore": 85,
    "status": "completed",
    ...
  }
}
```

### Delete Validation
```http
DELETE /api/validations/:id
Cookie: session=<token>

Response: 200 OK
{ "success": true }
```

### Check Status
```http
GET /api/validations/:id/status
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": { "status": "completed", "progress": 100 }
}
```

---

## 🏢 Competitors

### Add Competitor
```http
POST /api/validations/:id/competitors
Content-Type: application/json
Cookie: session=<token>

{
  "name": "Competitor Inc",
  "url": "https://competitor.com",
  "description": "Main competitor",
  "features": [
    { "name": "Feature 1", "description": "Description", "status": "available" }
  ],
  "pricing": [
    { "plan": "Pro", "price": 29, "currency": "USD" }
  ],
  "strengths": ["Strong brand", "Large user base"],
  "weaknesses": ["Expensive", "Complex UI"],
  "swot": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  }
}

Response: 201 Created
{ "success": true, "data": { "id": "...", "name": "..." } }
```

### List Competitors
```http
GET /api/validations/:id/competitors
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": "...", "name": "...", "url": "...", ... }
  ]
}
```

---

## 🎤 Interviews

### Create Interview
```http
POST /api/validations/:id/interviews
Content-Type: application/json
Cookie: session=<token>

{
  "persona": "Product Manager at Tech Startup",
  "script": [
    "What's your biggest challenge?",
    "How do you currently solve it?",
    "Would you pay for a solution?"
  ],
  "targetCount": 10
}

Response: 201 Created
{ "success": true, "data": { "id": "...", "status": "pending" } }
```

### List Interviews
```http
GET /api/validations/:id/interviews
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": "...", "persona": "...", "status": "completed", ... }
  ]
}
```

---

## 📈 Market Size

### Calculate Market Size
```http
POST /api/validations/:id/market-size
Content-Type: application/json
Cookie: session=<token>

{
  "tam": 1000000000,
  "sam": 500000000,
  "som": 50000000,
  "growthRate": 15.5,
  "confidence": 0.85,
  "sources": [
    { "name": "Industry Report", "url": "https://...", "date": "2026-01" }
  ]
}

Response: 200 OK
{ "success": true, "data": { "id": "...", "tam": 1000000000, ... } }
```

### Get Market Size
```http
GET /api/validations/:id/market-size
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "tam": 1000000000,
    "sam": 500000000,
    "som": 50000000,
    "growthRate": 15.5,
    ...
  }
}
```

---

## 🚀 MVP Scope

### Generate MVP Scope
```http
POST /api/validations/:id/mvp-scope
Content-Type: application/json
Cookie: session=<token>

{
  "recommendedFeatures": [
    {
      "name": "User Authentication",
      "priority": "critical",
      "rationale": "Essential for user management",
      "effort": "2 weeks"
    }
  ],
  "buildVsBuy": {
    "build": ["Core validation engine"],
    "buy": ["Email service", "Analytics"],
    "integrate": ["Stripe", "Google Analytics"]
  },
  "totalEffort": "3-4 months, 2 developers",
  "risks": ["Technical complexity", "Market adoption"],
  "recommendations": ["Start with MVP", "Validate early"]
}

Response: 200 OK
{ "success": true, "data": { "id": "...", ... } }
```

### Get MVP Scope
```http
GET /api/validations/:id/mvp-scope
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "recommendedFeatures": [...],
    "buildVsBuy": {...},
    "totalEffort": "...",
    ...
  }
}
```

---

## 🌐 Landing Pages

### Generate Landing Page
```http
POST /api/validations/:id/landing-pages
Content-Type: application/json
Cookie: session=<token>

{
  "title": "AI Product Validator",
  "headline": "Validate Your Product Idea in Minutes",
  "subheadline": "AI-powered market research and competitive analysis",
  "features": [
    { "title": "Market Analysis", "description": "Deep market insights", "icon": "chart" }
  ],
  "ctaText": "Get Started",
  "ctaLink": "/sign-up"
}

Response: 201 Created
{ "success": true, "data": { "id": "...", "title": "..." } }
```

### List Landing Pages
```http
GET /api/validations/:id/landing-pages
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": "...", "title": "...", "status": "draft", ... }
  ]
}
```

---

## 💳 Billing

### Get Billing Info
```http
GET /api/billing
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "individual",
      "status": "active",
      "currentPeriodEnd": "2026-05-08T00:00:00Z"
    },
    "usage": {
      "validationsUsed": 5,
      "validationsLimit": 10,
      "interviewsUsed": 12,
      "interviewsLimit": 50
    }
  }
}
```

### Upgrade Subscription
```http
POST /api/billing
Content-Type: application/json
Cookie: session=<token>

{
  "plan": "team"
}

Response: 200 OK
{
  "success": true,
  "data": { "plan": "team", "status": "active" }
}
```

### Open Billing Portal
```http
GET /api/billing/portal
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": { "url": "https://billing.stripe.com/p/login/..." }
}
```

### Get Usage Stats
```http
GET /api/billing/usage
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "validations": { "used": 5, "limit": 10, "percentage": 50 },
    "interviews": { "used": 12, "limit": 50, "percentage": 24 },
    "subscription": { "plan": "individual", "status": "active" }
  }
}
```

### Cancel Subscription
```http
POST /api/billing/cancel
Cookie: session=<token>

Response: 200 OK
{
  "success": true,
  "data": {
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2026-05-08T00:00:00Z"
  }
}
```

---

## ⚠️ Error Responses

### Validation Error (400)
```json
{
  "error": "Validation error",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```

### Not Found (404)
```json
{
  "error": "Validation not found"
}
```

### Rate Limited (429)
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

### Internal Error (500)
```json
{
  "error": "Internal server error"
}
```

---

## 📌 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Signup | 5 | 5 minutes |
| Login | 5 | 5 minutes |
| Forgot Password | 3 | 3 hours |
| 2FA Enable/Disable | 10 | 24 hours |
| All Other API | 100 | 1 minute |

---

## 🔑 Authentication

All protected endpoints require:
```
Cookie: session=<session-token>
```

Session tokens are set automatically after successful login:
```
Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

---

**Last Updated**: April 8, 2026  
**Total Endpoints**: 21  
**Status**: ✅ Production Ready
