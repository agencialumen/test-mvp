import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "./config"
import {
  ensureUserDocument,
  getUserByUsername,
  createWelcomeMessage,
  createWelcomeNotification,
  createCreatorProfile,
  isUserCreator,
  addCreatorToNetworkWithCode, // Import the new function
} from "./firestore"
import { getRandomAvatar } from "@/lib/avatars"

export interface UserProfile {
  uid: string
  username: string
  email: string
  displayName: string
  bio: string
  profileImage: string
  createdAt: Date
}

export const useAuth = () => {
  const [user, loading, error] = useAuthState(auth)
  return { user, loading, error }
}

// Create user with username (using email format for Firebase)
export const createUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      console.error("[v0] Firebase auth not initialized")
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return { user: null, error: "Nome de usuário já está em uso" }
    }

    console.log("[v0] Creating user with username:", username)
    const email = `${username}@deluxeisa.app`
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log("[v0] User created successfully:", userCredential.user.uid)

    await updateProfile(userCredential.user, {
      displayName: username,
    })

    const userProfile = {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(), // Mudando de avatar para profileImage
      email,
      createdAt: new Date(),
    }

    await ensureUserDocument(userCredential.user.uid, userProfile)
    console.log("[v0] User document created in Firestore")

    await createWelcomeNotification(userCredential.user.uid)
    console.log("[v0] Welcome notification created for new user")

    await createWelcomeMessage(userCredential.user.uid)
    console.log("[v0] Welcome message created for new user")

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error creating user:", error)
    if (error.code === "auth/email-already-in-use") {
      return { user: null, error: "Nome de usuário já está em uso" }
    }
    if (error.code === "auth/weak-password") {
      return { user: null, error: "Senha muito fraca. Use pelo menos 6 caracteres" }
    }
    if (error.code === "auth/invalid-email") {
      return { user: null, error: "Nome de usuário inválido" }
    }
    return { user: null, error: "Erro ao criar conta. Tente novamente." }
  }
}

export const createCreator = async (
  username: string,
  password: string,
  displayName: string,
  bio: string,
  referralCode?: string, // Added referral code parameter
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      console.error("[v0] Firebase auth not initialized")
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return { user: null, error: "Nome de usuário já está em uso" }
    }

    console.log("[v0] Creating creator with username:", username)
    const email = `${username}@deluxeisa.app`
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log("[v0] Creator created successfully:", userCredential.user.uid)

    await updateProfile(userCredential.user, {
      displayName: displayName,
    })

    const creatorProfile = {
      uid: userCredential.user.uid,
      username,
      displayName,
      bio,
      profileImage: getRandomAvatar(),
      email,
      userType: "creator" as const,
      isVerified: false,
      followerCount: 0,
      contentCount: 0,
    }

    console.log("[v0] Creating creator profile with complete data")
    await createCreatorProfile(creatorProfile)
    console.log("[v0] Creator profile created in Firestore")

    if (referralCode) {
      await addCreatorToNetworkWithCode(userCredential.user.uid, username, referralCode)
      console.log("[v0] Creator added to MLM network with referral code:", referralCode)
    }

    await createWelcomeNotification(userCredential.user.uid)
    console.log("[v0] Welcome notification created for new creator")

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error creating creator:", error)
    if (error.code === "auth/email-already-in-use") {
      return { user: null, error: "Nome de usuário já está em uso" }
    }
    if (error.code === "auth/weak-password") {
      return { user: null, error: "Senha muito fraca. Use pelo menos 6 caracteres" }
    }
    if (error.code === "auth/invalid-email") {
      return { user: null, error: "Nome de usuário inválido" }
    }
    return { user: null, error: "Erro ao criar conta de criadora. Tente novamente." }
  }
}

// Sign in user
export const signInUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      console.error("[v0] Firebase auth not initialized")
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    console.log("[v0] Signing in user with username:", username)
    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("[v0] User signed in successfully:", userCredential.user.uid)

    if (!userCredential.user.displayName) {
      await updateProfile(userCredential.user, {
        displayName: username,
      })
    }

    await ensureUserDocument(userCredential.user.uid, {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(),
      email,
      createdAt: new Date(),
    })

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error signing in:", error)
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

// Sign in normal user
export const signInNormalUser = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      console.error("[v0] Firebase auth not initialized")
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    console.log("[v0] Signing in normal user with username:", username)
    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("[v0] User signed in successfully:", userCredential.user.uid)

    // Verificar se é criadora - se for, bloquear login
    const isCreator = await isUserCreator(userCredential.user.uid)

    if (isCreator) {
      await signOut(auth) // Deslogar imediatamente
      return { user: null, error: "Esta é uma conta de criadora. Use o login de criadora." }
    }

    if (!userCredential.user.displayName) {
      await updateProfile(userCredential.user, {
        displayName: username,
      })
    }

    await ensureUserDocument(userCredential.user.uid, {
      username,
      displayName: username,
      bio: "",
      profileImage: getRandomAvatar(),
      email,
      createdAt: new Date(),
    })

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error signing in normal user:", error)
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

// Sign in creator
export const signInCreator = async (
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  try {
    if (!auth) {
      console.error("[v0] Firebase auth not initialized")
      return { user: null, error: "Serviço de autenticação não disponível" }
    }

    console.log("[v0] Signing in creator with username:", username)
    const email = `${username}@deluxeisa.app`
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("[v0] Creator signed in successfully:", userCredential.user.uid)

    // Verificar se é criadora - se não for, bloquear login
    const isCreator = await isUserCreator(userCredential.user.uid)

    if (!isCreator) {
      await signOut(auth) // Deslogar imediatamente
      return { user: null, error: "Esta conta não é de criadora. Use o login normal ou cadastre-se como criadora." }
    }

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("[v0] Error signing in creator:", error)
    return { user: null, error: "Usuário ou senha incorretos" }
  }
}

// Sign out user
export const signOutUser = async (): Promise<{ error: string | null }> => {
  try {
    await signOut(auth)
    return { error: null }
  } catch (error: any) {
    console.error("Error signing out:", error)
    return { error: "Erro ao sair da conta" }
  }
}
