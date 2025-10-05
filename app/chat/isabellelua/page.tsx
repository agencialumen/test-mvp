"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, ArrowLeft, Lock, Bell } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase/config"
import { getUserProfile, getIsabelleProfile } from "@/lib/firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { collection, addDoc, query, where, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore"

interface Message {
  id: string
  text: string
  sender: "user" | "admin"
  timestamp: Date
  type?: "text" | "image"
  userId?: string
  userName?: string
  read?: boolean
  isFromAdmin?: boolean
  image?: string
  isWelcomeMessage?: boolean
}

export default function ChatWithIsabelle() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [user] = useAuthState(auth)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [isabelleProfile, setIsabelleProfile] = useState<any | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const [userLevel, setUserLevel] = useState<string>("")
  const [hasNewReply, setHasNewReply] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const [canSendMessages, setCanSendMessages] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)

      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const isabelle = await getIsabelleProfile()
        setIsabelleProfile(isabelle)

        if (user) {
          console.log("[v0] User level:", user.uid)
          const profile = await getUserProfile(user.uid)
          setCurrentUserProfile(profile)

          const level = profile?.level || "Gold"
          setUserLevel(level)
          console.log("[v0] User level:", level)

          const canSend = level === "Premium" || level === "Diamante"
          setCanSendMessages(canSend)
        }
      } catch (error) {
        console.error("Error loading profiles:", error)
      }
    }

    loadProfiles()
  }, [user])

  useEffect(() => {
    if (user && !isInitialized) {
      initializeChatForUser()
    }
  }, [user, isInitialized])

  const initializeChatForUser = async () => {
    if (!user) return

    try {
      console.log("[v0] Initializing chat for user:", user.uid)

      // await recreateWelcomeMessage(user.uid)

      setIsInitialized(true)

      setTimeout(() => {
        loadChatMessages()
      }, 1000)
    } catch (error) {
      console.error("Error initializing chat:", error)
      loadChatMessages()
      setIsInitialized(true)
    }
  }

  const loadChatMessages = () => {
    if (!user) return

    console.log("[v0] Loading real chat messages for user:", user.uid)

    try {
      const messagesRef = collection(db, "chatMessages")
      const q = query(messagesRef, where("userId", "==", user.uid))

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loadedMessages: Message[] = []
        let hasNewAdminReply = false

        querySnapshot.forEach((doc) => {
          const data = doc.data()

          if (data.isFromIsabelle || data.isFromAdmin || data.messageType) {
            loadedMessages.push({
              id: doc.id,
              text: data.title ? `${data.title}\n\n${data.message}` : data.message,
              sender: "admin",
              timestamp: data.timestamp?.toDate() || new Date(),
              type: data.image ? "image" : "text",
              userId: "isabelle-lua",
              userName: data.senderName || "Isabelle Lua",
              isFromAdmin: true,
              image: data.image || undefined,
              isWelcomeMessage: data.isWelcomeMessage || false,
            })
          } else if (!data.isFromAdmin && !data.isWelcomeMessage && !data.isFromIsabelle) {
            // Mensagens do usuário
            loadedMessages.push({
              id: doc.id,
              text: data.message,
              sender: "user",
              timestamp: data.timestamp?.toDate() || new Date(),
              type: "text",
              userId: data.userId,
              userName: data.userName,
              read: data.read || false,
            })

            // Verificar se há resposta do admin
            if (data.adminReply) {
              loadedMessages.push({
                id: doc.id + "_reply",
                text: data.adminReply,
                sender: "admin",
                timestamp: data.adminReplyTimestamp?.toDate() || new Date(),
                type: "text",
                userId: "admin",
                userName: "Isabelle Lua",
              })

              if (!data.userNotified) {
                hasNewAdminReply = true
                setHasNewReply(true)

                toast({
                  title: "Nova resposta da Isabelle Lua! 💎",
                  description: "Isabelle Lua respondeu sua mensagem!",
                })

                if (notificationPermission === "granted") {
                  new Notification("Isabelle Lua te respondeu! 💎", {
                    body: `${data.adminReply.substring(0, 50)}${data.adminReply.length > 50 ? "..." : ""}`,
                    icon: "/isabelle-lua-avatar.png",
                    tag: `chat-reply-${doc.id}`,
                    requireInteraction: true,
                  })
                }

                updateDoc(doc.ref, { userNotified: true })
              }
            }
          }
        })

        loadedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        setMessages(loadedMessages)

        if (user && hasNewAdminReply) {
          localStorage.removeItem(`hasNewChatMessages_${user.uid}`)
        }

        console.log("[v0] Loaded", loadedMessages.length, "messages from Firebase")
      })

      return unsubscribe
    } catch (error) {
      console.error("Error loading chat messages:", error)
      setMessages([])
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === "granted") {
        toast({
          title: "Notificações ativadas! 🔔",
          description: "Você receberá notificações quando Isabelle Lua responder!",
        })
      }
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para conversar",
        variant: "destructive",
      })
      return
    }

    if (!canSendMessages) {
      toast({
        title: "Upgrade necessário 💎",
        description: "Faça upgrade para Premium ou Diamante para continuar a conversa com a Isabelle Lua!",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Sending message to Firebase:", newMessage)

      await addDoc(collection(db, "chatMessages"), {
        userId: user.uid,
        userName: currentUserProfile?.displayName || currentUserProfile?.username || "Usuário",
        userLevel: userLevel,
        message: newMessage,
        timestamp: serverTimestamp(),
        read: false,
        adminReply: null,
        userNotified: false,
        isFromAdmin: false,
      })

      setNewMessage("")

      toast({
        title: "Mensagem enviada! 💎",
        description: "Isabelle Lua receberá sua mensagem e responderá em breve!",
      })

      console.log("[v0] Message sent successfully to Firebase")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Login Necessário</h2>
            <p className="text-muted-foreground">Você precisa estar logado para acessar o chat com a Isabelle Lua.</p>
            <Button className="w-full rounded-full glow-pink-hover" onClick={() => router.push("/")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-full overflow-hidden">
      <div className="bg-background border-b border-border/50 p-3 sm:p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Button variant="ghost" size="sm" className="rounded-full p-2 shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-primary/20 shrink-0">
            <AvatarImage src={isabelleProfile?.profileImage || "/beautiful-woman-profile.png"} alt="Isabelle Lua" />
            <AvatarFallback>IL</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-base sm:text-lg truncate">Isabelle Lua</h1>
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs">✓</span>
              </div>
              {hasNewReply && (
                <Badge variant="destructive" className="animate-pulse text-xs">
                  Nova resposta!
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{isTyping ? "digitando..." : "online"}</p>
          </div>

          {notificationPermission === "default" && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-2 text-muted-foreground hover:text-primary shrink-0"
              onClick={requestNotificationPermission}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto ring-4 ring-primary/20">
              <AvatarImage src={isabelleProfile?.profileImage || "/beautiful-woman-profile.png"} alt="Isabelle Lua" />
              <AvatarFallback>IL</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Chat com Isabelle Lua</h3>
              <p className="text-muted-foreground text-sm">
                {!isInitialized ? "Preparando o chat... 💎" : "Nenhuma mensagem ainda"}
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-end space-x-2 max-w-[85%] sm:max-w-[80%] ${
                  message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                }`}
              >
                {message.sender === "admin" && (
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-2 ring-primary/20 shrink-0">
                    <AvatarImage
                      src={isabelleProfile?.profileImage || "/beautiful-woman-profile.png"}
                      alt="Isabelle Lua"
                    />
                    <AvatarFallback>IL</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${
                    message.sender === "user"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.image && (
                    <div className="mb-2">
                      <img
                        src={message.image || "/placeholder.svg"}
                        alt="Imagem da mensagem"
                        className="max-w-full h-auto rounded-lg border"
                        style={{ maxHeight: "150px" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                  )}

                  <div className="text-sm leading-relaxed break-words whitespace-pre-line">{message.text}</div>

                  <p
                    className={`text-xs mt-1 ${message.sender === "user" ? "text-blue-100" : "text-muted-foreground"}`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border/50 p-3 sm:p-4 bg-background">
        {!canSendMessages ? (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200/50 dark:border-rose-800/30 p-3 sm:p-4 rounded-xl text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
              <p className="font-medium text-rose-700 dark:text-rose-300 text-sm sm:text-base">
                Faça upgrade para continuar a conversa! 💎
              </p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Usuários Premium e Diamante podem conversar diretamente com a Isabelle Lua
            </p>
            <Button
              className="w-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              onClick={() => router.push("/subscription")}
            >
              Fazer Upgrade Agora
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="rounded-full pr-12 bg-secondary border-secondary focus:border-primary text-sm sm:text-base"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-7 w-7 sm:h-8 sm:w-8 p-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
