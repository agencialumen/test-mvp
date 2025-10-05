"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Crown, Diamond, Star, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface UpgradeButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
  targetPlan?: "platinum" | "diamante" | "vip"
  children?: React.ReactNode
}

export function UpgradeButton({
  variant = "default",
  size = "default",
  className = "",
  targetPlan = "platinum",
  children,
}: UpgradeButtonProps) {
  const router = useRouter()

  const planIcons = {
    platinum: <Crown className="w-4 h-4" />,
    diamante: <Diamond className="w-4 h-4" />,
    vip: <Star className="w-4 h-4" />,
  }

  const planNames = {
    platinum: "Platinum",
    diamante: "Diamante",
    vip: "VIP",
  }

  const handleUpgrade = () => {
    router.push(`/subscription?plan=${targetPlan}`)
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} transition-all duration-200 hover:scale-105`}
      onClick={handleUpgrade}
    >
      {children || (
        <>
          {planIcons[targetPlan]}
          <span className="ml-2">Upgrade para {planNames[targetPlan]}</span>
        </>
      )}
    </Button>
  )
}

export function UpgradeCard({
  title = "Upgrade Necessário",
  description = "Faça upgrade para acessar este conteúdo premium",
  targetPlan = "platinum",
}: {
  title?: string
  description?: string
  targetPlan?: "platinum" | "diamante" | "vip"
}) {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-xl text-center space-y-3">
      <div className="flex items-center justify-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-primary">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <UpgradeButton targetPlan={targetPlan} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        <Sparkles className="w-4 h-4 mr-2" />
        Fazer Upgrade Agora
      </UpgradeButton>
    </div>
  )
}
