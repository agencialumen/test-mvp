"use server"

import { stripe } from "@/lib/stripe"
import { getSubscriptionProduct } from "@/lib/stripe-products"

export async function createSubscriptionCheckout(
  userId: string,
  creatorId: string,
  tier: "prata" | "gold" | "platinum" | "diamante",
) {
  try {
    console.log("[v0] Creating checkout - userId:", userId, "creatorId:", creatorId, "tier:", tier)

    if (!userId) {
      throw new Error("Usuário não autenticado")
    }

    // Get subscription product
    const product = getSubscriptionProduct(tier)
    if (!product) {
      throw new Error(`Produto de assinatura não encontrado para tier: ${tier}`)
    }

    console.log("[v0] Product found:", product.name, "Price ID:", product.stripePriceId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    console.log("[v0] Using app URL:", appUrl)

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
      return_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    })

    console.log("[v0] Checkout session created successfully:", session.id)

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      success: true,
    }
  } catch (error) {
    console.error("[v0] Error creating subscription checkout:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao criar checkout"
    console.error("[v0] Error details:", errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
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
