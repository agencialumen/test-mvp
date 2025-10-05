"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/firebase/config"
import { createPost as createPostFirestore, getUserProfile } from "@/lib/firebase/firestore"
import { createPostSchema, type CreatePostInput } from "@/lib/validations"

export async function createPostAction(input: CreatePostInput) {
  try {
    // Validate input
    const validatedData = createPostSchema.parse(input)

    // Get current user from Firebase Auth
    const currentUser = auth.currentUser
    if (!currentUser) {
      return {
        success: false,
        error: "Você precisa estar logado para criar um post",
      }
    }

    // Get user profile
    const userProfile = await getUserProfile(currentUser.uid)
    if (!userProfile) {
      return {
        success: false,
        error: "Perfil de usuário não encontrado",
      }
    }

    // Check if user is a creator
    if (userProfile.userType !== "creator") {
      return {
        success: false,
        error: "Apenas criadoras podem criar posts",
      }
    }

    // Create post
    const postId = await createPostFirestore({
      authorId: currentUser.uid,
      authorName: userProfile.displayName,
      authorUsername: userProfile.username,
      authorImage: userProfile.profileImage || "",
      authorUserType: userProfile.userType,
      content: validatedData.content,
      mediaUrls: validatedData.mediaUrls || [],
      mediaTypes: validatedData.mediaTypes || [],
      visibility: validatedData.visibility,
      tags: validatedData.tags || [],
    })

    // Revalidate relevant paths
    revalidatePath("/feed")
    revalidatePath(`/creator/${userProfile.username}`)

    return {
      success: true,
      postId,
    }
  } catch (error) {
    console.error("[Server Action] Error creating post:", error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: "Erro ao criar post. Tente novamente.",
    }
  }
}
