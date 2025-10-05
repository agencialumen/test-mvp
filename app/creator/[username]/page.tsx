"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TopNavigation } from "@/components/top-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import {
  Heart,
  MessageCircle,
  RefreshCw,
  Star,
  Camera,
  MoreHorizontal,
  Sparkles,
  Clock,
  ImageIcon,
  Video,
  Play,
  Lock,
  Gift,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import {
  getUserByUsername,
  getPostsByAuthor,
  type CreatorProfile,
  checkUserLiked,
  toggleLike,
  toggleRetweet,
  checkUserRetweeted,
  getCurrentUserLevel,
  checkContentAccess,
  getUserProfile,
  getCreatorHighlights,
  type CreatorHighlight,
  getCreatorServices,
  type CreatorService,
} from "@/lib/firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import { useToast } from "@/hooks/use-toast"

interface FirebasePost {
  id: string
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  retweets: number
  createdAt: any
  requiredLevel?: string
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [user] = useAuthState(auth)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<FirebasePost[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"posts" | "services" | "gallery" | "about">("posts")
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [userLevel, setUserLevel] = useState<"Gold" | "Platinum" | "Diamante">("Gold")
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<CreatorHighlight[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<CreatorHighlight | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [storyViewerOpen, setStoryViewerOpen] = useState(false)
  const [services, setServices] = useState<CreatorService[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadCreatorProfile = async () => {
      if (!username) return

      try {
        setIsLoading(true)

        const creatorProfile = await getUserByUsername(username)
        if (creatorProfile && creatorProfile.userType === "creator") {
          setCreator(creatorProfile as CreatorProfile)

          const creatorPosts = await getPostsByAuthor(username)
          setPosts(creatorPosts)

          console.log("[v0] Loading highlights for creator profile:", creatorProfile.uid)
          const creatorHighlights = await getCreatorHighlights(creatorProfile.uid)
          console.log("[v0] Loaded highlights for profile:", creatorHighlights)
          setHighlights(creatorHighlights)

          console.log("[v0] Loading services for creator profile:", creatorProfile.uid)
          const creatorServices = await getCreatorServices(creatorProfile.uid)
          console.log("[v0] Loaded services for profile:", creatorServices)
          setServices(creatorServices)
        }

        if (user) {
          const currentProfile = await getUserProfile(user.uid)
          setCurrentUserProfile(currentProfile)

          if (creatorProfile && currentProfile) {
            setIsOwner(currentProfile.uid === creatorProfile.uid)
          }

          if (currentProfile) {
            const level = await getCurrentUserLevel(user.uid)
            setUserLevel(level)
          }
        }
      } catch (error) {
        console.error("Error loading creator profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCreatorProfile()
  }, [username, user])

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
      const wasRetweeted = await toggleRetweet(user.uid, postId, username)

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
    }
  }

  const handleCommentAdded = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const hasContentAccess = (requiredLevel?: string) => {
    // Se é o dono do perfil, sempre tem acesso
    if (isOwner) return true

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

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case "chamada-video":
        return Video
      case "chat-privado":
        return MessageCircle
      case "conteudo-exclusivo":
        return ImageIcon
      case "pack-fotos":
        return Play
      case "encontro-virtual":
        return Gift
      default:
        return Star
    }
  }

  const openStoryViewer = (highlight: CreatorHighlight) => {
    if (!hasContentAccess(highlight.requiredLevel)) {
      toast({
        title: "Conteúdo Premium",
        description: `Este destaque requer nível ${highlight.requiredLevel}. Assine para ter acesso!`,
        variant: "default",
      })
      return
    }

    setSelectedHighlight(highlight)
    setCurrentStoryIndex(0)
    setStoryViewerOpen(true)
  }

  const closeStoryViewer = () => {
    setStoryViewerOpen(false)
    setSelectedHighlight(null)
    setCurrentStoryIndex(0)
  }

  const nextStory = () => {
    if (selectedHighlight && currentStoryIndex < selectedHighlight.images.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1)
    } else {
      closeStoryViewer()
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1)
    }
  }

  const getTimeRemaining = (expiresAt: any) => {
    if (!expiresAt) return null

    try {
      const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)
      const now = new Date()
      const diffInHours = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60))

      if (diffInHours < 0) return "Expirado"
      if (diffInHours < 1) return "< 1h"
      if (diffInHours < 24) return `${diffInHours}h`
      const days = Math.floor(diffInHours / 24)
      return `${days}d`
    } catch (error) {
      return null
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Bronze":
        return "B"
      case "Gold":
        return "G"
      case "Platinum":
        return "P"
      case "Diamante":
        return "D"
      default:
        return "G"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Carregando..." showBackButton />
        <div className="max-w-md mx-auto p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation title="Perfil não encontrado" showBackButton />
        <div className="max-w-md mx-auto p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Criadora não encontrada</h2>
          <p className="text-muted-foreground mb-4">Esta criadora não existe ou foi removida.</p>
          <Button onClick={() => router.push("/creators")}>Ver outras criadoras</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation
        title={`@${creator.username}`}
        showBackButton={true}
        backHref="/feed"
        userProfile={currentUserProfile}
      />

      <main className="w-full max-w-4xl mx-auto">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {creator.coverImage && (
            <div className="relative rounded-2xl overflow-hidden -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 sm:mb-6">
              <img
                src={creator.coverImage || "/placeholder.svg?height=160&width=400&query=creator cover"}
                alt="Capa do perfil"
                className="w-full h-32 sm:h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {currentUserProfile?.username === creator.username && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-black/50 hover:bg-black/70 text-white border-0 text-xs sm:text-sm"
                    onClick={() => router.push("/creator-settings")}
                  >
                    <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start justify-between -mt-6 sm:-mt-8 relative z-10 gap-3">
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background shadow-2xl flex-shrink-0">
                <AvatarImage
                  src={creator.profileImage || "/placeholder.svg"}
                  alt={creator.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl sm:text-2xl font-bold">
                  {creator.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 pt-1 sm:pt-2">
                <div className="flex flex-col space-y-1 mb-1">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate pr-2">
                    {creator.displayName}
                  </h2>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">@{creator.username}</p>
                    <Badge
                      variant="secondary"
                      className="bg-primary text-primary-foreground border-0 text-xs px-2 py-0.5"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Criadora
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {currentUserProfile?.username !== creator.username && (
              <div className="flex-shrink-0 pt-3 sm:pt-4">
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg font-semibold text-xs sm:text-sm"
                  onClick={() => router.push(`/chat/${creator.username}`)}
                >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Chat
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground/90">
              {creator.bio || "Criadora de conteúdo exclusivo"}
            </p>

            <div className="flex justify-around py-3 sm:py-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{posts.length}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">
                  {creator.followerCount
                    ? creator.followerCount >= 1000000
                      ? `${(creator.followerCount / 1000000).toFixed(1)}M`
                      : creator.followerCount >= 1000
                        ? `${(creator.followerCount / 1000).toFixed(1)}K`
                        : creator.followerCount
                    : "0"}
                </div>
                <div className="text-xs text-muted-foreground">Seguidores</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold text-primary">{creator.satisfaction || 98}%</div>
                <div className="text-xs text-muted-foreground">Satisfação</div>
              </div>
            </div>
          </div>

          {currentUserProfile?.username !== creator.username && (
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 sm:py-4 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-sm sm:text-base"
              onClick={() => router.push(`/subscription?creator=${creator.username}`)}
            >
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Assinar Platinum - R$ 29,90/mês</span>
              </div>
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Destaques</h3>
            <div className="flex space-x-3 sm:space-x-4 py-2 overflow-x-auto -mx-2 px-2">
              {highlights.length === 0 ? (
                <div className="text-center py-8 w-full">
                  <div className="text-4xl mb-2">✨</div>
                  <div className="text-sm text-muted-foreground">Nenhum destaque ainda</div>
                </div>
              ) : (
                highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="flex flex-col items-center space-y-2 flex-shrink-0 cursor-pointer group"
                    onClick={() => openStoryViewer(highlight)}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 p-1 relative transform group-hover:scale-105 transition-transform duration-200">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <img
                          src={highlight.coverImage || "/placeholder.svg?height=80&width=80"}
                          alt={highlight.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-background">
                        {getLevelBadge(highlight.requiredLevel)}
                      </div>
                      {highlight.isTemporary && highlight.expiresAt && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg border-2 border-background">
                          <Clock className="text-primary-foreground h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                      )}
                      {!hasContentAccess(highlight.requiredLevel) && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Lock className="text-white text-sm h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground max-w-[60px] sm:max-w-[70px] truncate text-center">
                      {highlight.name}
                    </span>
                    {highlight.isTemporary && highlight.expiresAt && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        {getTimeRemaining(highlight.expiresAt)}
                      </span>
                    )}
                  </div>
                ))
              )}
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
                className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2 sm:py-3 rounded-none border-b-2 text-xs font-medium ${
                  activeTab === key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(key as any)}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="pb-20">
          {activeTab === "posts" && (
            <div className="space-y-4 p-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-lg font-semibold">Nenhum post ainda</div>
                  <div className="text-sm text-muted-foreground">Os posts de {creator.displayName} aparecerão aqui</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="border-border/50 fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                              <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
                              <AvatarFallback>{creator.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-1">
                                <h3 className="font-semibold text-sm">{creator.displayName}</h3>
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
                                @{creator.username} • {formatTimestamp(post.createdAt)}
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
                <h3 className="text-xl font-bold text-foreground">Serviços de {creator.displayName}</h3>
                <p className="text-muted-foreground text-sm">Experiências exclusivas personalizadas</p>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="text-4xl">⭐</div>
                  <div className="text-lg font-semibold">Nenhum serviço disponível</div>
                  <div className="text-sm text-muted-foreground">{creator.displayName} ainda não criou serviços</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className="overflow-hidden border border-border/50 bg-card hover:shadow-lg transition-all duration-300 relative"
                    >
                      {service.isPopular && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 animate-pulse">
                            Popular
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-col">
                        <div className="w-full h-32 relative overflow-hidden rounded-t-lg">
                          <img
                            src={service.coverImage || "/placeholder.svg?height=128&width=400"}
                            alt={service.name}
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                            <Star className="h-5 w-5 text-white drop-shadow-lg" />
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
                              router.push(`/subscription?creator=${creator.username}&service=${service.id}`)
                            }}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Contratar Agora
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="p-4">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg sm:text-xl font-bold">Galeria de {creator.displayName}</h3>
                <p className="text-sm text-muted-foreground">Fotos e vídeos exclusivos</p>
              </div>

              {(() => {
                const allImages = posts.flatMap((post) =>
                  post.images.map((img) => ({
                    url: img,
                    requiredLevel: post.requiredLevel,
                    postId: post.id,
                  })),
                )

                if (allImages.length === 0) {
                  return (
                    <div className="text-center py-12 space-y-2">
                      <div className="text-4xl">📸</div>
                      <div className="text-lg font-semibold">Nenhuma foto ainda</div>
                      <div className="text-sm text-muted-foreground">
                        As fotos de {creator.displayName} aparecerão aqui
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allImages.map((image, index) => (
                        <div
                          key={`${image.postId}-${index}`}
                          className="aspect-square relative rounded-lg overflow-hidden group cursor-pointer"
                          onClick={() => {
                            if (!hasContentAccess(image.requiredLevel)) {
                              toast({
                                title: "Conteúdo Premium",
                                description: `Esta foto requer nível ${image.requiredLevel}. Assine para ter acesso!`,
                                variant: "default",
                              })
                            }
                          }}
                        >
                          <img
                            src={image.url || "/placeholder.svg"}
                            alt={`Galeria ${index + 1}`}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                              !hasContentAccess(image.requiredLevel) ? "blur-md" : ""
                            }`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                          {!hasContentAccess(image.requiredLevel) && image.requiredLevel && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="text-center text-white">
                                <Lock className="h-6 w-6 mx-auto mb-2" />
                                <span className="text-xs font-medium">{image.requiredLevel}</span>
                              </div>
                            </div>
                          )}

                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs bg-black/80 text-white">
                              {image.requiredLevel && image.requiredLevel !== "Gold" ? image.requiredLevel : "Preview"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {allImages.some((img) => !hasContentAccess(img.requiredLevel)) && (
                      <div className="mt-6 text-center">
                        <Button
                          variant="outline"
                          className="rounded-full bg-transparent border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => router.push(`/subscription?creator=${creator.username}`)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Assinar para Ver Todas
                        </Button>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6 p-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Sobre {creator.displayName}</h3>
                <p className="text-sm text-muted-foreground">Conheça mais sobre a criadora</p>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center">
                      <Heart className="h-4 w-4 mr-2 text-pink-500" />
                      Minha História
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {creator.bio ||
                        `Olá! Sou a ${creator.displayName}, criadora de conteúdo apaixonada por conectar com pessoas especiais. Aqui você encontra meu lado mais autêntico e exclusivo, com conteúdos únicos criados especialmente para minha comunidade platinum.`}
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
                      onClick={() => router.push(`/chat/${creator.username}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Iniciar Conversa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {storyViewerOpen && selectedHighlight && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="relative w-full h-full max-w-md mx-auto">
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-10 flex space-x-1">
              {selectedHighlight.images.map((_, index) => (
                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      index === currentStoryIndex ? "w-full" : index < currentStoryIndex ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="absolute top-10 sm:top-12 left-3 sm:left-4 right-3 sm:right-4 z-10 flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-white flex-shrink-0">
                  <AvatarImage src={creator.profileImage || "/placeholder.svg"} alt={creator.displayName} />
                  <AvatarFallback>{creator.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs sm:text-sm font-semibold truncate">{creator.displayName}</div>
                  <div className="text-white/70 text-xs truncate">{selectedHighlight.name}</div>
                  {selectedHighlight.isTemporary && selectedHighlight.expiresAt && (
                    <div className="flex items-center space-x-1 mt-1 bg-gradient-to-r from-primary/30 to-primary/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-primary/40 w-fit">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                      <span className="text-primary-foreground text-[10px] font-medium">
                        Expira em {getTimeRemaining(selectedHighlight.expiresAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full flex-shrink-0"
                onClick={closeStoryViewer}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={selectedHighlight.images[currentStoryIndex] || "/placeholder.svg"}
                alt={`${selectedHighlight.name} - ${currentStoryIndex + 1}`}
                className="w-full h-full object-contain"
              />

              <div className="absolute inset-0 flex">
                <div className="flex-1 flex items-center justify-start pl-2 sm:pl-4" onClick={prevStory}>
                  {currentStoryIndex > 0 && (
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
                      <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-end pr-2 sm:pr-4" onClick={nextStory}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
                    {currentStoryIndex < selectedHighlight.images.length - 1 ? (
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <X className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation userProfile={currentUserProfile} />
    </div>
  )
}
