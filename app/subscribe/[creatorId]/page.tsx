"use client"

import { SubscriptionCheckout } from "@/components/subscription-checkout"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function SubscribePage() {
  const params = useParams()
  const creatorId = params.creatorId as string
  const [creator, setCreator] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCreator() {
      console.log("[v0] Subscribe page - Loading creator:", creatorId)

      try {
        const { getCreatorProfile } = await import("@/lib/firebase/firestore")
        const creatorData = await getCreatorProfile(creatorId)
        console.log("[v0] Subscribe page - Creator data:", creatorData)

        if (!creatorData) {
          console.log("[v0] Subscribe page - Creator not found")
          setError("Criadora não encontrada")
          setLoading(false)
          return
        }

        console.log(
          "[v0] Subscribe page - Creator loaded successfully:",
          creatorData.displayName || creatorData.username,
        )
        setCreator(creatorData)
        setLoading(false)
      } catch (err) {
        console.error("[v0] Subscribe page - Error loading creator:", err)
        setError(err instanceof Error ? err.message : "Erro ao carregar criadora")
        setLoading(false)
      }
    }

    loadCreator()
  }, [creatorId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erro</h1>
          <p className="text-muted-foreground mb-4">{error || "Criadora não encontrada"}</p>
          <a href="/creators" className="text-primary hover:underline">
            Voltar para criadoras
          </a>
        </div>
      </div>
    )
  }

  console.log("[v0] Subscribe page - Rendering checkout component")

  return (
    <div className="min-h-screen bg-background py-12">
      <SubscriptionCheckout creatorId={creatorId} creatorName={creator.displayName || creator.username} />
    </div>
  )
}
