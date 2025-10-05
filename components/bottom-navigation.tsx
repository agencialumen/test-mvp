"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, User, X, MessageCircle, Users, Crown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { getIsabelleProfile, getCurrentUserLevel, isUserCreator, getUserProfile } from "@/lib/firebase/firestore"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"

interface BottomNavigationProps {
  userProfile?: {
    uid: string
    username: string
  } | null
}

export function BottomNavigation({ userProfile }: BottomNavigationProps) {
  const pathname = usePathname()
  const [user] = useAuthState(auth)
  const [showSearch, setShowSearch] = useState(false)
  const [isabelleProfile, setIsabelleProfile] = useState<any>(null)
  const [userLevel, setUserLevel] = useState<string>("Bronze")
  const [hasNewChatMessages, setHasNewChatMessages] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [currentUserData, setCurrentUserData] = useState<any>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const loadIsabelleProfile = async () => {
      try {
        const profile = await getIsabelleProfile()
        setIsabelleProfile(profile)
      } catch (error) {
        console.error("Error loading Isabelle profile:", error)
      }
    }
    loadIsabelleProfile()
  }, [])

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!user) return

      try {
        const creatorStatus = await isUserCreator(user.uid)
        setIsCreator(creatorStatus)

        const userData = await getUserProfile(user.uid)
        setCurrentUserData(userData)

        if (!creatorStatus) {
          const level = await getCurrentUserLevel(user.uid)
          setUserLevel(level)
        }
      } catch (error) {
        console.error("Error fetching user level:", error)
      }
    }

    fetchUserLevel()
  }, [user])

  useEffect(() => {
    if (!user || (!isCreator && userLevel !== "platinum" && userLevel !== "diamante")) return

    const checkNewMessages = () => {
      const lastReadTime = localStorage.getItem(`lastChatRead_${user.uid}`)
      const hasNewMessages = localStorage.getItem(`hasNewChatMessages_${user.uid}`)

      if (hasNewMessages === "true") {
        setHasNewChatMessages(true)
      }
    }

    checkNewMessages()

    const interval = setInterval(checkNewMessages, 30000)
    return () => clearInterval(interval)
  }, [user, userLevel, isCreator])

  const isabelleAvatar = isabelleProfile?.profileImage || "/beautiful-woman-profile.png"

  const handleSearchClick = () => {
    setShowSearch(true)
  }

  const closeModals = () => {
    setShowSearch(false)
  }

  const handleChatClick = () => {
    if (user) {
      setHasNewChatMessages(false)
      localStorage.removeItem(`hasNewChatMessages_${user.uid}`)
      localStorage.setItem(`lastChatRead_${user.uid}`, Date.now().toString())
    }
  }

  const isActive = (path: string) => {
    if (path === "/feed") return pathname === "/feed" || pathname === "/"
    if (path === "/profile") {
      // Only match profile pages, not dashboard
      return (
        pathname.startsWith("/user/") ||
        (pathname.startsWith("/creator/") && !pathname.startsWith("/creator-dashboard"))
      )
    }
    if (path === "/chat") return pathname.startsWith("/chat")
    if (path === "/creators") return pathname.startsWith("/creators")
    if (path === "/creator-dashboard") return pathname.startsWith("/creator-dashboard")
    return pathname === path
  }

  const canAccessChat = isCreator || userLevel === "platinum" || userLevel === "diamante"

  const getProfileUrl = () => {
    if (!currentUserData && userProfile) {
      // Fallback para userProfile se currentUserData ainda não carregou
      return `/user/${encodeURIComponent(userProfile.username)}`
    }

    if (!currentUserData) return "/profile"

    if (currentUserData.userType === "creator") {
      return `/creator/${encodeURIComponent(currentUserData.username)}`
    } else {
      return `/user/${encodeURIComponent(currentUserData.username)}`
    }
  }

  return (
    <>
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 sm:pt-20 px-4">
          <Card className="w-full max-w-md animate-in slide-in-from-top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Buscar</CardTitle>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={closeModals}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">Perfis recomendados:</div>

              <Link href="/profile/isabellelua" onClick={closeModals}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={isabelleAvatar || "/placeholder.svg"} alt="Isabelle Lua" />
                    <AvatarFallback>IL</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold">Isabelle Lua</h3>
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">@isabellelua</p>
                    <p className="text-xs text-muted-foreground">Modelo & Influenciadora Digital</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full bg-transparent">
                    Ver perfil
                  </Button>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border z-40">
        <div className={`grid ${isCreator ? "grid-cols-5" : "grid-cols-4"} gap-1 p-2 sm:p-4 max-w-md mx-auto`}>
          <Link href="/feed">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full w-full ${isActive("/feed") ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <Home className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Feed</span>
              </div>
            </Button>
          </Link>

          <Link href="/creators">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full w-full ${isActive("/creators") ? "text-primary glow-pink" : "text-muted-foreground"}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Criadoras</span>
              </div>
            </Button>
          </Link>

          {canAccessChat ? (
            <Link href="/chat" onClick={handleChatClick}>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full relative w-full ${isActive("/chat") ? "text-primary" : "text-muted-foreground"}`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs">Chat</span>
                  {hasNewChatMessages && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">!</span>
                    </div>
                  )}
                </div>
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground opacity-50 w-full" disabled>
              <div className="flex flex-col items-center space-y-1">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Chat</span>
              </div>
            </Button>
          )}

          {isCreator && (
            <Link href="/creator-dashboard">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full w-full ${isActive("/creator-dashboard") ? "text-primary glow-pink" : "text-muted-foreground"}`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs">Dashboard</span>
                </div>
              </Button>
            </Link>
          )}

          <Link href={getProfileUrl()}>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full w-full ${isActive("/profile") ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="flex flex-col items-center space-y-1">
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-xs">Perfil</span>
              </div>
            </Button>
          </Link>
        </div>
      </nav>
    </>
  )
}
