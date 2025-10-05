"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon, VideoIcon, Loader2, X, Lock, Users, Crown, Upload } from "lucide-react"
import { updateCreatorContentCount } from "@/lib/firebase/firestore"
import { createPostAction } from "@/app/actions/posts"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase/config"

interface CreatorPostComposerProps {
  userProfile: any
  onPostCreated?: () => void
}

export function CreatorPostComposer({ userProfile, onPostCreated }: CreatorPostComposerProps) {
  const [user] = useAuthState(auth)
  const [content, setContent] = useState("")
  const [imageLinks, setImageLinks] = useState<string[]>([])
  const [videoLinks, setVideoLinks] = useState<string[]>([])
  const [currentImageLink, setCurrentImageLink] = useState("")
  const [currentVideoLink, setCurrentVideoLink] = useState("")
  const [requiredLevel, setRequiredLevel] = useState<"Bronze" | "Gold" | "Platinum" | "Diamante">("Bronze")
  const [likes, setLikes] = useState("")
  const [comments, setComments] = useState("")
  const [retweets, setRetweets] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const addImageLink = () => {
    if (currentImageLink.trim() && imageLinks.length < 4) {
      setImageLinks([...imageLinks, currentImageLink.trim()])
      setCurrentImageLink("")
    }
  }

  const addVideoLink = () => {
    if (currentVideoLink.trim() && videoLinks.length < 2) {
      setVideoLinks([...videoLinks, currentVideoLink.trim()])
      setCurrentVideoLink("")
    }
  }

  const removeImageLink = (index: number) => {
    setImageLinks(imageLinks.filter((_, i) => i !== index))
  }

  const removeVideoLink = (index: number) => {
    setVideoLinks(videoLinks.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim() || !user) return

    const finalImageLinks = [...imageLinks]
    const finalVideoLinks = [...videoLinks]

    // Se há um link de imagem digitado mas não adicionado, adicionar automaticamente
    if (currentImageLink.trim() && finalImageLinks.length < 4) {
      finalImageLinks.push(currentImageLink.trim())
    }

    // Se há um link de vídeo digitado mas não adicionado, adicionar automaticamente
    if (currentVideoLink.trim() && finalVideoLinks.length < 2) {
      finalVideoLinks.push(currentVideoLink.trim())
    }

    setIsLoading(true)
    try {
      const result = await createPostAction({
        content: content.trim(),
        mediaUrls: [...finalImageLinks, ...finalVideoLinks],
        mediaTypes: [...finalImageLinks.map(() => "image" as const), ...finalVideoLinks.map(() => "video" as const)],
        visibility: requiredLevel === "Bronze" ? "public" : "subscribers",
        tags: [],
      })

      if (!result.success) {
        console.error("[v0] Error creating post:", result.error)
        alert(result.error)
        return
      }

      console.log("[v0] Post created successfully with ID:", result.postId)

      await updateCreatorContentCount(user.uid, 1)

      // Reset form
      setContent("")
      setImageLinks([])
      setVideoLinks([])
      setCurrentImageLink("")
      setCurrentVideoLink("")
      setLikes("")
      setComments("")
      setRetweets("")
      setRequiredLevel("Bronze")
      setIsExpanded(false)

      onPostCreated?.()
    } catch (error) {
      console.error("[v0] Error creating post:", error)
      alert("Erro ao criar post. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageLinkKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addImageLink()
    }
  }

  const handleVideoLinkKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addVideoLink()
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Platinum":
        return <Crown className="h-3 w-3" />
      case "Diamante":
        return <Crown className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Bronze":
        return "bg-orange-600/20 text-orange-400 border-orange-600/30"
      case "Gold":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "Platinum":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case "Diamante":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (userProfile?.userType !== "creator") {
    return null
  }

  return (
    <div className="w-full mb-4">
      <Card className="glow-pink border-primary/20 bg-card/80 backdrop-blur-md">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-lg">
                <AvatarImage
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt={userProfile.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userProfile.displayName?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-foreground truncate">{userProfile.displayName}</span>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-primary/20 text-primary border-primary/30 px-2 py-0.5"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Criadora
                  </Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Select value={requiredLevel} onValueChange={(value: any) => setRequiredLevel(value)}>
                    <SelectTrigger className="w-28 h-8 bg-background/50 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bronze">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-orange-500" />
                          <span>Bronze</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Gold">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-yellow-500" />
                          <span>Gold</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Platinum">
                        <div className="flex items-center space-x-1">
                          <Crown className="h-3 w-3 text-pink-500" />
                          <span>Platinum</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Diamante">
                        <div className="flex items-center space-x-1">
                          <Crown className="h-3 w-3 text-cyan-500" />
                          <span>Diamante</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className={`text-xs ${getLevelColor(requiredLevel)} flex-shrink-0`}>
                    {getLevelIcon(requiredLevel)}
                    <span className="ml-1">{requiredLevel}</span>
                  </Badge>
                </div>
              </div>

              <Textarea
                placeholder="Compartilhe algo especial com sua audiência..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                className="min-h-[50px] border-border/50 focus:ring-primary focus:border-primary resize-none bg-background/50 backdrop-blur-sm leading-relaxed w-full mb-3"
                maxLength={500}
              />

              {isExpanded && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Link da imagem (opcional)"
                        value={currentImageLink}
                        onChange={(e) => setCurrentImageLink(e.target.value)}
                        onKeyPress={handleImageLinkKeyPress}
                        className="flex-1 h-8 text-xs"
                        disabled={imageLinks.length >= 4}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addImageLink}
                        disabled={!currentImageLink.trim() || imageLinks.length >= 4}
                        className="h-8 px-3 text-xs"
                      >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Foto ({imageLinks.length}/4)
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Link do vídeo (opcional)"
                        value={currentVideoLink}
                        onChange={(e) => setCurrentVideoLink(e.target.value)}
                        onKeyPress={handleVideoLinkKeyPress}
                        className="flex-1 h-8 text-xs"
                        disabled={videoLinks.length >= 2}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addVideoLink}
                        disabled={!currentVideoLink.trim() || videoLinks.length >= 2}
                        className="h-8 px-3 text-xs"
                      >
                        <VideoIcon className="h-3 w-3 mr-1" />
                        Vídeo ({videoLinks.length}/2)
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Configurar interações (opcional):</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Curtidas"
                        value={likes}
                        onChange={(e) => setLikes(e.target.value.replace(/\D/g, ""))}
                        className="h-8 text-xs"
                        maxLength={4}
                      />
                      <Input
                        placeholder="Comentários"
                        value={comments}
                        onChange={(e) => setComments(e.target.value.replace(/\D/g, ""))}
                        className="h-8 text-xs"
                        maxLength={4}
                      />
                      <Input
                        placeholder="Retweets"
                        value={retweets}
                        onChange={(e) => setRetweets(e.target.value.replace(/\D/g, ""))}
                        className="h-8 text-xs"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  {(imageLinks.length > 0 || videoLinks.length > 0) && (
                    <div className="space-y-2">
                      {imageLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeImageLink(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {videoLinks.map((link, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <VideoIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeVideoLink(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div></div>

                <div className="flex items-center space-x-3">
                  <div className="text-xs text-muted-foreground">
                    <span
                      className={content.length > 450 ? "text-orange-500" : content.length > 480 ? "text-red-500" : ""}
                    >
                      {content.length}
                    </span>
                    /500
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isLoading}
                    size="sm"
                    className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Postando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
