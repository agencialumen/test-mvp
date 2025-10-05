"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  MoreHorizontal,
  MessageCircle,
  Heart,
  RefreshCw,
  Star,
  Clock,
  Camera,
  Sparkles,
  Video,
  Calendar,
  ImageIcon,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  getPostsByAuthor,
  getIsabelleProfile,
  checkUserLiked,
  toggleLike,
  toggleRetweet,
  checkUserRetweeted,
  getCurrentUserLevel,
  checkContentAccess,
  getUserProfile,
  getIsabelleStories,
  getIsabelleStats,
} from "@/lib/firebase/firestore"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { BottomNavigation } from "@/components/bottom-navigation"
import { TopNavigation } from "@/components/top-navigation"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import { CommentModal } from "@/components/comment-modal"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"

interface FirebasePost {
  id: string
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  createdAt: any
  requiredLevel?: string
}

interface IsabelleProfile {
  displayName: string
  bio: string
  profileImage: string
  socialLinks?: {
    youtube?: string
    tiktok?: string
    instagram?: string
    twitter?: string
  }
  shortCover?: string
}

interface Story {
  id: string
  name: string
  coverImage: string
  requiredLevel: "Bronze" | "Prata" | "Gold" | "Diamante"
  images: string[]
  createdAt: any
}

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

export default function IsabelleLuaProfile() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"posts" | "services" | "gallery" | "about">("posts")
  const [posts, setPosts] = useState<FirebasePost[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<IsabelleProfile | null>(null)
  const [user] = useAuthState(auth)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [userLevel, setUserLevel] = useState<"Gold" | "Platinum" | "Diamante">("Gold")
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [storyModalOpen, setStoryModalOpen] = useState(false)
  const [services, setServices] = useState<PremiumService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [profileStats, setProfileStats] = useState({
    followers: "2.1M",
    satisfaction: "98%",
  })

  const loadServices = async () => {
    try {
      console.log("[v0] Loading services from Firebase")
      setServicesLoading(true)
      const servicesRef = doc(db, "config", "premiumServices")
      const servicesSnap = await getDoc(servicesRef)

      if (servicesSnap.exists()) {
        const data = servicesSnap.data()
        console.log("[v0] Services data from Firebase:", data)
        setServices(data.services || [])
        console.log("[v0] Services loaded from Firebase:", data.services?.length || 0)
      } else {
        console.log("[v0] No services found in Firebase, using defaults")
        const defaultServices: PremiumService[] = [
          {
            id: "packs-de-pe",
            name: "Packs de Pé",
            description: "Conteúdo exclusivo de pés da Isabelle Lua",
            price: "R$ 199",
            originalPrice: "R$ 299",
            image: "/packs-de-pe-isabelle.jpg",
            tags: ["Fotos HD", "Exclusivo", "Pack Completo"],
            isPopular: true,
            isNew: false,
          },
          {
            id: "pack-personalizado",
            name: "Pack Personalizado",
            description: "Conteúdo exclusivo criado especialmente para você",
            price: "R$ 599",
            originalPrice: "R$ 799",
            image: "/packs-personalizados-isabelle.jpg",
            tags: ["Fotos + Vídeos", "Personalizado", "Entrega 24h"],
            isPopular: false,
            isNew: false,
          },
          {
            id: "chamada-video-privada",
            name: "Chamada de Vídeo Privada",
            description: "Conversa exclusiva por vídeo com qualidade HD e total privacidade",
            price: "R$ 299",
            originalPrice: "R$ 399",
            image: "/video-call.png",
            tags: ["HD Quality", "100% Privado", "Gravação", "Chat incluído"],
            isPopular: true,
            isNew: false,
          },
          {
            id: "encontro-personalizado",
            name: "Encontro Personalizado",
            description: "Encontro presencial em local exclusivo",
            price: "R$ 1.999",
            originalPrice: "R$ 2.499",
            image: "/encontro-personalizado-isabelle.jpg",
            tags: ["Local Premium", "Exclusivo", "Discrição Total", "Experiência Única"],
            isPopular: false,
            isNew: false,
          },
        ]
        setServices(defaultServices)
        console.log("[v0] Default services set:", defaultServices.length)
      }
    } catch (error) {
      console.error("[v0] Error loading services:", error)
      const defaultServices: PremiumService[] = [
        {
          id: "packs-de-pe",
          name: "Packs de Pé",
          description: "Conteúdo exclusivo de pés da Isabelle Lua",
          price: "R$ 199",
          originalPrice: "R$ 299",
          image: "/packs-de-pe-isabelle.jpg",
          tags: ["Fotos HD", "Exclusivo", "Pack Completo"],
          isPopular: true,
          isNew: false,
        },
        {
          id: "pack-personalizado",
          name: "Pack Personalizado",
          description: "Conteúdo exclusivo criado especialmente para você",
          price: "R$ 599",
          originalPrice: "R$ 799",
          image: "/packs-personalizados-isabelle.jpg",
          tags: ["Fotos + Vídeos", "Personalizado", "Entrega 24h"],
          isPopular: false,
          isNew: false,
        },
        {
          id: "chamada-video-privada",
          name: "Chamada de Vídeo Privada",
          description: "Conversa exclusiva por vídeo com qualidade HD e total privacidade",
          price: "R$ 299",
          originalPrice: "R$ 399",
          image: "/video-call.png",
          tags: ["HD Quality", "100% Privado", "Gravação", "Chat incluído"],
          isPopular: true,
          isNew: false,
        },
        {
          id: "encontro-personalizado",
          name: "Encontro Personalizado",
          description: "Encontro presencial em local exclusivo",
          price: "R$ 1.999",
          originalPrice: "R$ 2.499",
          image: "/encontro-personalizado-isabelle.jpg",
          tags: ["Local Premium", "Exclusivo", "Discrição Total", "Experiência Única"],
          isPopular: false,
          isNew: false,
        },
      ]
      setServices(defaultServices)
    } finally {
      setServicesLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("[v0] Getting posts by author: isabellelua")
        const isabellePosts = await getPostsByAuthor("isabellelua")
        const isabelleProfile = await getIsabelleProfile()
        const isabelleStories = await getIsabelleStories()
        const isabelleStats = await getIsabelleStats()

        setPosts(isabellePosts)
        setProfile(isabelleProfile)
        setStories(isabelleStories)
        setProfileStats(isabelleStats)

        await loadServices()

        if (user) {
          const currentProfile = await getUserProfile(user.uid)
          setCurrentUserProfile(currentProfile)
          console.log("[v0] User profile loaded:", currentProfile)

          if (currentProfile) {
            const level = await getCurrentUserLevel(user.uid)
            setUserLevel(level)
            console.log("[v0] User level:", level)
          }
        }
      } catch (error) {
        console.error("Error loading Isabelle data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  useEffect(() => {
    const handleServicesUpdated = () => {
      console.log("[v0] Received servicesUpdated event in profile, reloading services...")
      loadServices()
    }

    window.addEventListener("servicesUpdated", handleServicesUpdated)
    return () => window.removeEventListener("servicesUpdated", handleServicesUpdated)
  }, [])

  useEffect(() => {
    const checkLikedPosts = async () => {
      if (!user || posts.length === 0) return

      const likedSet = new Set<string>()
      for (const post of posts) {
        if (post.id) {
          const isLiked = await checkUserLiked(user.uid, post.id)
          if (isLiked) {
            likedSet.add(post.id)
          }
        }
      }
      setLikedPosts(likedSet)
    }

    checkLikedPosts()
  }, [user, posts])

  useEffect(() => {
    const checkRetweetedPosts = async () => {
      if (!user || posts.length === 0) return

      const retweetedSet = new Set<string>()
      for (const post of posts) {
        if (post.id) {
          const isRetweeted = await checkUserRetweeted(user.uid, post.id)
          if (isRetweeted) {
            retweetedSet.add(post.id)
          }
        }
      }
      setRetweetedPosts(retweetedSet)
    }

    checkRetweetedPosts()
  }, [user, posts])

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir posts",
        variant: "destructive",
      })
      return
    }

    try {
      const wasLiked = await toggleLike(user.uid, postId)

      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        if (wasLiked) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likes: (post.likes || 0) + (wasLiked ? 1 : -1) } : post,
        ),
      )
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Erro ao curtir",
        description: "Não foi possível curtir o post. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleComment = (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      })
      return
    }

    setSelectedPostId(postId)
    setCommentModalOpen(true)
  }

  const handleShare = async (postId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para retuitar",
        variant: "destructive",
      })
      return
    }

    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const wasRetweeted = await toggleRetweet(user.uid, postId, "isabellelua")

      setRetweetedPosts((prev) => {
        const newSet = new Set(prev)
        if (wasRetweeted) {
          newSet.add(postId)
        } else {
          newSet.delete(postId)
        }
        return newSet
      })

      toast({
        title: wasRetweeted ? "Post retuitado!" : "Retweet removido",
        description: wasRetweeted ? "O post foi adicionado ao seu perfil" : "O post foi removido do seu perfil",
      })
    } catch (error) {
      console.error("Error toggling retweet:", error)
      toast({
        title: "Erro ao retuitar",
        description: "Não foi possível retuitar o post. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleCommentAdded = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const hasContentAccess = (requiredLevel?: string) => {
    if (!requiredLevel || requiredLevel === "Gold") return true
    return checkContentAccess(userLevel, requiredLevel)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "agora"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "agora"
      if (diffInMinutes < 60) return `${diffInMinutes}m`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
      return `${Math.floor(diffInMinutes / 1440)}d`
    } catch (error) {
      return "agora"
    }
  }

  const hasStoryAccess = (requiredLevel: "Bronze" | "Prata" | "Gold" | "Diamante") => {
    const levelHierarchy = { Bronze: 1, Prata: 2, Gold: 3, Diamante: 4 }
    const userLevelValue = levelHierarchy[userLevel as keyof typeof levelHierarchy] || 3
    const requiredLevelValue = levelHierarchy[requiredLevel]
    return userLevelValue >= requiredLevelValue
  }

  const handleStoryClick = (story: Story) => {
    if (!hasStoryAccess(story.requiredLevel)) {
      toast({
        title: "Acesso restrito",
        description: `Este destaque é exclusivo para usuários ${story.requiredLevel} ou superior`,
        variant: "destructive",
      })
      return
    }
    setSelectedStory(story)
    setStoryModalOpen(true)
  }

  const getStoryBadgeColor = (level: "Bronze" | "Prata" | "Gold" | "Diamante") => {
    switch (level) {
      case "Bronze":
        return "from-amber-600 to-amber-800"
      case "Prata":
        return "from-gray-400 to-gray-600"
      case "Gold":
        return "from-yellow-400 to-yellow-600"
      case "Diamante":
        return "from-blue-400 to-blue-600"
      default:
        return "from-primary to-primary/60"
    }
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

  const handleServiceClick = (serviceId: string) => {
    if (serviceId.includes("packs-de-pe")) {
      router.push("/services/packs-de-pe")
    } else if (serviceId.includes("pack-personalizado")) {
      router.push("/services/pack-personalizado")
    } else {
      // Default behavior for other services
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation title="@isabellelua" showBackButton={true} backHref="/feed" userProfile={currentUserProfile} />

      <main className="w-full max-w-md mx-auto">
        <div className="p-4 space-y-6">
          {profile?.shortCover && (
            <div className="relative rounded-2xl overflow-hidden -mx-4 -mt-4 mb-6">
              <img
                src={profile.shortCover || "/placeholder.svg"}
                alt="Capa do perfil"
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          <div className="flex items-start justify-between -mt-8 relative z-10">
            <div className="flex items-start space-x-3">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-2xl">
                <AvatarImage src={profile?.profileImage || "/beautiful-woman-profile.png"} alt="Isabelle Lua" />
                <AvatarFallback className="text-2xl font-bold">IL</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 pt-2">
                <div className="flex flex-col space-y-1 mb-1">
                  <h2 className="text-lg font-bold text-foreground truncate pr-2">
                    {profile?.displayName || "Isabelle Lua"}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <p className="text-sm text-muted-foreground">@isabellelua</p>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground border-0 text-xs px-2 py-0.5"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      VIP
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {currentUserProfile?.username !== "isabellelua" && (
              <div className="flex-shrink-0 pt-4 pl-6">
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg font-semibold"
                  onClick={() => router.push("/chat/isabellelua")}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">{profile?.bio || "Carregando..."}</p>

            <div className="flex justify-around py-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{posts.length}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{profileStats.followers}</div>
                <div className="text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{profileStats.satisfaction}</div>
                <div className="text-xs text-muted-foreground">Satisfação</div>
              </div>
            </div>
          </div>

          {currentUserProfile?.username !== "isabellelua" && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200"
              onClick={() => router.push("/subscription")}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Assinar Platinum - R$ 29,90/mês</span>
              </div>
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Destaques</h3>
            <div className="flex space-x-4 py-2 overflow-x-auto">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer group"
                  onClick={() => handleStoryClick(story)}
                >
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${getStoryBadgeColor(story.requiredLevel)} p-1 relative transform group-hover:scale-105 transition-transform duration-200`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <img
                        src={story.coverImage || "/placeholder.svg?height=80&width=80"}
                        alt={story.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${getStoryBadgeColor(story.requiredLevel)} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                    >
                      {story.requiredLevel[0]}
                    </div>
                    {!hasStoryAccess(story.requiredLevel) && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🔒</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground max-w-[70px] truncate text-center">{story.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex overflow-x-auto">
            {[
              { key: "posts", label: "Posts", icon: MessageCircle },
              { key: "services", label: "Serviços", icon: Star },
              { key: "gallery", label: "Galeria", icon: Camera },
              { key: "about", label: "Sobre", icon: Heart },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="ghost"
                className={`flex-1 min-w-[80px] py-3 rounded-none border-b-2 text-xs font-medium ${
                  activeTab === key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(key as any)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="pb-20">
          {activeTab === "posts" && (
            <div className="space-y-4 p-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                          <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-lg font-semibold">Nenhum post ainda</div>
                  <div className="text-sm text-muted-foreground">Os posts da Isabelle aparecerão aqui</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="border-border/50 fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                              <AvatarImage
                                src={profile?.profileImage || "/beautiful-woman-profile.png"}
                                alt="Isabelle Lua"
                              />
                              <AvatarFallback>IL</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-1">
                                <h3 className="font-semibold text-sm">{profile?.displayName || "Isabelle Lua"}</h3>
                                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground text-xs">✓</span>
                                </div>
                                {post.requiredLevel && post.requiredLevel !== "Gold" && (
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      post.requiredLevel === "Platinum"
                                        ? "bg-slate-500/20 text-slate-400"
                                        : "bg-blue-500/20 text-blue-400"
                                    }`}
                                  >
                                    {post.requiredLevel}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                @isabellelua • {formatTimestamp(post.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="relative">
                          <div className={!hasContentAccess(post.requiredLevel) ? "filter blur-md" : ""}>
                            <p className="text-sm mb-3 leading-relaxed">{post.content}</p>

                            {post.images && post.images.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={post.images[0] || "/placeholder.svg"}
                                  alt="Post content"
                                  className="w-full h-auto object-cover"
                                />
                              </div>
                            )}

                            {post.videos && post.videos.length > 0 && (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <video src={post.videos[0]} controls className="w-full h-auto object-cover" />
                              </div>
                            )}
                          </div>

                          {!hasContentAccess(post.requiredLevel) && post.requiredLevel && (
                            <PremiumContentOverlay
                              requiredLevel={post.requiredLevel as "Gold" | "Platinum" | "Diamante"}
                              userLevel={userLevel}
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`rounded-full p-2 ${
                                post.id && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"
                              } hover:text-red-500 transition-colors`}
                              onClick={() => post.id && handleLike(post.id)}
                            >
                              <Heart
                                className={`h-5 w-5 ${post.id && likedPosts.has(post.id) ? "fill-current" : ""}`}
                              />
                              <span className="ml-1 text-xs">{formatNumber(post.likes || 0)}</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full p-2 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => post.id && handleComment(post.id)}
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span className="ml-1 text-xs">{formatNumber(post.comments || 0)}</span>
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`rounded-full p-2 ${
                              post.id && retweetedPosts.has(post.id) ? "text-green-500" : "text-muted-foreground"
                            } hover:text-green-500 transition-colors`}
                            onClick={() => post.id && handleShare(post.id)}
                          >
                            <RefreshCw className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "services" && (
            <div className="space-y-4 p-4">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-xl font-bold text-foreground">Serviços Exclusivos</h3>
                <p className="text-muted-foreground text-sm">Experiências personalizadas só para você</p>
              </div>

              {servicesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="border-border/50">
                      <div className="flex flex-col">
                        <div className="w-full h-32 bg-muted animate-pulse rounded-t-lg" />
                        <div className="p-4 space-y-3">
                          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-full bg-muted animate-pulse rounded" />
                          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className="overflow-hidden border border-border/50 bg-card hover:shadow-lg transition-all duration-300 relative"
                      onClick={() => handleServiceClick(service.id)}
                    >
                      {service.isPopular && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 animate-pulse">
                            Popular
                          </Badge>
                        </div>
                      )}
                      {service.isNew && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-green-600 text-white text-xs px-2 py-1">Novo</Badge>
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div className="w-full h-32 relative overflow-hidden rounded-t-lg">
                          <img
                            src={service.image || "/placeholder.svg?height=128&width=400"}
                            alt={service.name}
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                            {(() => {
                              const IconComponent = getServiceIcon(service.id)
                              return <IconComponent className="h-5 w-5 text-white drop-shadow-lg" />
                            })()}
                            <span className="text-white font-semibold text-sm drop-shadow-lg">{service.name}</span>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {service.originalPrice && (
                                <div className="text-lg text-muted-foreground line-through">
                                  {service.originalPrice}
                                </div>
                              )}
                              <div className="text-2xl font-bold text-primary">{service.price}</div>
                              {service.originalPrice && (
                                <Badge className="bg-primary/10 text-primary text-xs px-2 py-1">
                                  {Math.round(
                                    (1 -
                                      Number.parseFloat(service.price.replace(/[^\d,]/g, "").replace(",", ".")) /
                                        Number.parseFloat(
                                          service.originalPrice.replace(/[^\d,]/g, "").replace(",", "."),
                                        )) *
                                      100,
                                  )}
                                  % OFF
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-muted-foreground text-sm mb-3">{service.description}</p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {service.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center text-xs bg-muted text-muted-foreground rounded-full px-2 py-1"
                              >
                                <div className="w-2 h-2 rounded-full bg-primary mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>

                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            onClick={() => {
                              router.push(`/subscription?mode=pack&service=${service.id}`)
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {service.id.includes("encontro") ? "Agendar Agora" : "Comprar Agora"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* VIP Package */}
                  <Card className="border-2 border-primary/20 bg-primary/5 backdrop-blur-sm mt-6 relative overflow-hidden">
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-primary text-primary-foreground text-xs px-2 py-1 font-semibold">
                        Oferta Limitada
                      </Badge>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="text-3xl">👑</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-bold text-foreground mb-2">Pacote VIP Completo</h4>
                          <p className="text-muted-foreground text-sm mb-3">
                            Acesso a todos os serviços + conteúdo exclusivo mensal
                          </p>

                          <div className="flex items-center space-x-3 mb-4">
                            <div className="text-3xl font-bold text-primary">R$ 990</div>
                            <div className="text-muted-foreground text-sm">/mês</div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="inline-flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                              <div className="w-2 h-2 rounded-full bg-primary mr-1" />
                              Todos os serviços
                            </span>
                            <span className="inline-flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                              <div className="w-2 h-2 rounded-full bg-primary mr-1" />
                              Chat prioritário
                            </span>
                            <span className="inline-flex items-center text-xs bg-primary/10 text-primary rounded-full px-2 py-1">
                              <div className="w-2 h-2 rounded-full bg-primary mr-1" />
                              Conteúdo diário
                            </span>
                          </div>

                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm py-3"
                            onClick={() => router.push("/subscription")}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Tornar-se VIP Agora
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="p-4">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-xl font-bold">Galeria Exclusiva</h3>
                <p className="text-sm text-muted-foreground">Fotos e vídeos premium</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-square relative rounded-lg overflow-hidden group cursor-pointer">
                    <img
                      src={`/beautiful-woman-photo-.jpg?key=perf6&height=200&width=200&query=beautiful woman photo ${index + 1}`}
                      alt={`Galeria ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs bg-black/80 text-white">
                        Platinum
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Button variant="outline" className="rounded-full bg-transparent">
                  Ver Mais Fotos
                </Button>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6 p-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Sobre Mim</h3>
                <p className="text-sm text-muted-foreground">Conheça mais sobre a Isabelle</p>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center">
                      <Heart className="h-4 w-4 mr-2 text-pink-500" />
                      Minha História
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Olá! Sou a Isabelle, modelo e criadora de conteúdo apaixonada por conectar com pessoas especiais.
                      Aqui você encontra meu lado mais autêntico e exclusivo, com conteúdos únicos criados especialmente
                      para minha comunidade platinum.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center">
                      <Star className="h-4 w-4 mr-2 text-yellow-500" />O que você encontra aqui
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Fotos e vídeos exclusivos</li>
                      <li>• Chat privado personalizado</li>
                      <li>• Conteúdo premium diário</li>
                      <li>• Experiências únicas e personalizadas</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2 text-blue-500" />
                      Vamos conversar?
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Adoro conhecer pessoas novas e criar conexões genuínas. Me mande uma mensagem e vamos nos conhecer
                      melhor!
                    </p>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      onClick={() => router.push("/chat/isabellelua")}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Iniciar Conversa
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {profile?.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Me siga nas redes</h4>
                    <div className="flex justify-center space-x-4">
                      {profile.socialLinks.youtube && (
                        <a
                          href={profile.socialLinks.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
                        >
                          <span className="text-white text-sm font-bold">YT</span>
                        </a>
                      )}
                      {profile.socialLinks.instagram && (
                        <a
                          href={profile.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
                        >
                          <span className="text-white text-sm font-bold">IG</span>
                        </a>
                      )}
                      {profile.socialLinks.tiktok && (
                        <a
                          href={profile.socialLinks.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-colors shadow-lg"
                        >
                          <span className="text-white text-sm font-bold">TT</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false)
          setSelectedPostId(null)
        }}
        postId={selectedPostId}
        onCommentAdded={handleCommentAdded}
      />

      {selectedStory && (
        <div
          className={`fixed inset-0 bg-black z-50 flex items-center justify-center ${storyModalOpen ? "block" : "hidden"}`}
          onClick={() => setStoryModalOpen(false)}
        >
          <div className="relative w-full max-w-sm mx-4">
            <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
              {selectedStory.images.length > 0 && (
                <img
                  src={selectedStory.images[0] || "/placeholder.svg"}
                  alt={selectedStory.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.profileImage || "/beautiful-woman-profile.png"} alt="Isabelle Lua" />
                  <AvatarFallback>IL</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium">{selectedStory.name}</span>
                <span
                  className={`px-2 py-1 text-xs rounded-full bg-gradient-to-br ${getStoryBadgeColor(selectedStory.requiredLevel)} text-white`}
                >
                  {selectedStory.requiredLevel}
                </span>
              </div>
              <button onClick={() => setStoryModalOpen(false)} className="text-white text-xl font-bold">
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation userProfile={currentUserProfile} />
    </div>
  )
}
