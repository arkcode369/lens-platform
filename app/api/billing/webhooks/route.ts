import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia"
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature") || ""

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await prisma.subscription.update({
          where: {
            stripeCustomerId: subscription.customer as string
          },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await prisma.subscription.update({
          where: {
            stripeCustomerId: subscription.customer as string
          },
          data: {
            status: "canceled"
          }
        })
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await prisma.subscription.update({
          where: {
            stripeCustomerId: invoice.customer as string
          },
          data: {
            status: "active",
            currentPeriodEnd: new Date(invoice.current_period_end * 1000)
          }
        })
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await prisma.subscription.update({
          where: {
            stripeCustomerId: invoice.customer as string
          },
          data: {
            status: "past_due"
          }
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
