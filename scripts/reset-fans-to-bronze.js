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

// Inicializa Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log("[v0] 🚀 Iniciando reset de TODOS OS FANS para nível Bronze...")
console.log("[v0] ⚠️  ATENÇÃO: Criadoras NÃO serão afetadas (apenas fans)")

try {
  // Busca todos os usuários
  const usersRef = collection(db, "users")
  const snapshot = await getDocs(usersRef)

  console.log(`[v0] 📊 Total de usuários encontrados: ${snapshot.size}`)

  let fansResetados = 0
  let criadoras = 0
  let erros = 0

  // Processa cada usuário
  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data()
    const username = userData.username || userDoc.id
    const userType = userData.userType || "fan"

    // Verifica se é uma criadora
    if (userType === "creator") {
      console.log(`[v0] 👑 Pulando criadora: ${username}`)
      criadoras++
      continue
    }

    // É um fan - reseta para Bronze
    try {
      await updateDoc(doc(db, "users", userDoc.id), {
        level: "bronze",
        xp: 0,
        totalXp: 0,
      })

      console.log(`[v0] ✅ Fan resetado: ${username} → Bronze (XP: 0)`)
      fansResetados++
    } catch (error) {
      console.error(`[v0] ❌ Erro ao resetar ${username}:`, error.message)
      erros++
    }
  }

  console.log("\n[v0] 🎉 RESET CONCLUÍDO!")
  console.log(`[v0] ✅ Fans resetados para Bronze: ${fansResetados}`)
  console.log(`[v0] 👑 Criadoras ignoradas: ${criadoras}`)
  console.log(`[v0] ❌ Erros: ${erros}`)
} catch (error) {
  console.error("[v0] ❌ ERRO FATAL:", error)
  throw error
}
