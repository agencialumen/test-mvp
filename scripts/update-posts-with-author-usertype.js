// Script para atualizar posts existentes com o campo authorUserType
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyA-IvyjoC5wSYUTTzpMolBq08WifRaPEPI",
  authDomain: "deluxe-mvp.firebaseapp.com",
  projectId: "deluxe-mvp",
  storageBucket: "deluxe-mvp.firebasestorage.app",
  messagingSenderId: "792409762197",
  appId: "1:792409762197:web:7db8304e4065176e39ae9c",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function updatePostsWithAuthorUserType() {
  try {
    console.log("[v0] Iniciando atualização dos posts...")

    // Buscar todos os posts
    const postsRef = collection(db, "posts")
    const postsSnapshot = await getDocs(postsRef)

    console.log(`[v0] Encontrados ${postsSnapshot.size} posts para verificar`)

    // Buscar todos os usuários para mapear userType
    const usersRef = collection(db, "users")
    const usersSnapshot = await getDocs(usersRef)

    const userTypeMap = new Map()
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data()
      if (userData.username) {
        userTypeMap.set(userData.username, userData.userType || "user")
      }
    })

    console.log(`[v0] Mapeados ${userTypeMap.size} usuários`)

    let updatedCount = 0

    // Atualizar posts que não têm authorUserType
    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data()

      // Se o post já tem authorUserType, pular
      if (postData.authorUserType) {
        continue
      }

      // Determinar o userType baseado no username do autor
      let authorUserType = "user" // padrão

      if (postData.authorUsername) {
        const mappedUserType = userTypeMap.get(postData.authorUsername)
        if (mappedUserType) {
          authorUserType = mappedUserType
        }

        // Casos especiais conhecidos
        if (postData.authorUsername === "isabellelua") {
          authorUserType = "creator"
        }
        if (postData.authorUsername === "Loira") {
          authorUserType = "creator"
        }
      }

      // Atualizar o post
      await updateDoc(doc(db, "posts", postDoc.id), {
        authorUserType: authorUserType,
      })

      updatedCount++
      console.log(`[v0] Post ${postDoc.id} atualizado: ${postData.authorUsername} -> ${authorUserType}`)
    }

    console.log(`[v0] Atualização concluída! ${updatedCount} posts foram atualizados.`)
  } catch (error) {
    console.error("[v0] Erro durante a atualização:", error)
  }
}

// Executar o script
updatePostsWithAuthorUserType()
