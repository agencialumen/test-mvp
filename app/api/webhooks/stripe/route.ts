import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      console.error("[v0] No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("[v0] Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("[v0] Stripe webhook event received:", event.type)

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log("[v0] Unhandled event type:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[v0] Checkout completed:", session.id)

  const userId = session.metadata?.userId
  const creatorId = session.metadata?.creatorId
  const tier = session.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !creatorId || !tier) {
    console.error("[v0] Missing metadata in checkout session")
    return
  }

  const { updateUserSubscription } = await import("@/lib/firebase/firestore")

  // Update user subscription status
  await updateUserSubscription(userId, {
    tier,
    status: "active",
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  })

  console.log("[v0] User subscription updated:", userId, tier)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[v0] Subscription updated:", subscription.id)

  const userId = subscription.metadata?.userId
  const tier = subscription.metadata?.tier as "prata" | "gold" | "platinum" | "diamante"

  if (!userId || !tier) {
    console.error("[v0] Missing metadata in subscription")
    return
  }

  const { updateUserSubscription } = await import("@/lib/firebase/firestore")

  await updateUserSubscription(userId, {
    tier,
    status: subscription.status as "active" | "canceled" | "past_due",
    stripeSubscriptionId: subscription.id,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[v0] Subscription deleted:", subscription.id)

  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error("[v0] Missing userId in subscription metadata")
    return
  }

  const { updateUserSubscription } = await import("@/lib/firebase/firestore")

  await updateUserSubscription(userId, {
    tier: "bronze",
    status: "canceled",
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[v0] Invoice paid:", invoice.id)

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId
  const creatorId = subscription.metadata?.creatorId
  const tier = subscription.metadata?.tier

  if (!userId || !creatorId) {
    console.error("[v0] Missing metadata in subscription")
    return
  }

  const { createTransaction, processMLMCommissions, getCreatorNetwork } = await import("@/lib/firebase/firestore")

  const grossAmount = invoice.amount_paid / 100 // Convert from cents to currency

  const creatorShare = Math.floor(grossAmount * 0.7 * 100) / 100
  const platformShare = Math.floor(grossAmount * 0.3 * 100) / 100

  console.log(
    `[v0] Processing payment - Gross: R$ ${grossAmount}, Creator (70%): R$ ${creatorShare}, Platform (30%): R$ ${platformShare}`,
  )

  const transactionId = await createTransaction({
    creatorId,
    type: "subscription",
    amount: creatorShare,
    description: `Assinatura ${tier} - ${userId} (70% do valor bruto)`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
    metadata: {
      grossAmount,
      creatorShare,
      platformShare,
    },
  })

  console.log("[v0] Creator transaction created:", transactionId, `R$ ${creatorShare}`)

  const network = await getCreatorNetwork(creatorId)
  let totalCommissionsPaid = 0

  if (network && network.referredBy) {
    totalCommissionsPaid = await processMLMCommissions(creatorId, grossAmount, userId)
    console.log(`[v0] MLM commissions processed: R$ ${totalCommissionsPaid}`)
  }

  const platformProfit = platformShare - totalCommissionsPaid

  await createTransaction({
    creatorId: "PLATFORM",
    type: "platform_revenue",
    amount: platformProfit,
    description: `Lucro da plataforma - Assinatura ${tier}`,
    fromUserId: userId,
    status: "completed",
    createdAt: new Date(),
    metadata: {
      grossAmount,
      platformShare,
      totalCommissionsPaid,
      platformProfit,
      sourceCreatorId: creatorId,
    },
  })

  console.log(`[v0] Platform profit recorded: R$ ${platformProfit} (30% - R$ ${totalCommissionsPaid} comissões)`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[v0] Invoice payment failed:", invoice.id)

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error("[v0] Missing userId in subscription metadata")
    return
  }

  const { updateUserSubscription } = await import("@/lib/firebase/firestore")

  // Update subscription status to past_due
  await updateUserSubscription(userId, {
    status: "past_due",
  })

  // TODO: Send notification to user about payment failure
}
