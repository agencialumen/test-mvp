import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA-IvyjoC5wSYUTTzpMolBq08WifRaPEPI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "deluxe-mvp.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "deluxe-mvp",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "deluxe-mvp.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "792409762197",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:792409762197:web:7db8304e4065176e39ae9c",
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)

async function resetAllUsersToBronze() {
  try {
    console.log("🔄 Iniciando reset de todos os usuários para nível Bronze...")

    // Buscar todos os usuários
    const usersRef = collection(db, "users")
    const usersSnapshot = await getDocs(usersRef)

    console.log(`📊 Total de usuários encontrados: ${usersSnapshot.size}`)

    let updatedCount = 0
    let skippedCount = 0

    // Atualizar cada usuário
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id

      // Pular criadoras (userType === "creator")
      if (userData.userType === "creator") {
        console.log(`⏭️  Pulando criadora: ${userData.username || userId}`)
        skippedCount++
        continue
      }

      try {
        await updateDoc(doc(db, "users", userId), {
          level: "bronze",
          xp: 0,
          totalXp: 0,
          subscriptionExpiry: null,
        })

        console.log(`✅ Usuário atualizado: ${userData.username || userId} (${userData.level || "sem nível"} → bronze)`)
        updatedCount++
      } catch (error) {
        console.error(`❌ Erro ao atualizar usuário ${userId}:`, error)
      }
    }

    console.log("\n" + "=".repeat(50))
    console.log("✨ Reset concluído!")
    console.log(`📈 Usuários atualizados: ${updatedCount}`)
    console.log(`⏭️  Criadoras puladas: ${skippedCount}`)
    console.log(`📊 Total processado: ${usersSnapshot.size}`)
    console.log("=".repeat(50))
  } catch (error) {
    console.error("❌ Erro ao resetar usuários:", error)
    throw error
  }
}

// Executar o script
resetAllUsersToBronze()
  .then(() => {
    console.log("\n🎉 Script executado com sucesso!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n💥 Erro fatal:", error)
    process.exit(1)
  })
