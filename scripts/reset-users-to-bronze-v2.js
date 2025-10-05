import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore"

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA-IvyjoC5wSYUTTzpMolBq08WifRaPEPI",
  authDomain: "deluxe-mvp.firebaseapp.com",
  projectId: "deluxe-mvp",
  storageBucket: "deluxe-mvp.firebasestorage.app",
  messagingSenderId: "792409762197",
  appId: "1:792409762197:web:7db8304e4065176e39ae9c",
}

console.log("[v0] Iniciando script de reset para Bronze...")

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log("[v0] Firebase inicializado com sucesso")

async function resetAllUsersToBronze() {
  try {
    console.log("[v0] Buscando todos os usuários...")

    // Buscar todos os usuários
    const usersRef = collection(db, "users")
    const snapshot = await getDocs(usersRef)

    console.log(`[v0] Total de usuários encontrados: ${snapshot.size}`)

    let updatedCount = 0
    let errorCount = 0

    // Atualizar cada usuário
    for (const userDoc of snapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id

        console.log(`[v0] Processando usuário: ${userData.username || userId}`)
        console.log(`[v0] - Nível atual: ${userData.level || "não definido"}`)
        console.log(`[v0] - XP atual: ${userData.xp || 0}`)
        console.log(`[v0] - TotalXP atual: ${userData.totalXp || 0}`)

        // Atualizar para Bronze
        await updateDoc(doc(db, "users", userId), {
          level: "bronze",
          xp: 0,
          totalXp: 0,
        })

        updatedCount++
        console.log(`[v0] ✓ Usuário ${userData.username || userId} resetado para Bronze`)
      } catch (error) {
        errorCount++
        console.error(`[v0] ✗ Erro ao atualizar usuário ${userDoc.id}:`, error.message)
      }
    }

    console.log("\n[v0] ========================================")
    console.log(`[v0] RESUMO DO RESET:`)
    console.log(`[v0] Total de usuários: ${snapshot.size}`)
    console.log(`[v0] Atualizados com sucesso: ${updatedCount}`)
    console.log(`[v0] Erros: ${errorCount}`)
    console.log("[v0] ========================================")
    console.log("[v0] ✓ Reset concluído!")
  } catch (error) {
    console.error("[v0] ✗ Erro fatal ao resetar usuários:", error)
    throw error
  }
}

// Executar o reset
resetAllUsersToBronze()
