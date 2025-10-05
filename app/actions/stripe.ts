"use server"

import { stripe } from "@/lib/stripe"
import { getSubscriptionProduct } from "@/lib/stripe-products"

// In production, this should use proper server-side token verification
export async function createSubscriptionCheckout(
  userId: string,
  creatorId: string,
  tier: "prata" | "gold" | "platinum" | "diamante",
) {
  try {
    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    console.log("[v0] Creating checkout for user:", userId, "creator:", creatorId, "tier:", tier)

    // Get subscription product
    const product = getSubscriptionProduct(tier)
    if (!product) {
      throw new Error(`Produto de assinatura não encontrado para tier: ${tier}`)
    }

    console.log("[v0] Product found:", product.name, "Price ID:", product.stripePriceId)

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [
        {
          price: product.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId,
          creatorId,
          tier,
        },
      },
      metadata: {
        userId,
        creatorId,
        tier,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    console.log("[v0] Checkout session created:", session.id)

    return { clientSecret: session.client_secret, sessionId: session.id }
  } catch (error) {
    console.error("[v0] Error creating subscription checkout:", error)
    throw error
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  } catch (error) {
    console.error("[v0] Error retrieving checkout session:", error)
    throw error
  }
}
