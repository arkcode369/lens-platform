# Stripe Setup Guide

## Quick Start

### 1. Create Stripe Account
Go to https://stripe.com and create a test account.

### 2. Get API Keys
1. Log in to Stripe Dashboard
2. Go to Developers → API keys
3. Copy the following keys:
   - Secret key (starts with `sk_test_`)
   - Publishable key (starts with `pk_test_`)

### 3. Create Products & Prices

#### Individual Plan ($49/month)
```bash
stripe prices create \
  --unit-amount=4900 \
  --currency=usd \
  --recurring=interval=month \
  --product-data[name]="Individual Plan" \
  --product-data[description]="50 validations per month"
```

#### Team Plan ($299/month)
```bash
stripe prices create \
  --unit-amount=29900 \
  --currency=usd \
  --recurring=interval=month \
  --product-data[name]="Team Plan" \
  --product-data[description]="200 validations per month, up to 10 team members"
```

#### Enterprise Plan ($999/month)
```bash
stripe prices create \
  --unit-amount=99900 \
  --currency=usd \
  --recurring=interval=month \
  --product-data[name]="Enterprise Plan" \
  --product-data[description]="Unlimited validations and team members"
```

Copy the Price IDs (start with `price_`) for each plan.

### 4. Configure Environment Variables

Update `.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"

# Price IDs (replace with your actual price IDs)
STRIPE_PRICE_ID_INDIVIDUAL="price_individual_here"
STRIPE_PRICE_ID_TEAM="price_team_here"
STRIPE_PRICE_ID_ENTERPRISE="price_enterprise_here"
```

### 5. Set Up Webhooks

#### Local Development
```bash
# Install Stripe CLI if needed
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

The CLI will output a webhook signing secret. Copy this to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### Production
1. Go to Developers → Webhooks in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret to your production environment variables

### 6. Test the Integration

#### Test Card Numbers
Use these test cards in Stripe test mode:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Requires authentication |

#### Test Flow
1. Sign up for an account
2. Visit `/pricing`
3. Select a plan
4. Use test card number
5. Complete checkout
6. Verify subscription appears in `/billing`

### 7. Verify Webhooks

After setting up webhooks, test them:

```bash
# Trigger a test event
stripe trigger checkout.session.completed
```

Check your application logs to verify the webhook was received and processed.

---

## Common Issues

### Webhook Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Make sure you're using the local forwarding secret for development
- Check that the webhook endpoint path is correct

### Price ID Not Found
- Verify the price ID is copied correctly
- Ensure the price exists in your Stripe account
- Check that you're using test mode prices for test environment

### Database Migration Failed
- Ensure PostgreSQL is running
- Check `DATABASE_URL` is correct
- Run `npx prisma generate` after migration

---

## Production Checklist

- [ ] Switch to live mode API keys
- [ ] Create live mode products and prices
- [ ] Set up production webhook endpoint
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Test with real payment (refund immediately)
- [ ] Monitor webhook delivery logs
- [ ] Set up alerts for failed webhooks

---

## Useful Commands

```bash
# List all prices
stripe prices list --limit 100

# List all customers
stripe customers list --limit 100

# View subscription
stripe subscriptions get sub_123456

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

---

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Test Data](https://stripe.com/docs/testing)
- [Webhook Events](https://stripe.com/docs/api/events/list)
