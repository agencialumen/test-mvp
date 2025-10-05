"use client"

import { useState, useEffect } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createSubscriptionCheckout } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { SUBSCRIPTION_PRODUCTS, type SubscriptionProduct } from "@/lib/stripe-products"
import { auth } from "@/lib/firebase/config"

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
console.log("[v0] Stripe publishable key available:", !!stripeKey)

const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface SubscriptionCheckoutProps {
  creatorId: string
  creatorName: string
}

export function SubscriptionCheckout({ creatorId, creatorName }: SubscriptionCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionProduct | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    console.log("[v0] SubscriptionCheckout mounted for creator:", creatorName, "ID:", creatorId)
    console.log("[v0] Available products:", SUBSCRIPTION_PRODUCTS.length)
    console.log("[v0] Stripe promise:", !!stripePromise)
  }, [creatorId, creatorName])

  const handleSelectTier = async (product: SubscriptionProduct) => {
    console.log("[v0] User selected tier:", product.name)
    setLoading(true)
    try {
      if (!auth.currentUser) {
        throw new Error("Você precisa estar logado para assinar")
      }

      const userId = auth.currentUser.uid
      console.log("[v0] Creating checkout for user:", userId)

      const result = await createSubscriptionCheckout(userId, creatorId, product.tier)
      console.log("[v0] Checkout session created:", !!result.clientSecret)
      setClientSecret(result.clientSecret!)
      setSelectedTier(product)
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert(error instanceof Error ? error.message : "Erro ao iniciar checkout. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (!stripePromise) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erro de Configuração</CardTitle>
            <CardDescription>
              A chave pública do Stripe não está configurada. Verifique as variáveis de ambiente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (clientSecret && selectedTier) {
    console.log("[v0] Rendering Stripe embedded checkout")
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => {
            console.log("[v0] User clicked back to plans")
            setClientSecret(null)
            setSelectedTier(null)
          }}
          className="mb-4"
        >
          ← Voltar aos planos
        </Button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    )
  }

  console.log("[v0] Rendering subscription plans")
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Assine {creatorName}</h2>
        <p className="text-muted-foreground">Escolha o plano ideal para você</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SUBSCRIPTION_PRODUCTS.map((product) => (
          <Card key={product.id} className="relative flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ {(product.priceInCents / 100).toFixed(2)}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2 mb-6 flex-1">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => handleSelectTier(product)} disabled={loading} className="w-full" size="lg">
                {loading ? "Carregando..." : "Assinar Agora"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
