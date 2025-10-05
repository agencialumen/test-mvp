import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  setDoc, // Adicionando setDoc para criar documentos
  writeBatch,
  startAfter,
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "./config"

// Tipos de dados
export interface UserProfile {
  uid: string
  username: string
  displayName: string
  bio: string
  profileImage: string
  level: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum" // Adicionado Bronze, Prata, Platinum
  userType: "user" | "creator"
  createdAt: any
  updatedAt: any
  lastSeen?: any
  xp?: number
  totalXp?: number
  isVerified?: boolean
  followerCount?: number
  contentCount?: number
  specialties?: string[] // Ex: ["lifestyle", "beauty", "fitness"]
  satisfaction?: number
  subscription?: {
    // Adicionado para Stripe integration
    tier: "prata" | "gold" | "platinum" | "diamante"
    stripeSubscriptionId: string
    stripeCustomerId: string
    status: "active" | "canceled" | "past_due"
    currentPeriodEnd: Date
  }
  // Creator-specific fields
  coverImage?: string
  category?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  pricing?: {
    premium?: number
    diamante?: number
  }
}

export interface Post {
  id?: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorProfileImage: string
  authorUserType?: "user" | "creator" // Adicionando campo authorUserType
  content: string
  images: string[]
  videos: string[]
  likes: number
  comments: number
  retweets: number
  requiredLevel?: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum" // Adicionado Bronze, Prata, Platinum
  createdAt: any
  updatedAt: any
}

export interface Like {
  id?: string
  userId: string
  postId: string
  createdAt: any
}

export interface Comment {
  id?: string
  userId: string
  postId: string
  username: string
  displayName: string
  profileImage: string
  content: string
  createdAt: any
}

export interface Retweet {
  id?: string
  userId: string
  postId: string
  originalAuthorId: string
  createdAt: any
  originalPost?: any
}

export interface Notification {
  id?: string
  userId: string
  type: "message" | "welcome" | "upgrade" | "system" | "mission" | "level_up" | "xp_gained" | "follow" // Adicionado "follow"
  title: string
  message: string
  actionUrl?: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
  read: boolean // Corrigindo inconsistência no campo de leitura das notificações
  expiresAt: any
  createdAt: any
}

// Interfaces e funções para sistema de templates de notificação
export interface NotificationTemplate {
  id?: string
  title: string
  message: string
  type: "welcome" | "promotion" | "announcement" | "custom"
  targetLevel: "all" | "Bronze" | "Prata" | "Gold" | "Diamante" | "Platinum" // Adicionado Platinum
  isActive: boolean
  createdAt: any
  createdBy: string
  scheduledFor?: string
}

interface AutomaticMessage {
  type: string
  content: string
  image?: string
  targetLevel?: string
  title?: string
}

export interface CreatorProfile extends UserProfile {
  userType: "creator"
  isVerified: boolean
  followerCount: number
  contentCount: number
  coverImage?: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  pricing?: {
    premium?: number
    diamante?: number
  }
}

// Funções para Posts
export const createPost = async (postData: Omit<Post, "id" | "createdAt" | "updatedAt">) => {
  try {
    console.log("[v0] createPost called with data:", postData)
    console.log("[v0] Images array:", postData.images)
    console.log("[v0] Videos array:", postData.videos)

    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log("[v0] Post created in Firebase with ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating post:", error)
    throw error
  }
}

export const getPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50))

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]
    callback(posts)
  })
}

export const getPostsByAuthor = async (authorUsername: string): Promise<Post[]> => {
  try {
    console.log("[v0] Getting posts by author:", authorUsername)
    const postsRef = collection(db, "posts")
    const q = query(postsRef, where("authorUsername", "==", authorUsername))
    const querySnapshot = await getDocs(q)

    console.log("[v0] Query snapshot size:", querySnapshot.size)

    const posts = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      console.log("[v0] Post found:", { id: doc.id, authorUsername: data.authorUsername, content: data.content })
      return {
        id: doc.id,
        ...data,
      }
    }) as Post[]

    const sortedPosts = posts.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    console.log("[v0] Total posts found for", authorUsername, ":", posts.length)
    return sortedPosts
  } catch (error) {
    console.error("[v0] Error getting posts by author:", error)
    return []
  }
}

export const getPostsPaginated = (
  callback: (posts: Post[], hasMore: boolean) => void,
  lastDoc?: any,
  limitCount = 10,
) => {
  let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount))

  if (lastDoc) {
    q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount))
  }

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    const hasMore = snapshot.docs.length === limitCount
    const lastDocument = snapshot.docs[snapshot.docs.length - 1]

    callback(posts, hasMore)
  })
}

export const getPostsPaginatedOptimized = (
  callback: (posts: Post[], hasMore: boolean) => void,
  lastDoc?: any,
  limitCount = 10,
) => {
  // Calculate timestamp for 24 hours ago
  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  let q = query(
    collection(db, "posts"),
    where("createdAt", ">=", twentyFourHoursAgo),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  )

  if (lastDoc) {
    q = query(
      collection(db, "posts"),
      where("createdAt", ">=", twentyFourHoursAgo),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(limitCount),
    )
  }

  return onSnapshot(q, async (snapshot) => {
    let posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    if (posts.length === 0 && !lastDoc) {
      console.log("[v0] No posts in last 24h, fetching older posts")
      const fallbackQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount))

      const fallbackSnapshot = await getDocs(fallbackQuery)
      posts = fallbackSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[]
    }

    const hasMore = snapshot.docs.length === limitCount
    callback(posts, hasMore)
  })
}

export const getPostsPaginatedImproved = (
  callback: (posts: Post[], hasMore: boolean, lastVisible: any) => void,
  lastDoc?: any,
  limitCount = 15,
) => {
  let q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(limitCount + 1))

  if (lastDoc) {
    q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount + 1))
  }

  return onSnapshot(q, (snapshot) => {
    const allDocs = snapshot.docs
    const hasMore = allDocs.length > limitCount

    // Get only the requested number of posts
    const postsToShow = hasMore ? allDocs.slice(0, limitCount) : allDocs

    const posts = postsToShow.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Post[]

    // The last visible document for pagination
    const lastVisible = postsToShow[postsToShow.length - 1]

    callback(posts, hasMore, lastVisible)
  })
}

export const loadMorePosts = async (
  lastDoc: any,
  limitCount = 15,
): Promise<{ posts: Post[]; hasMore: boolean; lastVisible: any }> => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount + 1))

  const snapshot = await getDocs(q)
  const allDocs = snapshot.docs
  const hasMore = allDocs.length > limitCount

  const postsToShow = hasMore ? allDocs.slice(0, limitCount) : allDocs

  const posts = postsToShow.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Post[]

  const lastVisible = postsToShow[postsToShow.length - 1]

  return { posts, hasMore, lastVisible }
}

// Funções para Perfis de Usuário
export const createUserProfile = async (profileData: Omit<UserProfile, "createdAt" | "updatedAt">) => {
  try {
    await updateDoc(doc(db, "users", profileData.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating user profile:", error)
    throw error
  }
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting user profile:", error)
    throw error
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<UserProfile, "displayName" | "bio" | "profileImage" | "level" | "xp" | "totalXp" | "satisfaction">
  > & {
    // Adicionado 'satisfaction' aqui
    coverImage?: string
    category?: string
    socialLinks?: {
      instagram?: string
      twitter?: string
      tiktok?: string
      youtube?: string
    }
    pricing?: {
      premium?: number
      diamante?: number
    }
  },
) {
  try {
    const userRef = doc(db, "users", uid)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Profile updated successfully")
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    throw error
  }
}

export const createCreatorProfile = async (profileData: Omit<CreatorProfile, "createdAt" | "updatedAt">) => {
  try {
    console.log("[v0] Creating creator profile with data:", profileData)

    await setDoc(
      doc(db, "users", profileData.uid),
      {
        ...profileData,
        userType: "creator",
        isVerified: false,
        followerCount: 0,
        contentCount: 0,
        satisfaction: 0, // Inicializando satisfaction para criadores
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    console.log("[v0] Creator profile created successfully")
  } catch (error) {
    console.error("[v0] Error creating creator profile:", error)
    throw error
  }
}

export const getCreatorProfile = async (creatorId: string): Promise<CreatorProfile | null> => {
  try {
    const userProfile = await getUserProfile(creatorId)

    if (!userProfile || userProfile.userType !== "creator") {
      return null
    }

    return userProfile as CreatorProfile
  } catch (error) {
    console.error("[v0] Error getting creator profile:", error)
    return null
  }
}

export const getAllCreators = async (): Promise<CreatorProfile[]> => {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("userType", "==", "creator"))
    const querySnapshot = await getDocs(q)

    const creators = querySnapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    })) as CreatorProfile[]

    return creators.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0))
  } catch (error) {
    console.error("[v0] Error getting all creators:", error)
    return []
  }
}

export const isUserCreator = async (uid: string): Promise<boolean> => {
  try {
    const userProfile = await getUserProfile(uid)
    return userProfile?.userType === "creator"
  } catch (error) {
    console.error("[v0] Error checking if user is creator:", error)
    return false
  }
}

export const updateCreatorFollowerCount = async (creatorUid: string, increment: number) => {
  try {
    const creatorRef = doc(db, "users", creatorUid)
    await updateDoc(creatorRef, {
      followerCount: increment > 0 ? increment(increment) : increment(-Math.abs(increment)),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator follower count:", error)
    throw error
  }
}

export const updateCreatorContentCount = async (creatorUid: string, incrementValue: number) => {
  try {
    const creatorRef = doc(db, "users", creatorUid)
    await updateDoc(creatorRef, {
      contentCount: increment(incrementValue),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator content count:", error)
    throw error
  }
}

// Funções para Curtidas
export const toggleLike = async (userId: string, postId: string) => {
  try {
    // Verificar se o usuário é criadora - criadoras não podem curtir posts
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem curtir posts")
    }

    const userLevel = userData.level || "bronze" // Default to bronze

    // Verificar se o usuário pode curtir
    if (!canUserPerformAction(userLevel, "like")) {
      throw new Error("Seu nível não permite curtir posts")
    }

    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      // Adicionar curtida
      await addDoc(likesRef, {
        userId,
        postId,
        createdAt: serverTimestamp(),
      })

      // Incrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        likes: increment(1),
      })

      const hasGainedXP = await hasUserGainedXPForPost(userId, postId, "like")
      let xpGained = 0

      if (!hasGainedXP) {
        xpGained = getXPForAction("like")
        await addXPToUser(userId, xpGained, "like")
        await trackXPGained(userId, postId, "like", xpGained)
      }

      return { liked: true, xpGained }
    } else {
      // Remover curtida
      const likeDoc = querySnapshot.docs[0]
      await deleteDoc(likeDoc.ref)

      // Decrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        likes: increment(-1),
      })

      return { liked: false, xpGained: 0 }
    }
  } catch (error) {
    console.error("[v0] Error toggling like:", error)
    throw error
  }
}

export const checkUserLiked = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking user liked:", error)
    return false
  }
}

// Funções para Retweets
export const toggleRetweet = async (userId: string, postId: string, originalAuthorId: string) => {
  try {
    // Verificar se o usuário é criadora - criadoras não podem retuitar posts
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem retuitar posts")
    }

    const userLevel = userData.level || "bronze" // Default to bronze

    // Verificar se o usuário pode retuitar
    if (!canUserPerformAction(userLevel, "retweet")) {
      throw new Error("Seu nível não permite retuitar posts. Upgrade para Prata ou superior!")
    }

    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      const postDoc = await getDoc(doc(db, "posts", postId))
      if (!postDoc.exists()) {
        throw new Error("Post não encontrado")
      }

      const postData = postDoc.data()

      await addDoc(retweetsRef, {
        userId,
        postId,
        originalAuthorId,
        createdAt: serverTimestamp(),
        originalPost: {
          id: postId,
          content: postData.content || "",
          images: postData.images || [],
          authorDisplayName: postData.authorDisplayName || "",
          authorUsername: postData.authorUsername || "",
          authorProfileImage: postData.authorProfileImage || "/avatars/default.jpg",
          requiredLevel: postData.requiredLevel || "bronze", // Valor padrão para posts antigos
          createdAt: postData.createdAt || serverTimestamp(),
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          retweets: postData.retweets || 0,
        },
      })

      // Incrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        retweets: increment(1),
      })

      const hasGainedXP = await hasUserGainedXPForPost(userId, postId, "retweet")
      let xpGained = 0

      if (!hasGainedXP) {
        xpGained = getXPForAction("retweet")
        await addXPToUser(userId, xpGained, "retweet")
        await trackXPGained(userId, postId, "retweet", xpGained)
      }

      return { retweeted: true, xpGained }
    } else {
      // Remover retweet
      const retweetDoc = querySnapshot.docs[0]
      await deleteDoc(retweetDoc.ref)

      // Decrementar contador no post
      await updateDoc(doc(db, "posts", postId), {
        retweets: increment(-1),
      })

      return { retweeted: false, xpGained: 0 }
    }
  } catch (error) {
    console.error("[v0] Error toggling retweet:", error)
    throw error
  }
}

export const getUserRetweets = async (userId: string) => {
  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    const retweets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return retweets.sort((a: any, b: any) => {
      const aTime = a.createdAt?.seconds || 0
      const bTime = b.createdAt?.seconds || 0
      return bTime - aTime // ordem decrescente (mais recente primeiro)
    })
  } catch (error) {
    console.error("[v0] Error getting user retweets:", error)
    return []
  }
}

export const checkUserRetweeted = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "==", postId))
    const querySnapshot = await getDocs(q)

    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking user retweeted:", error)
    return false
  }
}

// Funções para Comentários
export const addComment = async (commentData: Omit<Comment, "id" | "createdAt">) => {
  try {
    // Verificar se o usuário é criadora - criadoras não podem comentar posts
    const userDoc = await getDoc(doc(db, "users", commentData.userId))
    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado")
    }

    const userData = userDoc.data()

    if (userData.userType === "creator") {
      throw new Error("Criadoras não podem comentar posts")
    }

    const userLevel = userData.level || "bronze" // Default to bronze

    // Verificar se o usuário pode comentar
    if (!canUserPerformAction(userLevel, "comment")) {
      throw new Error("Seu nível não permite comentar. Upgrade para Gold ou superior!")
    }

    const docRef = await addDoc(collection(db, "comments"), {
      ...commentData,
      createdAt: serverTimestamp(),
    })

    // Incrementar contador de comentários no post
    await updateDoc(doc(db, "posts", commentData.postId), {
      comments: increment(1),
    })

    // Adicionar XP ao usuário
    const xpGained = getXPForAction("comment")
    await addXPToUser(commentData.userId, xpGained, "comment")

    return { commentId: docRef.id, xpGained }
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    throw error
  }
}

export const getPostComments = (postId: string, callback: (comments: Comment[]) => void) => {
  const q = query(collection(db, "comments"), where("postId", "==", postId))

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Comment[]

    // Ordenar no lado do cliente para evitar índice composto
    const sortedComments = comments.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    callback(sortedComments)
  })
}

// Funções adicionais
export const ensureUserDocument = async (uid: string, userData?: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, "users", uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.log("[v0] Creating user document with data:", userData)

      const isCreator = userData?.userType === "creator"

      const defaultUserData = {
        uid,
        username: userData?.username || `user_${uid.slice(0, 8)}`,
        displayName: userData?.displayName || userData?.username || "Usuário",
        bio: userData?.bio || "",
        profileImage: userData?.profileImage || "",
        ...(isCreator ? {} : { level: "bronze" }), // Bronze é o nível inicial obrigatório para todos os usuários
        userType: userData?.userType || "user", // Tipo padrão é usuário normal
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        ...(isCreator ? {} : { xp: 0, totalXp: 0 }),
        ...(isCreator ? { satisfaction: 0 } : {}), // Only add satisfaction for creators
      }

      await setDoc(userRef, defaultUserData, { merge: true })
      console.log("[v0] User document created with username:", defaultUserData.username)
    } else {
      // Se o usuário já existe e é um criador, garantir que 'satisfaction' esteja presente se não estiver
      if (userData?.userType === "creator" && userSnap.data()?.satisfaction === undefined) {
        await updateDoc(userRef, {
          satisfaction: 0,
          updatedAt: serverTimestamp(),
        })
        console.log("[v0] Added 'satisfaction' field to existing creator profile.")
      }

      if (userData && userData.username) {
        await updateDoc(userRef, {
          username: userData.username,
          displayName: userData.displayName || userData.username,
          updatedAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        })
        console.log("[v0] User document updated with username:", userData.username)
      }
    }
  } catch (error) {
    console.error("[v0] Error ensuring user document:", error)
    throw error
  }
}

export const updateUserLastSeen = async (uid: string) => {
  try {
    // Primeiro garantir que o documento existe
    await ensureUserDocument(uid)

    // Depois atualizar o lastSeen
    await updateDoc(doc(db, "users", uid), {
      lastSeen: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating last seen:", error)
    // Não relançar o erro para não quebrar a aplicação
  }
}

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    // Decodificar a URL para lidar com espaços (%20)
    const decodedUsername = decodeURIComponent(username)

    // Caso especial para o perfil da Isabelle
    if (decodedUsername === "isabellelua") {
      const isabelleProfile = await ensureIsabelleProfile()
      return {
        uid: "isabelle-lua-uid",
        username: "isabellelua",
        displayName: isabelleProfile.displayName,
        bio: isabelleProfile.bio,
        profileImage: isabelleProfile.profileImage,
        level: "diamante",
        createdAt: isabelleProfile.createdAt,
        updatedAt: isabelleProfile.updatedAt,
      } as UserProfile
    }

    const usersRef = collection(db, "users")
    const q = query(usersRef, where("username", "==", decodedUsername), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { uid: doc.id, ...doc.data() } as UserProfile
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting user by username:", error)
    return null
  }
}

// Funções para deletar posts
export const deletePost = async (postId: string) => {
  try {
    console.log("[v0] Deleting post:", postId)

    // Deletar o post
    await deleteDoc(doc(db, "posts", postId))

    // Deletar todas as curtidas relacionadas
    const likesRef = collection(db, "likes")
    const likesQuery = query(likesRef, where("postId", "==", postId))
    const likesSnapshot = await getDocs(likesQuery)

    const deletePromises = []
    likesSnapshot.forEach((likeDoc) => {
      deletePromises.push(deleteDoc(likeDoc.ref))
    })

    // Deletar todos os comentários relacionados
    const commentsRef = collection(db, "comments")
    const commentsQuery = query(commentsRef, where("postId", "==", postId))
    const commentsSnapshot = await getDocs(commentsQuery) // Correction: Use commentsQuery here

    commentsSnapshot.forEach((commentDoc) => {
      deletePromises.push(deleteDoc(commentDoc.ref))
    })

    // Deletar todos os retweets relacionados
    const retweetsRef = collection(db, "retweets")
    const retweetsQuery = query(retweetsRef, where("postId", "==", postId))
    const retweetsSnapshot = await getDocs(retweetsQuery)

    retweetsSnapshot.forEach((retweetDoc) => {
      deletePromises.push(deleteDoc(retweetDoc.ref))
    })

    // Executar todas as deleções
    await Promise.all(deletePromises)

    console.log("[v0] Post and related data deleted successfully")
    return true
  } catch (error) {
    console.error("[v0] Error deleting post:", error)
    throw error
  }
}

// Funções para perfil específico da Isabelle
export const getIsabelleProfile = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data()
    }

    // Retornar dados padrão se não existir
    return {
      displayName: "Isabelle Lua",
      bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
      profileImage: "/beautiful-woman-profile.png",
    }
  } catch (error) {
    console.error("[v0] Error getting Isabelle profile:", error)
    // Retornar dados padrão em caso de erro
    return {
      displayName: "Isabelle Lua",
      bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
      profileImage: "/beautiful-woman-profile.png",
    }
  }
}

export const saveIsabelleProfile = async (profileData: any) => {
  try {
    await setDoc(
      doc(db, "profiles", "isabelle-lua"),
      {
        ...profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    console.log("[v0] Isabelle profile saved successfully")
  } catch (error) {
    console.error("[v0] Error saving Isabelle profile:", error)
    throw error
  }
}

export const updateIsabelleStats = async (statsData: { followers: string; satisfaction: string }) => {
  try {
    await setDoc(
      doc(db, "profiles", "isabelle-lua"),
      {
        stats: {
          followers: statsData.followers,
          satisfaction: statsData.satisfaction,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    console.log("[v0] Isabelle stats updated successfully")
  } catch (error) {
    console.error("[v0] Error updating Isabelle stats:", error)
    throw error
  }
}

export const getIsabelleStats = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.stats || { followers: "2.1M", satisfaction: "98%" }
    }

    // Retornar dados padrão se não existir
    return { followers: "2.1M", satisfaction: "98%" }
  } catch (error) {
    console.error("[v0] Error getting Isabelle stats:", error)
    // Retornar dados padrão em caso de erro
    return { followers: "2.1M", satisfaction: "98%" }
  }
}

export const ensureIsabelleProfile = async () => {
  try {
    const docRef = doc(db, "profiles", "isabelle-lua")
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      console.log("[v0] Creating Isabelle profile document...")

      const defaultIsabelleProfile = {
        displayName: "Isabelle Lua",
        bio: "✨ Modelo & Influenciadora Digital\n💄 Beauty & Lifestyle Content\n🌟 Conteúdo Exclusivo Premium",
        profileImage: "/beautiful-woman-profile.png",
        stats: {
          followers: "2.1M",
          satisfaction: "98%",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(docRef, defaultIsabelleProfile)
      console.log("[v0] Isabelle profile created successfully")
      return defaultIsabelleProfile
    }

    return docSnap.data()
  } catch (error) {
    console.error("[v0] Error ensuring Isabelle profile:", error)
    throw error
  }
}

export const ensureIsabelleUserDocument = async () => {
  try {
    const isabelleUid = "isabelle-lua-uid"
    const userRef = doc(db, "users", isabelleUid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.log("[v0] Creating Isabelle user document...")

      const isabelleProfile = await getIsabelleProfile()

      const isabelleUserData = {
        uid: isabelleUid,
        username: "isabellelua",
        displayName: isabelleProfile.displayName,
        bio: isabelleProfile.bio,
        profileImage: isabelleProfile.profileImage,
        level: "Gold",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        xp: 0,
        totalXp: 0,
      }

      await setDoc(userRef, isabelleUserData)
      console.log("[v0] Isabelle user document created successfully")
      return isabelleUserData
    }

    return { uid: isabelleUid, ...userSnap.data() }
  } catch (error) {
    console.error("[v0] Error ensuring Isabelle user document:", error)
    throw error
  }
}

export const createIsabelleMessageNotification = async (userId: string) => {
  try {
    await createNotificationWithExpiry({
      userId,
      type: "message",
      title: "Nova mensagem da DeLuxe! 💎",
      message: "A plataforma DeLuxe acabou de te enviar uma mensagem especial!",
      fromUserId: "deluxe-platform-uid",
      fromUsername: "deluxe",
      fromDisplayName: "DeLuxe",
      fromProfileImage: "/deluxe-logo.png",
    })
  } catch (error) {
    console.error("[v0] Error creating DeLuxe message notification:", error)
  }
}

export const createNotificationWithExpiry = async (notificationData: {
  userId: string
  type: "message" | "welcome" | "upgrade" | "system"
  title: string
  message: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
}) => {
  try {
    // Calcular data de expiração (24 horas a partir de agora)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      expiresAt: expiresAt,
      createdAt: serverTimestamp(),
    })

    console.log("[v0] Notification created with 24h expiry:", notificationData.type)
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    throw error
  }
}

export const cleanExpiredNotifications = async () => {
  try {
    const now = new Date()
    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("expiresAt", "<=", now))
    const querySnapshot = await getDocs(q)

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    console.log(`[v0] Cleaned ${querySnapshot.docs.length} expired notifications`)
  } catch (error) {
    console.error("[v0] Error cleaning expired notifications:", error)
  }
}

export const getActiveUserNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(50))

  return onSnapshot(q, (snapshot) => {
    const now = new Date()
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[]

    const activeNotifications = notifications
      .filter((notification) => {
        if (!notification.expiresAt) return false
        const expiresDate = notification.expiresAt.toDate
          ? notification.expiresAt.toDate()
          : new Date(notification.expiresAt)
        return expiresDate > now
      })
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10)

    callback(activeNotifications)
  })
}

export const createNotification = async (notificationData: {
  userId: string
  type: string
  message: string
  fromUserId?: string
  fromUsername?: string
  fromDisplayName?: string
  fromProfileImage?: string
}) => {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notificationData,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    throw error
  }
}

export const getUserNotifications = (userId: string, callback: (notifications: any[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(20))

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const sortedNotifications = notifications.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0
      return b.createdAt.toMillis() - a.createdAt.toMillis()
    })

    callback(sortedNotifications)
  })
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true, // Mudando de isRead para read para consistência
    })
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    throw error
  }
}

export const deleteNotification = async (notificationId: string) => {
  try {
    await deleteDoc(doc(db, "notifications", notificationId))
    console.log("[v0] Notification deleted successfully:", notificationId)
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
  }
}

export const deleteIsabelleNotifications = async (userId?: string) => {
  try {
    const notificationsRef = collection(db, "notifications")
    let q

    if (userId) {
      // Remove notificações da DeLuxe para um usuário específico
      q = query(notificationsRef, where("userId", "==", userId), where("fromUserId", "==", "deluxe-platform-uid"))
    } else {
      // Remove todas as notificações da DeLuxe
      q = query(notificationsRef, where("fromUserId", "==", "deluxe-platform-uid"))
    }

    const querySnapshot = await getDocs(q)
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
    console.log(`[v0] Deleted ${querySnapshot.docs.length} DeLuxe notifications`)
    return querySnapshot.docs.length
  } catch (error) {
    console.error("[v0] Error deleting DeLuxe notifications:", error)
    throw error
  }
}

export const deleteFollowNotifications = async (userId: string) => {
  try {
    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("userId", "==", userId), where("type", "==", "follow"))
    const querySnapshot = await getDocs(q)

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))

    await Promise.all(deletePromises)
    console.log("[v0] All follow notifications deleted for user:", userId)
  } catch (error) {
    console.error("[v0] Error deleting follow notifications:", error)
  }
}

export const updatePostCounters = async (
  postId: string,
  counters: {
    likes?: number
    comments?: number
    retweets?: number
  },
) => {
  try {
    const updateData: any = {}

    if (counters.likes !== undefined) {
      updateData.likes = Math.max(0, counters.likes)
    }
    if (counters.comments !== undefined) {
      updateData.comments = Math.max(0, counters.comments)
    }
    if (counters.retweets !== undefined) {
      updateData.retweets = Math.max(0, counters.retweets)
    }

    updateData.updatedAt = serverTimestamp()

    await updateDoc(doc(db, "posts", postId), updateData)
    console.log("[v0] Post counters updated successfully:", { postId, counters })
    return true
  } catch (error) {
    console.error("[v0] Error updating post counters:", error)
    throw error
  }
}

export const incrementPostCounter = async (
  postId: string,
  counterType: "likes" | "comments" | "retweets",
  amount = 1,
) => {
  try {
    const updateData: any = {
      [counterType]: increment(amount),
      updatedAt: serverTimestamp(),
    }

    await updateDoc(doc(db, "posts", postId), updateData)
    console.log("[v0] Post counter incremented:", { postId, counterType, amount })
    return true
  } catch (error) {
    console.error("[v0] Error incrementing post counter:", error)
    throw error
  }
}

// Função para atualizar nível do usuário
export const updateUserLevel = async (
  uid: string,
  level: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum",
) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      level,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] User level updated:", { uid, level })
  } catch (error) {
    console.error("[v0] Error updating user level:", error)
    throw error
  }
}

export const getCurrentUserLevel = async (
  uid: string,
): Promise<"Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum"> => {
  try {
    const userProfile = await getUserProfile(uid)
    return userProfile?.level || "bronze" // Default to bronze
  } catch (error) {
    console.error("[v0] Error getting current user level:", error)
    return "bronze"
  }
}

// Funções adicionais para sistema de XP e verificação de níveis
export const addXPToUser = async (userId: string, xpAmount: number, action: string) => {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.error("[v0] User document not found")
      return
    }

    const userData = userDoc.data()
    const currentXP = userData.xp || 0
    const currentTotalXP = userData.totalXp || 0
    const currentLevel = userData.level || "bronze" // Default to bronze

    const newXP = currentXP + xpAmount
    const newTotalXP = currentTotalXP + xpAmount

    // Calcular novo nível baseado no XP total
    const newLevel = calculateLevelFromXP(newTotalXP)
    const levelChanged = newLevel !== currentLevel

    await updateDoc(userRef, {
      xp: newXP,
      totalXp: newTotalXP,
      level: newLevel,
      updatedAt: serverTimestamp(),
    })

    // Se o nível mudou, criar notificação
    if (levelChanged) {
      await addNotification(userId, {
        title: "Nível aumentado!",
        message: `Parabéns! Você alcançou o nível ${newLevel.toUpperCase()}!`,
        type: "level_up",
      })
    }

    return { newXP, newTotalXP, newLevel, levelChanged }
  } catch (error) {
    console.error("[v0] Error adding XP to user:", error)
    throw error
  }
}

export const calculateLevelFromXP = (totalXP: number): string => {
  if (totalXP >= 6000) return "diamante"
  if (totalXP >= 3000) return "platinum"
  if (totalXP >= 1500) return "gold"
  if (totalXP >= 500) return "prata"
  return "bronze"
}

export const canUserPerformAction = (userLevel: string, action: "like" | "comment" | "retweet"): boolean => {
  const levelHierarchy = ["bronze", "prata", "gold", "platinum", "diamante"]
  const userLevelIndex = levelHierarchy.indexOf(userLevel.toLowerCase())

  switch (action) {
    case "like":
      return userLevelIndex >= 0 // Bronze can like
    case "comment":
      return userLevelIndex >= 2 // Gold can comment
    case "retweet":
      return userLevelIndex >= 1 // Silver can retweet
    default:
      return false
  }
}

export const getXPForAction = (action: "like" | "comment" | "retweet"): number => {
  switch (action) {
    case "like":
      return 100
    case "comment":
      return 200
    case "retweet":
      return 150
    default:
      return 0
  }
}

export const addNotification = async (
  userId: string,
  notification: {
    title: string
    message: string
    type: "mission" | "level_up" | "xp_gained"
    actionUrl?: string
  },
) => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      ...notification,
      read: false, // Corrigindo inconsistência no campo de leitura das notificações
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error adding notification:", error)
  }
}

export const hasUserGainedXPForPost = async (userId: string, postId: string, action: string): Promise<boolean> => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    const q = query(
      xpTrackingRef,
      where("userId", "==", userId),
      where("postId", "==", postId),
      where("action", "==", action),
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error("[v0] Error checking XP tracking:", error)
    return false
  }
}

export const trackXPGained = async (userId: string, postId: string, action: string, xpAmount: number) => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    await addDoc(xpTrackingRef, {
      userId,
      postId,
      action,
      xpAmount,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error tracking XP:", error)
  }
}

export const removeXPTracking = async (userId: string, postId: string, action: string) => {
  try {
    const xpTrackingRef = collection(db, "xp_tracking")
    const q = query(
      xpTrackingRef,
      where("userId", "==", userId),
      where("postId", "==", postId),
      where("action", "==", action),
    )
    const querySnapshot = await getDocs(q)

    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref)
    }
  } catch (error) {
    console.error("[v0] Error removing XP tracking:", error)
  }
}

// Funções para gerenciamento de stories
export interface Story {
  id?: string
  name: string
  coverImage: string
  requiredLevel: "Bronze" | "Prata" | "Gold" | "Diamante" | "Platinum" // Adicionado Bronze, Prata, Platinum
  images: string[]
  createdAt: any
  updatedAt: any
}

// Função para obter stories da Isabelle
export const getIsabelleStories = async (): Promise<Story[]> => {
  try {
    const storiesRef = collection(db, "isabelle-stories")
    const q = query(storiesRef, orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    const stories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[]

    return stories
  } catch (error) {
    console.error("[v0] Error getting Isabelle stories:", error)
    return [
      {
        id: "default-1",
        name: "Ensaios",
        coverImage: "/glamorous-photoshoot-studio-lighting.png",
        requiredLevel: "Prata",
        images: ["/glamorous-photoshoot-studio-lighting.png"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "default-2",
        name: "Lifestyle",
        coverImage: "/sunset-beach-silhouette-peaceful.png",
        requiredLevel: "Gold",
        images: ["/sunset-beach-silhouette-peaceful.png"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "default-3",
        name: "Beauty",
        coverImage: "/skincare-routine-luxury-products.png",
        requiredLevel: "Premium",
        images: ["/skincare-routine-luxury-products.png"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "default-4",
        name: "Fitness",
        coverImage: "/fitness-workout-gym-woman.png",
        requiredLevel: "Diamante",
        images: ["/fitness-workout-gym-woman.png"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  }
}

// Função para criar um novo story
export const createStory = async (storyData: Omit<Story, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, "isabelle-stories"), {
      ...storyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Story created successfully:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating story:", error)
    throw error
  }
}

// Função para atualizar um story
export const updateStory = async (storyId: string, updates: Partial<Story>) => {
  try {
    await updateDoc(doc(db, "isabelle-stories", storyId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Story updated successfully:", storyId)
  } catch (error) {
    console.error("[v0] Error updating story:", error)
    throw error
  }
}

// Função para deletar um story
export const deleteStory = async (storyId: string) => {
  try {
    await deleteDoc(doc(db, "isabelle-stories", storyId))
    console.log("[v0] Story deleted successfully:", storyId)
  } catch (error) {
    console.error("[v0] Error deleting story:", error)
  }
}

// Função para obter um story específico
export const getStoryById = async (storyId: string): Promise<Story | null> => {
  try {
    const docRef = doc(db, "isabelle-stories", storyId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Story
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting story by ID:", error)
    return null
  }
}

// Função para limpar mensagens de um usuário
export const clearOldMessages = async (userId: string) => {
  try {
    console.log("[v0] Clearing old messages for user:", userId)

    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    console.log(`[v0] Cleared ${querySnapshot.docs.length} old messages for user:`, userId)
  } catch (error) {
    console.error("[v0] Error clearing old messages:", error)
    throw error
  }
}

// Função para criar uma mensagem de boas-vindas para um usuário
export const createWelcomeMessage = async (userId: string) => {
  try {
    await clearOldMessages(userId)

    let welcomeMessage =
      "Olá! 💕 Bem-vindo(a) ao DeLuxe Isa! Sou a Isabelle e estou muito feliz em te ter aqui comigo! ✨"
    let welcomeImage = ""

    try {
      const configRef = doc(db, "config", "autoWelcomeMessage")
      const configSnap = await getDoc(configRef)

      if (configSnap.exists()) {
        const configData = configSnap.data()
        if (configData.message) {
          welcomeMessage = configData.message
        }
        if (configData.image) {
          welcomeImage = configData.image
        }
      }
    } catch (configError) {
      console.log("[v0] Using default welcome message (config not found)")
    }

    const messageData = {
      userId,
      userName: "Usuário",
      userLevel: "Gold",
      message: welcomeMessage,
      timestamp: serverTimestamp(),
      isRead: false,
      adminReply: null,
      isWelcomeMessage: true,
      ...(welcomeImage && { image: welcomeImage }),
    }

    await addDoc(collection(db, "chatMessages"), messageData)
    console.log("[v0] Welcome message created for user:", userId)
  } catch (error) {
    console.error("[v0] Error creating welcome message:", error)
    throw error
  }
}

// Função para recriar mensagem de boas-vindas para usuários existentes
export const recreateWelcomeMessage = async (userId: string) => {
  try {
    console.log("[v0] Recreating welcome message for existing user:", userId)
    await createWelcomeMessage(userId)
  } catch (error) {
    console.error("[v0] Error recreating welcome message:", error)
  }
}

// Funções para templates de notificação
export const createNotificationTemplate = async (templateData: Omit<NotificationTemplate, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "notificationTemplates"), {
      ...templateData,
      createdAt: serverTimestamp(),
    })
    console.log("[v0] Notification template created:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating notification template:", error)
    throw error
  }
}

export const getNotificationTemplates = async (): Promise<NotificationTemplate[]> => {
  try {
    const q = query(collection(db, "notificationTemplates"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NotificationTemplate[]
  } catch (error) {
    console.error("[v0] Error getting notification templates:", error)
    return []
  }
}

export const deleteNotificationTemplate = async (templateId: string) => {
  try {
    await deleteDoc(doc(db, "notificationTemplates", templateId))
    console.log("[v0] Notification template deleted:", templateId)
  } catch (error) {
    console.error("[v0] Error deleting notification template:", error)
  }
}

export const sendBulkNotifications = async (template: NotificationTemplate) => {
  try {
    // Buscar usuários baseado no nível alvo
    const usersRef = collection(db, "users")
    let usersQuery = query(usersRef)

    if (template.targetLevel !== "all") {
      usersQuery = query(usersRef, where("level", "==", template.targetLevel))
    }

    const usersSnapshot = await getDocs(usersQuery)
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // Filtrar usuário da Isabelle
    const targetUsers = users.filter((user) => user.id !== "isabelle-lua-uid")

    // Criar notificações em lote
    const batch = writeBatch(db)
    const notificationsRef = collection(db, "notifications")

    targetUsers.forEach((user) => {
      const notificationRef = doc(notificationsRef)
      batch.set(notificationRef, {
        userId: user.id,
        title: template.title,
        message: template.message,
        type: template.type,
        read: false, // Corrigindo inconsistência no campo de leitura das notificações
        createdAt: serverTimestamp(),
        senderName: "DeLuxe",
        senderImage: "/deluxe-logo.png",
        fromUserId: "deluxe-platform-uid",
        fromUsername: "deluxe",
        fromDisplayName: "DeLuxe",
        fromProfileImage: "/deluxe-logo.png",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    })

    await batch.commit()

    console.log(`[v0] Bulk notifications sent to ${targetUsers.length} users`)
    return targetUsers.length
  } catch (error) {
    console.error("[v0] Error sending bulk notifications:", error)
    throw error
  }
}

export const createWelcomeNotification = async (userId: string) => {
  try {
    // Verificar se existe um template de boas-vindas ativo
    const templatesRef = collection(db, "notificationTemplates")
    const q = query(templatesRef, where("type", "==", "welcome"), where("isActive", "==", true), limit(1))
    const templateSnapshot = await getDocs(q)

    if (!templateSnapshot.empty) {
      const template = templateSnapshot.docs[0].data() as NotificationTemplate

      await createNotificationWithExpiry({
        userId,
        type: "welcome",
        title: template.title,
        message: template.message,
        fromUserId: "isabelle-lua-uid",
        fromUsername: "isabellelua",
        fromDisplayName: "Isabelle Lua",
        fromProfileImage: "/beautiful-woman-profile.png",
      })

      console.log("[v0] Welcome notification sent using template")
    } else {
      // Fallback para notificação padrão
      await createNotificationWithExpiry({
        userId,
        type: "welcome",
        title: "Bem-vindo à plataforma! 💕",
        message:
          "Olá! Seja muito bem-vindo à minha plataforma exclusiva. Aqui você terá acesso a conteúdos especiais e poderá interagir comigo de forma única!",
        fromUserId: "isabelle-lua-uid",
        fromUsername: "isabellelua",
        fromDisplayName: "Isabelle Lua",
        fromProfileImage: "/beautiful-woman-profile.png",
      })

      console.log("[v0] Default welcome notification sent")
    }
  } catch (error) {
    console.error("[v0] Error creating welcome notification:", error)
  }
}

export const forceDeleteIsabelleNotifications = async (): Promise<{
  success: boolean
  removedCount: number
  message: string
}> => {
  try {
    console.log("[v0] Iniciando busca forçada por notificações da DeLuxe...")

    // Buscar todas as notificações
    const notificationsRef = collection(db, "notifications")
    const allNotificationsSnapshot = await getDocs(notificationsRef)

    const deluxeNotifications: any[] = []

    allNotificationsSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const title = data.title?.toLowerCase() || ""
      const message = data.message?.toLowerCase() || ""
      const fromDisplayName = data.fromDisplayName?.toLowerCase() || ""

      if (
        title.includes("deluxe") ||
        message.includes("deluxe") ||
        fromDisplayName.includes("deluxe") ||
        data.fromUserId === "deluxe-platform-uid" ||
        data.fromUsername === "deluxe"
      ) {
        deluxeNotifications.push(doc)
      }
    })

    console.log(`[v0] Encontradas ${deluxeNotifications.length} notificações da DeLuxe`)

    // Remover todas as notificações encontradas
    const deletePromises = deluxeNotifications.map((doc) => deleteDoc(doc.ref))
    await Promise.all(deletePromises)

    return {
      success: true,
      removedCount: deluxeNotifications.length,
      message: `${deluxeNotifications.length} notificações da DeLuxe foram removidas com sucesso!`,
    }
  } catch (error) {
    console.error("[v0] Erro durante a limpeza das notificações:", error)
    return {
      success: false,
      removedCount: 0,
      message: "Erro ao remover notificações da DeLuxe",
    }
  }
}

// Funções otimizadas para verificar likes em batch
export const checkUserLikedBatch = async (userId: string, postIds: string[]): Promise<Set<string>> => {
  if (postIds.length === 0) return new Set()

  try {
    const likesRef = collection(db, "likes")
    const q = query(likesRef, where("userId", "==", userId), where("postId", "in", postIds.slice(0, 10))) // Firestore limit
    const querySnapshot = await getDocs(q)

    const likedSet = new Set<string>()
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      likedSet.add(data.postId)
    })

    return likedSet
  } catch (error) {
    console.error("[v0] Error checking liked posts in batch:", error)
    return new Set()
  }
}

// Funções otimizadas para verificar retweets em batch
export const checkUserRetweetedBatch = async (userId: string, postIds: string[]): Promise<Set<string>> => {
  if (postIds.length === 0) return new Set()

  try {
    const retweetsRef = collection(db, "retweets")
    const q = query(retweetsRef, where("userId", "==", userId), where("postId", "in", postIds.slice(0, 10))) // Firestore limit
    const querySnapshot = await getDocs(q)

    const retweetedSet = new Set<string>()
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      retweetedSet.add(data.postId)
    })

    return retweetedSet
  } catch (error) {
    console.error("[v0] Error checking retweeted posts in batch:", error)
    return new Set()
  }
}

// Funções adicionais para sistema de XP e verificação de níveis
export const checkContentAccess = (userLevel: string, requiredLevel: string): boolean => {
  // Hierarquia correta dos níveis
  const levelOrder = {
    bronze: 1,
    prata: 2,
    gold: 3, // Nível gratuito mais alto
    platinum: 4, // Nível pago
    diamante: 5, // Nível premium
  }

  const userLevelNormalized = userLevel.toLowerCase()
  const requiredLevelNormalized = requiredLevel.toLowerCase()

  // Se o conteúdo é "gold gratuito", qualquer nível prata ou superior pode acessar
  if (requiredLevelNormalized === "gold") {
    return levelOrder[userLevelNormalized as keyof typeof levelOrder] >= levelOrder.prata
  }

  return (
    levelOrder[userLevelNormalized as keyof typeof levelOrder] >=
    levelOrder[requiredLevelNormalized as keyof typeof levelOrder]
  )
}

// Funções adicionais
export const getCurrentUser = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// Função para limpar mensagens de boas-vindas antigas
export const clearOldWelcomeMessages = async () => {
  try {
    const messagesRef = collection(db, "chatMessages")
    const q = query(messagesRef, where("isWelcomeMessage", "==", true))
    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log("[v0] Old welcome messages cleared successfully")
  } catch (error) {
    console.error("[v0] Error clearing old welcome messages:", error)
    throw error
  }
}

// Função para remover notificações antigas
export const removeOldNotifications = async (daysOld = 7) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const q = query(collection(db, "notifications"), where("createdAt", "<", cutoffDate))

    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`[v0] Removed ${querySnapshot.size} old notifications`)
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error removing old notifications:", error)
    throw error
  }
}

// Função para remover todas as notificações
export const removeAllNotifications = async () => {
  try {
    const q = query(collection(db, "notifications"))
    const querySnapshot = await getDocs(q)
    const batch = writeBatch(db)

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`[v0] Removed all ${querySnapshot.size} notifications`)
    return querySnapshot.size
  } catch (error) {
    console.error("[v0] Error removing all notifications:", error)
    throw error
  }
}

export const sendAutomaticMessage = async (messageData: AutomaticMessage) => {
  try {
    console.log("[v0] Sending automatic message:", messageData)

    // Buscar usuários baseado no nível alvo
    let targetUsers: any[] = []

    if (messageData.targetLevel === "all") {
      const usersSnapshot = await getDocs(collection(db, "users"))
      targetUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } else {
      const usersQuery = query(collection(db, "users"), where("level", "==", messageData.targetLevel))
      const usersSnapshot = await getDocs(usersQuery)
      targetUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    }

    targetUsers = targetUsers.filter((user) => user.id !== "isabelle-lua-uid")

    console.log(`[v0] Found ${targetUsers.length} target users`)

    // Enviar mensagem para cada usuário
    const batch = writeBatch(db)
    const messagesRef = collection(db, "chatMessages")

    targetUsers.forEach((user) => {
      const messageRef = doc(messagesRef)
      batch.set(messageRef, {
        userId: user.id,
        userName: user.displayName || user.username || "Usuário",
        userLevel: user.level || "Bronze",
        message: messageData.content,
        timestamp: serverTimestamp(),
        messageType: messageData.type,
        isFromIsabelle: true,
        senderName: "Isabelle Lua",
        senderImage: messageData.image || "/beautiful-woman-profile.png",
        read: false,
        adminReply: null,
      })
    })

    await batch.commit()
    console.log(`[v0] Automatic message sent successfully to ${targetUsers.length} users`)
    return targetUsers.length
  } catch (error) {
    console.error("[v0] Error sending automatic message:", error)
    throw error
  }
}

export const clearAllOldMessages = async () => {
  try {
    const messagesQuery = query(collection(db, "chatMessages"))
    const messagesSnapshot = await getDocs(messagesQuery)

    const batch = writeBatch(db)
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log("[v0] All old messages cleared successfully")
  } catch (error) {
    console.error("[v0] Error clearing old messages:", error)
    throw error
  }
}

export interface CreatorHighlight {
  id?: string
  creatorId: string
  creatorUsername: string
  name: string
  coverImage: string
  requiredLevel: "Gold" | "Premium" | "Diamante" | "Bronze" | "Prata" | "Platinum" // Adicionado Bronze, Prata, Platinum
  images: string[]
  isTemporary?: boolean
  expiresAt?: any
  createdAt: any
  updatedAt: any
}

export interface CreatorService {
  id?: string
  creatorId: string
  creatorUsername: string
  name: string
  description: string
  price: string
  originalPrice?: string
  coverImage: string
  tags: string[]
  isPopular: boolean
  createdAt: any
  updatedAt: any
}

// Função para criar um novo destaque
export const createCreatorHighlight = async (
  highlightData: Omit<CreatorHighlight, "id" | "createdAt" | "updatedAt">,
) => {
  try {
    const docRef = await addDoc(collection(db, "creator-highlights"), {
      ...highlightData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Creator highlight created successfully:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating creator highlight:", error)
    throw error
  }
}

// Função para obter destaques de uma criadora específica
export const getCreatorHighlights = async (creatorId: string): Promise<CreatorHighlight[]> => {
  try {
    const highlightsRef = collection(db, "creator-highlights")
    const q = query(highlightsRef, where("creatorId", "==", creatorId))
    const querySnapshot = await getDocs(q)

    const highlights = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorHighlight[]

    const now = new Date()
    const activeHighlights = highlights.filter((highlight) => {
      if (highlight.isTemporary && highlight.expiresAt) {
        const expiresAt = highlight.expiresAt.toDate ? highlight.expiresAt.toDate() : new Date(highlight.expiresAt)
        return expiresAt > now
      }
      return true
    })

    return activeHighlights.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime // Ordem decrescente (mais recente primeiro)
    })
  } catch (error) {
    console.error("[v0] Error getting creator highlights:", error)
    return []
  }
}

// Função para atualizar um destaque
export const updateCreatorHighlight = async (highlightId: string, updates: Partial<CreatorHighlight>) => {
  try {
    await updateDoc(doc(db, "creator-highlights", highlightId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Creator highlight updated successfully:", highlightId)
  } catch (error) {
    console.error("[v0] Error updating creator highlight:", error)
    throw error
  }
}

// Função para deletar um destaque
export const deleteCreatorHighlight = async (highlightId: string) => {
  try {
    await deleteDoc(doc(db, "creator-highlights", highlightId))
    console.log("[v0] Creator highlight deleted successfully:", highlightId)
  } catch (error) {
    console.error("[v0] Error deleting creator highlight:", error)
    throw error
  }
}

// Função para obter um destaque específico
export const getCreatorHighlightById = async (highlightId: string): Promise<CreatorHighlight | null> => {
  try {
    const docRef = doc(db, "creator-highlights", highlightId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CreatorHighlight
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting creator highlight by ID:", error)
    return null
  }
}

// Função para verificar se uma criadora pode editar um destaque
export const canCreatorEditHighlight = async (creatorId: string, highlightId: string): Promise<boolean> => {
  try {
    const highlight = await getCreatorHighlightById(highlightId)
    return highlight?.creatorId === creatorId
  } catch (error) {
    console.error("[v0] Error checking creator highlight permissions:", error)
    return false
  }
}

export const createCreatorService = async (serviceData: Omit<CreatorService, "id" | "createdAt" | "updatedAt">) => {
  try {
    const docRef = await addDoc(collection(db, "creator-services"), {
      ...serviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Creator service created successfully:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating creator service:", error)
    throw error
  }
}

export const getCreatorServices = async (creatorId: string): Promise<CreatorService[]> => {
  try {
    const servicesRef = collection(db, "creator-services")
    const q = query(servicesRef, where("creatorId", "==", creatorId))
    const querySnapshot = await getDocs(q)

    const services = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorService[]

    return services.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
  } catch (error) {
    console.error("[v0] Error getting creator services:", error)
    return []
  }
}

export const updateCreatorService = async (serviceId: string, updates: Partial<CreatorService>) => {
  try {
    await updateDoc(doc(db, "creator-services", serviceId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] Creator service updated successfully:", serviceId)
  } catch (error) {
    console.error("[v0] Error updating creator service:", error)
    throw error
  }
}

export const deleteCreatorService = async (serviceId: string) => {
  try {
    await deleteDoc(doc(db, "creator-services", serviceId))
    console.log("[v0] Creator service deleted successfully:", serviceId)
  } catch (error) {
    console.error("[v0] Error deleting creator service:", error)
    throw error
  }
}

// MLM network functions for financial office
import type { ReferralCode, CreatorNetwork, Transaction, CreatorFinancials } from "./types"

// Generate unique referral code
export const generateReferralCode = async (creatorUsername: string): Promise<string> => {
  const baseCode = creatorUsername
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8)
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${baseCode}${randomSuffix}`
}

// Create referral code for creator
export const createReferralCode = async (creatorId: string, creatorUsername: string): Promise<string> => {
  try {
    const code = await generateReferralCode(creatorUsername)

    await setDoc(doc(db, "referral_codes", code), {
      code,
      creatorId,
      creatorUsername,
      createdAt: serverTimestamp(),
      isActive: true,
    })

    return code
  } catch (error) {
    console.error("[v0] Error creating referral code:", error)
    throw error
  }
}

// Get referral code for creator
export const getCreatorReferralCode = async (creatorId: string): Promise<string | null> => {
  try {
    const codesRef = collection(db, "referral_codes")
    const q = query(codesRef, where("creatorId", "==", creatorId), where("isActive", "==", true))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().code
    }

    return null
  } catch (error) {
    console.error("[v0] Error getting referral code:", error)
    return null
  }
}

// Validate and get referral code info
export const validateReferralCode = async (code: string): Promise<ReferralCode | null> => {
  try {
    const codeDoc = await getDoc(doc(db, "referral_codes", code))

    if (codeDoc.exists() && codeDoc.data().isActive) {
      return { id: codeDoc.id, ...codeDoc.data() } as ReferralCode
    }

    return null
  } catch (error) {
    console.error("[v0] Error validating referral code:", error)
    return null
  }
}

// Add creator to network
export const addCreatorToNetwork = async (
  creatorId: string,
  creatorUsername: string,
  referralCode: string,
  referredByUsername: string,
): Promise<void> => {
  try {
    // Get the referrer's network info to determine level
    const referrerNetworkRef = collection(db, "creator_network")
    const referrerQuery = query(referrerNetworkRef, where("creatorUsername", "==", referredByUsername))
    const referrerSnapshot = await getDocs(referrerQuery)

    let level = 1 // Direct referral by default

    if (!referrerSnapshot.empty) {
      const referrerData = referrerSnapshot.docs[0].data()
      level = (referrerData.level || 0) + 1
    }

    await addDoc(collection(db, "creator_network"), {
      creatorId,
      creatorUsername,
      referredBy: referredByUsername,
      referralCode,
      level,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalEarnings: 0,
      monthlyEarnings: 0,
      subscriberCount: 0,
    })
  } catch (error) {
    console.error("[v0] Error adding creator to network:", error)
    throw error
  }
}

// Get creator's network (all creators they referred)
export const getCreatorNetwork = async (creatorUsername: string): Promise<CreatorNetwork[]> => {
  try {
    const networkRef = collection(db, "creator_network")
    const q = query(networkRef, where("referredBy", "==", creatorUsername))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreatorNetwork[]
  } catch (error) {
    console.error("[v0] Error getting creator network:", error)
    return []
  }
}

// Get creator's full network tree (recursive)
export const getCreatorNetworkTree = async (creatorUsername: string, maxDepth = 3): Promise<any[]> => {
  try {
    const getNetworkLevel = async (username: string, currentDepth: number): Promise<any[]> => {
      if (currentDepth > maxDepth) return []

      const networkRef = collection(db, "creator_network")
      const q = query(networkRef, where("referredBy", "==", username))
      const querySnapshot = await getDocs(q)

      const creators = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data()
          const children = await getNetworkLevel(data.creatorUsername, currentDepth + 1)

          return {
            id: doc.id,
            ...data,
            children,
            depth: currentDepth,
          }
        }),
      )

      return creators
    }

    return await getNetworkLevel(creatorUsername, 1)
  } catch (error) {
    console.error("[v0] Error getting network tree:", error)
    return []
  }
}

// Create transaction
export const createTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">): Promise<void> => {
  try {
    await addDoc(collection(db, "transactions"), {
      ...transactionData,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error creating transaction:", error)
    throw error
  }
}

// Get creator transactions
export const getCreatorTransactions = async (creatorId: string, limitCount = 50): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, "transactions")
    const q = query(transactionsRef, where("creatorId", "==", creatorId), limit(limitCount))
    const querySnapshot = await getDocs(q)

    const transactions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]

    // Sort in memory to avoid composite index requirement
    return transactions.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  } catch (error) {
    console.error("[v0] Error getting transactions:", error)
    return []
  }
}

// Get or create creator financials
export const getCreatorFinancials = async (creatorId: string): Promise<CreatorFinancials> => {
  try {
    const financialsDoc = await getDoc(doc(db, "creator_financials", creatorId))

    if (financialsDoc.exists()) {
      return financialsDoc.data() as CreatorFinancials
    }

    // Create default financials
    const defaultFinancials: CreatorFinancials = {
      creatorId,
      availableBalance: 0,
      totalEarnings: 0,
      monthlyRevenue: 0,
      directEarnings: 0,
      networkEarnings: 0,
      totalWithdrawals: 0,
      lastUpdated: serverTimestamp(),
    }

    await setDoc(doc(db, "creator_financials", creatorId), defaultFinancials)

    return defaultFinancials
  } catch (error) {
    console.error("[v0] Error getting creator financials:", error)
    throw error
  }
}

// Update creator financials
export const updateCreatorFinancials = async (
  creatorId: string,
  updates: Partial<CreatorFinancials>,
): Promise<void> => {
  try {
    await updateDoc(doc(db, "creator_financials", creatorId), {
      ...updates,
      lastUpdated: serverTimestamp(),
    })
  } catch (error) {
    console.error("[v0] Error updating creator financials:", error)
    throw error
  }
}

// Process MLM commissions when a creator earns money
export const processMLMCommissions = async (
  creatorId: string,
  grossAmount: number,
  fromUserId: string,
): Promise<number> => {
  try {
    // Get the creator's network info to find their upline
    const networkRef = collection(db, "creator_network")
    const creatorQuery = query(networkRef, where("creatorId", "==", creatorId))
    const creatorSnapshot = await getDocs(creatorQuery)

    if (creatorSnapshot.empty) {
      console.log("[v0] Creator not in network, no commissions to process")
      return 0
    }

    const creatorData = creatorSnapshot.docs[0].data()
    const creatorUsername = creatorData.creatorUsername
    let currentReferrer = creatorData.referredBy

    // Commission structure: Level 1: 10%, Level 2: 5%, Level 3: 3%, Level 4: 2%
    const commissionRates = [0.1, 0.05, 0.03, 0.02]
    const levelNames = ["Nível 1", "Nível 2", "Nível 3", "Nível 4"]
    let totalCommissionsPaid = 0

    // Process up to 4 levels of commissions
    for (let level = 0; level < 4 && currentReferrer; level++) {
      // Find the referrer's user ID
      const referrerQuery = query(networkRef, where("creatorUsername", "==", currentReferrer))
      const referrerSnapshot = await getDocs(referrerQuery)

      if (referrerSnapshot.empty) {
        console.log(`[v0] Referrer ${currentReferrer} not found, stopping commission chain`)
        break
      }

      const referrerData = referrerSnapshot.docs[0].data()
      const referrerId = referrerData.creatorId

      const commissionAmount = Math.floor(grossAmount * commissionRates[level] * 100) / 100
      totalCommissionsPaid += commissionAmount

      // Create commission transaction
      await createTransaction({
        creatorId: referrerId,
        type: `commission_level_${level + 1}`,
        amount: commissionAmount,
        description: `Comissão ${levelNames[level]} de @${creatorUsername}`,
        status: "completed",
        fromUserId,
        metadata: {
          sourceCreatorId: creatorId,
          sourceCreatorUsername: creatorUsername,
          commissionLevel: level + 1,
          commissionRate: commissionRates[level],
          grossAmount,
        },
      })

      // Update referrer's financials
      const referrerFinancials = await getCreatorFinancials(referrerId)
      await updateCreatorFinancials(referrerId, {
        availableBalance: (referrerFinancials.availableBalance || 0) + commissionAmount,
        networkEarnings: (referrerFinancials.networkEarnings || 0) + commissionAmount,
        totalEarnings: (referrerFinancials.totalEarnings || 0) + commissionAmount,
      })

      console.log(
        `[v0] Processed ${levelNames[level]} commission: R$ ${commissionAmount.toFixed(2)} to ${currentReferrer}`,
      )

      // Move up to the next level
      currentReferrer = referrerData.referredBy
    }

    return totalCommissionsPaid
  } catch (error) {
    console.error("[v0] Error processing MLM commissions:", error)
    throw error
  }
}

export const addCreatorToNetworkWithCode = async (
  creatorId: string,
  creatorUsername: string,
  referralCode: string,
): Promise<void> => {
  try {
    console.log("[v0] Adding creator to network with code:", referralCode)

    // Validate referral code
    const codeData = await validateReferralCode(referralCode)

    if (!codeData) {
      throw new Error("Código de indicação inválido ou inativo")
    }

    // Get referrer's username
    const referrerUsername = codeData.creatorUsername

    // Get the referrer's network info to determine level
    const referrerNetworkRef = collection(db, "creator_network")
    const referrerQuery = query(referrerNetworkRef, where("creatorUsername", "==", referrerUsername))
    const referrerSnapshot = await getDocs(referrerQuery)

    let level = 1 // Direct referral by default

    if (!referrerSnapshot.empty) {
      const referrerData = referrerSnapshot.docs[0].data()
      level = (referrerData.level || 0) + 1
    }

    // Add to network
    await addDoc(collection(db, "creator_network"), {
      creatorId,
      creatorUsername,
      referredBy: referrerUsername,
      referralCode,
      level,
      joinedAt: serverTimestamp(),
      isActive: true,
      totalEarnings: 0,
      monthlyEarnings: 0,
      subscriberCount: 0,
    })

    console.log("[v0] Creator successfully added to network at level:", level)
  } catch (error) {
    console.error("[v0] Error adding creator to network:", error)
    throw error
  }
}

export const updateUserSubscription = async (
  userId: string,
  subscriptionData: {
    tier: "prata" | "gold" | "platinum" | "diamante"
    stripeSubscriptionId: string
    stripeCustomerId: string
    status: "active" | "canceled" | "past_due"
    currentPeriodEnd: Date
  },
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      subscription: subscriptionData,
      updatedAt: serverTimestamp(),
    })
    console.log("[v0] User subscription updated successfully")
  } catch (error) {
    console.error("[v0] Error updating user subscription:", error)
    throw error
  }
}
