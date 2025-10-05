"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Trophy, Target, Bell, Sparkles, Crown } from "lucide-react"
import { UserLevelBadge } from "@/components/user-level-badge"
import { EngagementLevelBadge } from "@/components/engagement-level-badge"
import {
  ENGAGEMENT_XP_REQUIREMENTS,
  ENGAGEMENT_HIERARCHY,
  calculateEngagementLevelFromXp,
  getNextEngagementLevel,
  type EngagementLevel,
  type SubscriptionTier,
} from "@/lib/types"

interface UserProgressSectionProps {
  user: {
    xp: number
    totalXp?: number
    subscriptionTier?: SubscriptionTier
    engagementLevel?: EngagementLevel
    username: string
    displayName?: string
  }
  showTips?: boolean
}

export function UserProgressSection({ user, showTips = true }: UserProgressSectionProps) {
  const currentEngagementLevel = user.engagementLevel || calculateEngagementLevelFromXp(user.totalXp || user.xp)
  const nextEngagementLevel = getNextEngagementLevel(currentEngagementLevel)

  const currentLevelIndex = ENGAGEMENT_HIERARCHY.indexOf(currentEngagementLevel)
  const currentLevelXP = ENGAGEMENT_XP_REQUIREMENTS[currentEngagementLevel]
  const nextLevelXP = nextEngagementLevel ? ENGAGEMENT_XP_REQUIREMENTS[nextEngagementLevel] : currentLevelXP

  const totalXP = user.totalXp || user.xp
  const progressXP = totalXP - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const progressPercentage = nextEngagementLevel ? Math.min((progressXP / requiredXP) * 100, 100) : 100

  const getEngagementTips = () => {
    switch (currentEngagementLevel) {
      case "iniciante":
        return {
          icon: <Target className="h-4 w-4 text-green-400" />,
          text: "Curta, comente e interaja para ganhar XP e se tornar Veterano! (+100 XP por curtida, +200 XP por comentário)",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          textColor: "text-green-200",
        }
      case "veterano":
        return {
          icon: <Sparkles className="h-4 w-4 text-blue-400" />,
          text: "Continue ativo! Interaja diariamente para se tornar Super Fã e ganhar badges especiais.",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          textColor: "text-blue-200",
        }
      case "super_fa":
        return {
          icon: <Crown className="h-4 w-4 text-purple-400" />,
          text: "Você é um Super Fã! Continue engajando para se tornar Embaixador e ter seu nome destacado.",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/20",
          textColor: "text-purple-200",
        }
      case "embaixador":
        return {
          icon: <Crown className="h-4 w-4 text-yellow-400" />,
          text: "Parabéns, Embaixador! Você alcançou o nível máximo de engajamento. Seu nome brilha em ouro!",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          textColor: "text-yellow-200",
        }
      default:
        return {
          icon: <Target className="h-4 w-4 text-primary" />,
          text: "Continue interagindo para ganhar XP e subir de nível de engajamento!",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          textColor: "text-primary",
        }
    }
  }

  const tips = getEngagementTips()

  return (
    <div className="space-y-4">
      {user.subscriptionTier && (
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Crown className="w-5 h-5 text-blue-400" />
              Assinatura Ativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <UserLevelBadge level={user.subscriptionTier as any} size="md" />
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Acesso Premium</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sua assinatura {user.subscriptionTier} dá acesso a conteúdos exclusivos e funcionalidades premium.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Nível de Engajamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Engagement Level */}
          <div className="flex items-center justify-between">
            <EngagementLevelBadge level={currentEngagementLevel} size="md" showIcon={true} />
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {totalXP.toLocaleString()} XP
            </Badge>
          </div>

          {/* Progress Bar */}
          {nextEngagementLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{ENGAGEMENT_HIERARCHY[currentLevelIndex]}</span>
                <span className="text-muted-foreground">{nextEngagementLevel}</span>
              </div>

              <Progress value={progressPercentage} className="h-3" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressXP.toLocaleString()} XP</span>
                <span>{(requiredXP - progressXP).toLocaleString()} XP restantes</span>
              </div>
            </div>
          )}

          {/* Next Level Info */}
          {nextEngagementLevel && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Próximo: {ENGAGEMENT_HIERARCHY[currentLevelIndex + 1]}</span>
              </div>
            </div>
          )}

          {/* Engagement Tips */}
          {showTips && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-sm text-white">Como Ganhar XP</span>
              </div>

              <div className={`flex items-center gap-2 p-3 ${tips.bgColor} rounded-lg border ${tips.borderColor}`}>
                {tips.icon}
                <span className={`text-sm ${tips.textColor}`}>{tips.text}</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/20 rounded-lg p-2 text-center">
                  <div className="font-semibold text-white">{totalXP.toLocaleString()}</div>
                  <div className="text-muted-foreground">XP Total</div>
                </div>
                <div className="bg-background/20 rounded-lg p-2 text-center">
                  <div className="font-semibold text-white">{Math.round(progressPercentage)}%</div>
                  <div className="text-muted-foreground">Progresso</div>
                </div>
              </div>

              {/* Engagement Benefits */}
              <div className="text-xs text-muted-foreground/70 bg-background/10 rounded-lg p-2">
                <div className="font-medium text-white mb-1">Benefícios do seu nível:</div>
                {currentEngagementLevel === "iniciante" && "• Badge de Iniciante • Nome padrão nos comentários"}
                {currentEngagementLevel === "veterano" && "• Badge de Veterano ⭐ • Nome em azul nos comentários"}
                {currentEngagementLevel === "super_fa" &&
                  "• Badge de Super Fã 💜 • Nome em roxo • Moldura especial no avatar"}
                {currentEngagementLevel === "embaixador" &&
                  "• Badge de Embaixador 👑 • Nome em dourado • Moldura premium • Destaque em comentários"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
