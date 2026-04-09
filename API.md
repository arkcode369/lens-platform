# API Documentation

## Authentication

All authenticated endpoints require a valid session cookie from Better Auth.

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

---

## Authentication Endpoints

Better Auth handles authentication via `/api/auth/[...all]` route.

### Available Actions
- `POST /api/auth/sign-in` - Sign in with email/password
- `POST /api/auth/sign-up` - Create new account
- `POST /api/auth/sign-out` - Sign out current session
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/two-factor/enable` - Enable 2FA
- `POST /api/auth/two-factor/verify` - Verify 2FA code
- `POST /api/auth/two-factor/disable` - Disable 2FA

---

## Validations API

### List All Validations
```http
GET /api/validations
Authorization: Bearer <session_token>
```

**Response:**
```json
[
  {
    "id": "clx123...",
    "userId": "clx456...",
    "ideaDescription": "AI-powered recipe generator",
    "targetAudience": "Home cooks",
    "industry": "Food & Beverage",
    "status": "completed",
    "validationScore": 85,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T12:00:00Z"
  }
]
```

### Create Validation
```http
POST /api/validations
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "ideaDescription": "AI-powered recipe generator that creates personalized recipes based on available ingredients",
  "targetAudience": "Home cooks aged 25-45",
  "industry": "Food & Beverage"
}
```

**Response:**
```json
{
  "id": "clx789...",
  "userId": "clx456...",
  "ideaDescription": "AI-powered recipe generator...",
  "status": "pending",
  "createdAt": "2026-04-08T10:00:00Z"
}
```

### Get Validation Details
```http
GET /api/validations/:id
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "id": "clx789...",
  "ideaDescription": "...",
  "competitors": [...],
  "interviews": [...],
  "marketSize": {...},
  "mvpScope": {...},
  "landingPages": [...]
}
```

### Delete Validation
```http
DELETE /api/validations/:id
Authorization: Bearer <session_token>
```

**Response:**
```json
{ "success": true }
```

### Check Validation Status
```http
GET /api/validations/:id/status
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "status": "processing",
  "updatedAt": "2026-04-08T12:30:00Z"
}
```

---

## Competitors API

### Add Competitor
```http
POST /api/validations/:id/competitors
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "name": "RecipeAI",
  "url": "https://recipeai.example.com",
  "description": "AI recipe generator",
  "features": [
    { "name": "Ingredient substitution", "status": "existing" },
    { "name": "Nutrition analysis", "status": "planned" }
  ],
  "pricing": [
    { "plan": "Free", "price": 0, "currency": "USD" },
    { "plan": "Pro", "price": 9.99, "currency": "USD" }
  ],
  "strengths": ["Easy to use", "Large recipe database"],
  "weaknesses": ["Limited customization", "No meal planning"]
}
```

### List Competitors
```http
GET /api/validations/:id/competitors
Authorization: Bearer <session_token>
```

---

## Interviews API

### Create Interview
```http
POST /api/validations/:id/interviews
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "persona": "Busy parent looking for quick healthy meals",
  "script": [
    {
      "question": "How do you currently plan meals?",
      "followUp": "What challenges do you face?"
    },
    {
      "question": "What features would be most valuable?",
      "followUp": "Why is that important to you?"
    }
  ],
  "targetCount": 15
}
```

### List Interviews
```http
GET /api/validations/:id/interviews
Authorization: Bearer <session_token>
```

---

## Market Size API (Pending Implementation)

### Calculate Market Size
```http
POST /api/validations/:id/market-size
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "tam": 1000000000,
  "sam": 250000000,
  "som": 25000000,
  "growthRate": 15.5,
  "sources": [
    { "name": "Industry Report 2026", "url": "https://...", "date": "2026-01-01" }
  ]
}
```

### Get Market Size
```http
GET /api/validations/:id/market-size
Authorization: Bearer <session_token>
```

---

## MVP Scope API (Pending Implementation)

### Generate MVP Scope
```http
POST /api/validations/:id/mvp-scope
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "recommendedFeatures": [
    {
      "name": "Ingredient input",
      "priority": "high",
      "rationale": "Core functionality",
      "effort": "2 weeks"
    }
  ],
  "buildVsBuy": {
    "build": ["Recipe generation engine"],
    "buy": ["Payment processing", "Email service"]
  },
  "totalEffort": "3 months",
  "risks": ["AI accuracy", "User adoption"]
}
```

### Get MVP Scope
```http
GET /api/validations/:id/mvp-scope
Authorization: Bearer <session_token>
```

---

## Landing Pages API (Pending Implementation)

### Generate Landing Pages
```http
POST /api/validations/:id/landing-pages
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "title": "AI Recipe Generator",
  "headline": "Create Perfect Recipes from Any Ingredients",
  "subheadline": "Stop wasting food and money. Get personalized recipes in seconds.",
  "features": [
    { "title": "Smart Ingredient Detection", "description": "...", "icon": "camera" }
  ],
  "ctaText": "Start Creating",
  "ctaLink": "/signup"
}
```

### List Landing Pages
```http
GET /api/validations/:id/landing-pages
Authorization: Bearer <session_token>
```

---

## Billing API

### Get Billing Information
```http
GET /api/billing
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "subscription": {
    "plan": "individual",
    "status": "active",
    "currentPeriodEnd": "2026-05-08T00:00:00Z"
  },
  "usage": {
    "validationsUsed": 12,
    "validationsLimit": 20
  }
}
```

### Upgrade Subscription
```http
POST /api/billing
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "plan": "team"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "plan": "team",
    "status": "active"
  }
}
```

### Stripe Webhook Handler
```http
POST /api/billing/webhooks
Content-Type: application/json
Stripe-Signature: <signature>

{ ... Stripe event data ... }
```

**Supported Events:**
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Error Responses

All endpoints return consistent error formats:

```json
{
  "error": "Error message",
  "details": [] // Optional validation errors
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limiting

- **Limit**: 100 requests per minute per user
- **Headers**: 
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: <timestamp>`

When rate limited, you'll receive:
```json
{ "error": "Too many requests" }
```

---

## Authentication Flow

1. User signs in via `/api/auth/sign-in`
2. Server sets `better-auth.session_token` cookie
3. Subsequent requests include this cookie automatically
4. Session expires after 7 days (configurable)
5. Use `/api/auth/sign-out` to logout

---

## SDK Usage (TypeScript)

```typescript
// Create validation
const response = await fetch('/api/validations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ideaDescription: 'My product idea',
    targetAudience: 'Target users',
    industry: 'Industry'
  })
})

const validation = await response.json()

// Add competitor
await fetch(`/api/validations/${validation.id}/competitors`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Competitor Name',
    url: 'https://competitor.com',
    strengths: ['Feature A'],
    weaknesses: ['Lacks Feature B']
  })
})
```

---

## Webhooks

Configure Stripe webhooks to:
- `https://your-domain.com/api/billing/webhooks`

**Events to subscribe:**
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Testing

Use the provided test credentials:
- Email: `test@example.com`
- Password: `password123`

Or create new accounts via the sign-up endpoint.
