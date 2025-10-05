"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  X,
  Check,
  Star,
  Sparkles,
  Video,
  Calendar,
  ImageIcon,
  Users,
  Crown,
  Zap,
  Clock,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
} from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import {
  getUserByUsername,
  getUserProfile,
  getCreatorServices,
  type CreatorProfile,
  type CreatorService,
} from "@/lib/firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface PremiumService {
  id: string
  name: string
  description: string
  price: string
  originalPrice?: string
  image: string
  tags: string[]
  isPopular?: boolean
  isNew?: boolean
}

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  originalPrice?: number
  duration: string
  color: string
  features: string[]
  isPopular?: boolean
}

export default function SubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user] = useAuthState(auth)
  const { toast } = useToast()

  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [services, setServices] = useState<CreatorService[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("assinaturas")

  // Form data
  const [formData, setFormData] = useState({
    country: "Brasil",
    cpf: "",
    email: "",
    nickname: "",
    fullName: "",
  })

  const creatorUsername = searchParams.get("creator") || "isabellelua"
  const mode = searchParams.get("mode") // 'subscription' or 'pack'
  const serviceId = searchParams.get("service")

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: "bronze",
      name: "Bronze",
      price: 0,
      duration: "mensal",
      color: "from-amber-700 to-amber-900",
      features: ["Acesso ao conteúdo Bronze", "Visualização de posts públicos", "Perfil básico"],
    },
    {
      id: "prata",
      name: "Prata",
      price: 19.9,
      duration: "mensal",
      color: "from-gray-300 to-gray-500",
      features: ["Tudo do Bronze +", "Curtir posts", "Retuitar conteúdo", "Acesso ao conteúdo Prata"],
    },
    {
      id: "gold",
      name: "Gold",
      price: 39.9,
      duration: "mensal",
      color: "from-yellow-500 to-yellow-700",
      features: ["Tudo do Prata +", "Comentar em posts", "Chat exclusivo com a criadora", "Acesso ao conteúdo Gold"],
      isPopular: true,
    },
    {
      id: "platinum",
      name: "Platinum",
      price: 79.9,
      duration: "mensal",
      color: "from-slate-400 to-slate-600",
      features: ["Tudo do Gold +", "Stories premium permanentes", "Fotos em alta resolução", "Prioridade no chat"],
    },
    {
      id: "diamante",
      name: "Diamante",
      price: 99.9,
      duration: "mensal",
      color: "from-blue-400 to-blue-600",
      features: [
        "Tudo do Platinum +",
        "Vídeos exclusivos HD",
        "Chat prioritário VIP",
        "Conteúdo personalizado",
        "Acesso antecipado a novidades",
      ],
    },
  ]

  const promotionalPlans = [
    {
      id: "prata-3",
      name: "Prata",
      price: 58.23,
      originalPrice: 59.7,
      duration: "3 meses",
      discount: "2% off",
      color: "from-gray-300 to-gray-500",
    },
    {
      id: "prata-6",
      name: "Prata",
      price: 116.46,
      originalPrice: 119.4,
      duration: "6 meses",
      discount: "2% off",
      color: "from-gray-300 to-gray-500",
    },
    {
      id: "gold-3",
      name: "Gold",
      price: 117.25,
      originalPrice: 119.7,
      duration: "3 meses",
      discount: "2% off",
      color: "from-yellow-500 to-yellow-700",
    },
    {
      id: "gold-6",
      name: "Gold",
      price: 234.5,
      originalPrice: 239.4,
      duration: "6 meses",
      discount: "2% off",
      color: "from-yellow-500 to-yellow-700",
    },
    {
      id: "platinum-3",
      name: "Platinum",
      price: 234.5,
      originalPrice: 239.7,
      duration: "3 meses",
      discount: "2% off",
      color: "from-slate-400 to-slate-600",
    },
    {
      id: "platinum-6",
      name: "Platinum",
      price: 469.01,
      originalPrice: 479.4,
      duration: "6 meses",
      discount: "2% off",
      color: "from-slate-400 to-slate-600",
    },
    {
      id: "diamante-3",
      name: "Diamante",
      price: 293.13,
      originalPrice: 299.7,
      duration: "3 meses",
      discount: "2% off",
      color: "from-blue-400 to-blue-600",
    },
    {
      id: "diamante-6",
      name: "Diamante",
      price: 586.26,
      originalPrice: 599.4,
      duration: "6 meses",
      discount: "2% off",
      color: "from-blue-400 to-blue-600",
    },
  ]

  useEffect(() => {
    const loadData = async () => {
      try {
        const creatorProfile = await getUserByUsername(creatorUsername)

        if (!creatorProfile || creatorProfile.userType !== "creator") {
          toast({
            title: "Criadora não encontrada",
            description: "Esta criadora não existe ou não está disponível",
            variant: "destructive",
          })
          router.push("/creators")
          return
        }

        setCreator(creatorProfile as CreatorProfile)

        if (user) {
          const userProfile = await getUserProfile(user.uid)
          setCurrentUserProfile(userProfile)
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            nickname: userProfile?.username || "",
            fullName: userProfile?.displayName || "",
          }))
        }

        const creatorServices = await getCreatorServices(creatorProfile.uid)
        setServices(creatorServices)

        // Set initial selections based on URL params
        if (mode === "pack" && serviceId) {
          setSelectedService(serviceId)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar os dados da criadora",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, mode, serviceId, creatorUsername])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setSelectedService(null)
  }

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setSelectedPlan(null)
  }

  const handleProceedToCheckout = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para fazer uma assinatura",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!selectedPlan && !selectedService) {
      toast({
        title: "Seleção necessária",
        description: "Selecione um plano ou serviço para continuar",
        variant: "destructive",
      })
      return
    }

    setShowCheckout(true)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.cpf || !formData.email || !formData.fullName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    // Here you would integrate with payment processor
    toast({
      title: "Processando pagamento...",
      description: "Redirecionando para finalização do pagamento",
    })

    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Assinatura ativada!",
        description: "Bem-vindo ao DeLuxe Isa Premium!",
      })
      router.push(`/creator/${creatorUsername}`)
    }, 2000)
  }

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case "chamada-video-privada":
        return Video
      case "encontro-personalizado":
        return Calendar
      case "packs-de-pe":
        return ImageIcon
      case "pack-personalizado":
        return Users
      default:
        return Star
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Criadora não encontrada</p>
          <Button onClick={() => router.push("/creators")}>Ver Criadoras</Button>
        </div>
      </div>
    )
  }

  if (showCheckout) {
    const selectedPlanData = selectedPlan
      ? subscriptionPlans.find((p) => p.id === selectedPlan) || promotionalPlans.find((p) => p.id === selectedPlan)
      : null
    const selectedServiceData = selectedService ? services.find((s) => s.id === selectedService) : null

    return (
      <div className="min-h-screen bg-background">
        {/* Header with cover image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={creator.coverImage || "/placeholder.svg?height=200&width=400&query=beautiful woman cover photo"}
            alt={creator.displayName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full p-2"
            onClick={() => setShowCheckout(false)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
            onClick={() => router.push(`/creator/${creatorUsername}`)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Profile info */}
          <div className="absolute bottom-4 left-4 flex items-center space-x-3">
            <Avatar className="h-16 w-16 ring-4 ring-white/20">
              <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
              <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-white text-xl font-bold">{creator.displayName}</h2>
              <p className="text-white/80 text-sm">@{creator.username}</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* Benefits */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Benefícios exclusivos</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-white">Acesso ao conteúdo</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-white">Chat exclusivo com a criadora</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-white">Cancele a qualquer hora</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4">
            <p className="text-white/70 text-sm mb-6">É necessário concluir o cadastro antes de efetuar uma compra.</p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="country" className="text-white text-sm">
                  PAÍS
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                >
                  <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brasil">🇧🇷 Brasil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cpf" className="text-white text-sm">
                  CPF *
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
                <p className="text-red-400 text-xs mt-1">Campo obrigatório</p>
              </div>

              <div>
                <Label htmlFor="email" className="text-white text-sm">
                  E-MAIL *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
              </div>

              <div>
                <Label htmlFor="nickname" className="text-white text-sm">
                  APELIDO *
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label htmlFor="fullName" className="text-white text-sm">
                  NOME COMPLETO *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nome Completo"
                  value={formData.fullName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  required
                />
                <p className="text-red-400 text-xs mt-1">Campo obrigatório</p>
              </div>

              {/* Selected item summary */}
              {(selectedPlanData || selectedServiceData) && (
                <div className="bg-white/10 rounded-lg p-4 space-y-2">
                  <h4 className="text-white font-semibold">Resumo da compra:</h4>
                  {selectedPlanData && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">
                        {selectedPlanData.name} - {selectedPlanData.duration}
                      </span>
                      <span className="text-white font-bold">
                        R$ {selectedPlanData.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  )}
                  {selectedServiceData && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">{selectedServiceData.name}</span>
                      <span className="text-white font-bold">{selectedServiceData.price}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
              >
                <Zap className="h-5 w-5 mr-2" />
                Finalizar Assinatura
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with cover image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={creator.coverImage || "/placeholder.svg?height=200&width=400&query=beautiful woman cover photo"}
          alt={`${creator.displayName} Cover`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full p-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </Button>

        {/* Profile info */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-3">
          <Avatar className="h-16 w-16 ring-4 ring-white/20">
            <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
            <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-white text-xl font-bold">{creator.displayName}</h2>
            <p className="text-white/80 text-sm">@{creator.username}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Tabs for organizing plans and services */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
          </TabsList>

          <TabsContent value="assinaturas" className="space-y-4 mt-6">
            {/* Recurring subscription notice */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-primary">Assinatura Recorrente</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Todos os planos são cobrados mensalmente de forma automática. Você pode cancelar a qualquer momento.
              </p>
            </div>

            <div className="space-y-3">
              {subscriptionPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all duration-200 relative overflow-hidden ${
                    selectedPlan === plan.id
                      ? "ring-2 ring-primary bg-primary/5 shadow-lg transform scale-[1.02]"
                      : "hover:bg-muted/50 hover:shadow-md"
                  } ${plan.isPopular ? "ring-2 ring-primary/50" : ""}`}
                  onClick={() => {
                    setSelectedPlan(plan.id)
                    setSelectedService(null)
                  }}
                >
                  {selectedPlan === plan.id && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center`}
                        >
                          {plan.id === "vip" ? (
                            <Crown className="h-6 w-6 text-white" />
                          ) : plan.id === "diamante" ? (
                            <Sparkles className="h-6 w-6 text-white" />
                          ) : plan.id === "gold" ? (
                            <Star className="h-6 w-6 text-white" />
                          ) : plan.id === "prata" ? (
                            <Users className="h-6 w-6 text-white" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{plan.name}</h4>
                            {plan.isPopular && (
                              <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Cobrança {plan.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                        </div>
                        <div className="text-xs text-muted-foreground">por mês</div>
                      </div>
                    </div>

                    {selectedPlan === plan.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="space-y-2">
                          {plan.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4 mt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">Serviços Exclusivos</h3>
              <p className="text-sm text-muted-foreground">Compre serviços individuais sem precisar de assinatura</p>
            </div>

            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">⭐</div>
                  <div className="text-lg font-semibold">Nenhum serviço disponível</div>
                  <div className="text-sm text-muted-foreground">{creator.displayName} ainda não criou serviços</div>
                </div>
              ) : (
                services.map((service) => {
                  const IconComponent = getServiceIcon(service.id || "")
                  return (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all duration-200 relative overflow-hidden ${
                        selectedService === service.id
                          ? "ring-2 ring-primary bg-primary/5 shadow-lg transform scale-[1.02]"
                          : "hover:bg-muted/50 hover:shadow-md"
                      } ${service.isPopular ? "ring-2 ring-primary/50" : ""}`}
                      onClick={() => {
                        setSelectedService(service.id || "")
                        setSelectedPlan(null)
                      }}
                    >
                      {selectedService === service.id && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1 z-10">
                          <CheckCircle className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}

                      <CardContent className="p-0">
                        <div className="relative">
                          {/* Horizontal cover image */}
                          <div className="w-full h-32 overflow-hidden rounded-t-lg">
                            <img
                              src={
                                service.coverImage ||
                                "/placeholder.svg?height=128&width=400&query=premium service cover" ||
                                "/placeholder.svg"
                              }
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          </div>

                          {/* Service badges */}
                          <div className="absolute top-2 left-2 flex gap-1">
                            {service.isPopular && (
                              <Badge className="bg-primary text-primary-foreground text-xs">Popular</Badge>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-base mb-1">{service.name}</h4>
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                              {service.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center text-xs bg-muted text-muted-foreground rounded-full px-2 py-1"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-5 w-5 text-primary" />
                                <span className="text-sm text-muted-foreground">Pagamento único</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-primary">{service.price}</div>
                                {service.originalPrice && (
                                  <div className="text-sm text-muted-foreground line-through">
                                    {service.originalPrice}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-4 pt-4">
          <Button
            onClick={handleProceedToCheckout}
            disabled={!selectedPlan && !selectedService}
            className={`w-full font-bold py-6 text-lg rounded-xl shadow-lg transition-all duration-300 ${
              selectedPlan || selectedService
                ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transform hover:scale-[1.02] hover:shadow-xl"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {selectedPlan || selectedService ? (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Continuar para Pagamento
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 mr-2" />
                Selecione um plano ou serviço
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
