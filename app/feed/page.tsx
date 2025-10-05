"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, MoreHorizontal, RefreshCw, Crown, Verified, Info, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"
import {
  getPostsPaginatedImproved,
  loadMorePosts,
  checkUserLikedBatch,
  toggleLike,
  toggleRetweet,
  getUserProfile,
  checkUserRetweetedBatch,
  getCurrentUserLevel,
  checkContentAccess,
  isUserCreator,
  type Post,
} from "@/lib/firebase/firestore"
import { CommentModal } from "@/components/comment-modal"
import { PremiumContentOverlay } from "@/components/premium-content-overlay"
import { useRealTime } from "@/components/real-time-provider"
import { useToast } from "@/components/toast-provider"
import { BottomNavigation } from "@/components/bottom-navigation"
import { TopNavigation } from "@/components/top-navigation"
import { XPNotification } from "@/components/xp-notification"
import { CreatorPostComposer } from "@/components/creator-post-composer"

export default function FeedPage() {
  const [user] = useAuthState(auth)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [retweetedPosts, setRetweetedPosts] = useState<Set<string>>(new Set())
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userLevel, setUserLevel] = useState<"Gold" | "Premium" | "Diamante">("Gold")
  const [isCreator, setIsCreator] = useState(false)

  const [showNewPostsNotification, setShowNewPostsNotification] = useState(false)
  const hasSetupListener = useRef(false)

  const [xpNotification, setXpNotification] = useState({
    show: false,
    xpGained: 0,
    action: "",
  })

  const { newPostsCount, hasNewNotifications, markPostsAsRead, markNotificationsAsRead } = useRealTime()
  const { showWarning, showError, showSuccess } = useToast()

  console.log("[v0] Feed component mounted, user:", user?.uid)

  const getLevelBadgeColor = (level: string) => {
    const normalizedLevel = level.toLowerCase()
    switch (normalizedLevel) {
      case "bronze":
        return "bg-orange-600/20 text-orange-400"
      case "prata":
      case "silver":
        return "bg-gray-400/20 text-gray-300"
      case "gold":
        return "bg-amber-500/20 text-amber-400"
      case "premium":
      case "platinum":
        return "bg-purple-600/20 text-purple-400"
      case "diamante":
      case "diamond":
        return "bg-cyan-500/20 text-cyan-400"
      default:
        return "bg-blue-500/20 text-blue-400"
    }
  }

  useEffect(() => {
    if (newPostsCount > 0) {
      console.log("[v0] Feed - Showing new posts notification, count:", newPostsCount)
      setShowNewPostsNotification(true)
    } else {
      console.log("[v0] Feed - Hiding new posts notification")
      setShowNewPostsNotification(false)
    }
  }, [newPostsCount])

  useEffect(() => {
    if (hasSetupListener.current) return

    console.log("[v0] Setting up improved posts listener with pagination")
    hasSetupListener.current = true

    const unsubscribe = getPostsPaginatedImproved(
      (fetchedPosts, hasMorePosts, lastVisible) => {
        console.log("[v0] Initial posts received:", fetchedPosts.length, "Has more:", hasMorePosts)
        setPosts(fetchedPosts)
        setHasMore(hasMorePosts)
        setLastDoc(lastVisible)
        setLoading(false)
      },
      undefined,
      15, // Load 15 posts initially
    )

    return () => {
      hasSetupListener.current = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const checkLikedPostsOptimized = async () => {
      if (!user || posts.length === 0) return

      const postIds = posts.map((post) => post.id).filter(Boolean) as string[]
      if (postIds.length === 0) return

      try {
        const likedSet = await checkUserLikedBatch(user.uid, postIds)
        setLikedPosts(likedSet)
      } catch (error) {
        console.error("[v0] Error checking liked posts:", error)
      }
    }

    checkLikedPostsOptimized()
  }, [user, posts])

  useEffect(() => {
    const checkRetweetedPostsOptimized = async () => {
      if (!user || posts.length === 0) return

      const postIds = posts.map((post) => post.id).filter(Boolean) as string[]
      if (postIds.length === 0) return

      try {
        const retweetedSet = await checkUserRetweetedBatch(user.uid, postIds)
        setRetweetedPosts(retweetedSet)
      } catch (error) {
        console.error("[v0] Error checking retweeted posts:", error)
      }
    }

    checkRetweetedPostsOptimized()
  }, [user, posts])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        const profile = await getUserProfile(user.uid)
        console.log("[v0] User profile loaded:", profile)
        setUserProfile(profile)

        const level = await getCurrentUserLevel(user.uid)
        setUserLevel(level)
        console.log("[v0] User level:", level)

        const creatorStatus = await isUserCreator(user.uid)
        setIsCreator(creatorStatus)
        console.log("[v0] Is creator:", creatorStatus)
      } catch (error) {
        console.error("[v0] Error loading user profile:", error)
      }
    }

    fetchUserProfile()
  }, [user])

  const handleLike = async (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para curtir posts")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    try {
      const result = await toggleLike(user.uid, postId)

      if (result.liked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.add(postId)
          return newSet
        })

        setPosts((prevPosts) =>
          prevPosts.map((post) => (post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post)),
        )

        if (result.xpGained > 0) {
          setXpNotification({
            show: true,
            xpGained: result.xpGained,
            action: "like",
          })
        }
      } else {
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })

        setPosts((prevPosts) =>
          prevPosts.map((post) => (post.id === postId ? { ...post, likes: (post.likes || 0) - 1 } : post)),
        )
      }
    } catch (error) {
      console.error("[v0] Error toggling like:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível curtir o post"
      showError("Erro ao curtir", errorMessage)
    }
  }

  const handleComment = (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para comentar")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    const userLevel = userProfile.level || "bronze"
    const levelHierarchy = ["bronze", "prata", "gold", "platinum", "diamante"]
    const userLevelIndex = levelHierarchy.indexOf(userLevel.toLowerCase())

    if (userLevelIndex < 2) {
      showWarning(
        "Nível insuficiente",
        "Você precisa ser nível Gold ou superior para comentar. Curta mais posts para subir de nível!",
      )
      return
    }

    setSelectedPostId(postId)
    setCommentModalOpen(true)
  }

  const handleShare = async (postId: string) => {
    if (!user) {
      showWarning("Login necessário", "Você precisa estar logado para retuitar")
      return
    }

    if (!userProfile) {
      showError("Erro", "Perfil do usuário não carregado")
      return
    }

    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const result = await toggleRetweet(user.uid, postId, post.authorId)

      if (result.retweeted) {
        setRetweetedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.add(postId)
          return newSet
        })

        showSuccess("Post retuitado!", "O post foi adicionado ao seu perfil")

        if (result.xpGained > 0) {
          setXpNotification({
            show: true,
            xpGained: result.xpGained,
            action: "retweet",
          })
        }
      } else {
        setRetweetedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })

        showSuccess("Retweet removido", "O post foi removido do seu perfil")
      }
    } catch (error) {
      console.error("[v0] Error toggling retweet:", error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível retuitar o post"
      showError("Erro ao retuitar", errorMessage)
    }
  }

  const handleCommentAdded = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post)),
    )
  }

  const handleRefresh = useCallback(() => {
    console.log("[v0] Feed - User clicked refresh button")
    markPostsAsRead()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [markPostsAsRead])

  const handlePostCreated = useCallback(() => {
    console.log("[v0] New post created, scrolling to top")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const formatNumber = useMemo(
    () => (num: number) => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return num.toString()
    },
    [],
  )

  const formatTimestamp = useMemo(
    () => (timestamp: any) => {
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
    },
    [],
  )

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc) return

    console.log("[v0] Loading more posts...")
    setLoadingMore(true)

    try {
      const { posts: newPosts, hasMore: moreAvailable, lastVisible } = await loadMorePosts(lastDoc, 15)

      console.log("[v0] Loaded", newPosts.length, "more posts. Has more:", moreAvailable)

      setPosts((prevPosts) => [...prevPosts, ...newPosts])
      setHasMore(moreAvailable)
      setLastDoc(lastVisible)
    } catch (error) {
      console.error("[v0] Error loading more posts:", error)
      showError("Erro", "Não foi possível carregar mais posts")
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, lastDoc, showError])

  const hasContentAccess = (requiredLevel?: string, postAuthorId?: string) => {
    if (user && postAuthorId && user.uid === postAuthorId) {
      return true
    }

    if (!requiredLevel || requiredLevel === "Gold") return true
    return checkContentAccess(userLevel, requiredLevel)
  }

  const canUserLike = (userLevel: string) => {
    return true
  }

  const canUserComment = (userLevel: string) => {
    if (!userLevel) return false
    const levelHierarchy = ["bronze", "prata", "gold", "platinum", "diamante"]
    const userLevelIndex = levelHierarchy.indexOf(userLevel.toLowerCase())
    return userLevelIndex >= 2
  }

  const canUserRetweet = (userLevel: string) => {
    if (!userLevel) return false
    const levelHierarchy = ["bronze", "prata", "gold", "platinum", "diamante"]
    const userLevelIndex = levelHierarchy.indexOf(userLevel.toLowerCase())
    return userLevelIndex >= 1
  }

  const getProfileLink = (username: string, authorUserType?: string) => {
    if (username === "isabellelua") {
      return "/profile/isabellelua"
    }

    if (authorUserType === "creator") {
      return `/creator/${username}`
    }

    return `/user/${username}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation userProfile={userProfile} />

        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando posts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation userProfile={userProfile} />

      {showNewPostsNotification && newPostsCount > 0 && (
        <div className="sticky top-14 sm:top-16 z-40 bg-primary/10 border-b border-primary/20">
          <div className="max-w-2xl mx-auto p-2 px-3 sm:px-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs sm:text-sm text-primary hover:bg-primary/20"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              {newPostsCount} novo{newPostsCount > 1 ? "s" : ""} post{newPostsCount > 1 ? "s" : ""} • Clique para ver
            </Button>
          </div>
        </div>
      )}

      <XPNotification
        show={xpNotification.show}
        xpGained={xpNotification.xpGained}
        action={xpNotification.action}
        onClose={() => setXpNotification({ show: false, xpGained: 0, action: "" })}
      />

      <main className="pb-20 max-w-2xl mx-auto">
        {userProfile?.userType === "creator" && (
          <div className="w-full px-3 sm:px-4 py-3 sm:py-4">
            <CreatorPostComposer userProfile={userProfile} onPostCreated={handlePostCreated} />
          </div>
        )}

        <div className="">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center min-h-[50vh] px-4">
              <div className="text-center">
                <p className="text-sm sm:text-base text-muted-foreground">Nenhum post encontrado</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Os posts das criadoras aparecerão aqui quando forem publicados
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 px-3 sm:px-4 py-3 sm:py-4">
              {posts.map((post) => (
                <Card key={post.id} className="border-border/50 fade-in">
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <Link
                        href={getProfileLink(post.authorUsername, post.authorUserType)}
                        className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity min-w-0 flex-1"
                      >
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-primary/20 flex-shrink-0">
                          <AvatarImage
                            src={post.authorProfileImage || "/beautiful-woman-profile.png"}
                            alt={post.authorDisplayName}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs sm:text-sm">
                            {post.authorDisplayName?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1 flex-wrap">
                            <h3 className="font-semibold text-xs sm:text-sm truncate">{post.authorDisplayName}</h3>
                            {(post.authorUsername === "isabellelua" || post.authorUserType === "creator") && (
                              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                <Verified className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-primary-foreground" />
                              </div>
                            )}
                            {post.authorUserType === "creator" && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0 flex-shrink-0">
                                <Crown className="h-2 w-2 mr-0.5" />
                                <span className="hidden xs:inline">Criadora</span>
                              </Badge>
                            )}
                            {post.requiredLevel && post.requiredLevel !== "Gold" && (
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full flex-shrink-0 ${getLevelBadgeColor(post.requiredLevel)}`}
                              >
                                {post.requiredLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs truncate">
                            @{post.authorUsername} • {formatTimestamp(post.createdAt)}
                          </p>
                        </div>
                      </Link>
                      <Button variant="ghost" size="sm" className="rounded-full p-1 sm:p-2 flex-shrink-0">
                        <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="relative">
                      <div className={!hasContentAccess(post.requiredLevel, post.authorId) ? "filter blur-md" : ""}>
                        <p className="text-xs sm:text-sm mb-2 sm:mb-3 leading-relaxed break-words">{post.content}</p>

                        {post.images && post.images.length > 0 && (
                          <div className="mb-3 sm:mb-4 space-y-2">
                            {post.images.map((image, index) => (
                              <div key={index} className="rounded-lg overflow-hidden">
                                <img
                                  src={image || "/placeholder.svg"}
                                  alt={`Post content ${index + 1}`}
                                  className="w-full h-auto object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg"
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {post.videos && post.videos.length > 0 && (
                          <div className="mb-3 sm:mb-4 space-y-2">
                            {post.videos.map((video, index) => (
                              <div key={index} className="rounded-lg overflow-hidden">
                                <video
                                  src={video}
                                  controls
                                  preload="metadata"
                                  className="w-full h-auto object-cover rounded-lg"
                                  onError={(e) => {
                                    console.log("[v0] Video failed to load:", video)
                                  }}
                                >
                                  Seu navegador não suporta vídeos.
                                </video>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!hasContentAccess(post.requiredLevel, post.authorId) && post.requiredLevel && (
                        <PremiumContentOverlay
                          requiredLevel={post.requiredLevel as "Gold" | "Premium" | "Diamante"}
                          userLevel={userLevel}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-full p-1.5 sm:p-2 ${
                            post.id && likedPosts.has(post.id) ? "text-red-500" : "text-muted-foreground"
                          } hover:text-red-500 transition-colors`}
                          onClick={() => post.id && handleLike(post.id)}
                        >
                          <Heart
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${post.id && likedPosts.has(post.id) ? "fill-current" : ""}`}
                          />
                          <span className="ml-1 text-[10px] sm:text-xs">{formatNumber(post.likes || 0)}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`rounded-full p-1.5 sm:p-2 transition-colors ${
                            userProfile && userProfile.level && canUserComment(userProfile.level)
                              ? "text-muted-foreground hover:text-primary"
                              : "text-muted-foreground/50 cursor-not-allowed"
                          }`}
                          onClick={() => post.id && handleComment(post.id)}
                          disabled={!userProfile || !userProfile.level || !canUserComment(userProfile.level)}
                        >
                          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="ml-1 text-[10px] sm:text-xs">{formatNumber(post.comments || 0)}</span>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-full p-1.5 sm:p-2 transition-colors ${
                          userProfile && userProfile.level && canUserRetweet(userProfile.level)
                            ? post.id && retweetedPosts.has(post.id)
                              ? "text-green-500"
                              : "text-muted-foreground hover:text-green-500"
                            : "text-muted-foreground/50 cursor-not-allowed"
                        }`}
                        onClick={() => post.id && handleShare(post.id)}
                        disabled={!userProfile || !userProfile.level || !canUserRetweet(userProfile.level)}
                      >
                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {posts.length > 0 && hasMore && (
            <div className="px-3 sm:px-4 pb-4">
              <Button
                variant="outline"
                className="w-full rounded-full border-border hover:bg-secondary bg-transparent text-xs sm:text-sm h-9 sm:h-10"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    Carregando mais posts...
                  </>
                ) : (
                  "Carregar mais posts"
                )}
              </Button>
            </div>
          )}

          {posts.length > 0 && !hasMore && (
            <div className="px-3 sm:px-4 pb-4">
              <div className="text-center py-6 sm:py-8">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted mb-3">
                  <Info className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Você chegou ao final! Todos os posts disponíveis foram carregados.
                </p>
              </div>
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

      <BottomNavigation userProfile={userProfile} />
    </div>
  )
}
