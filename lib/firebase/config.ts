import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA-IvyjoC5wSYUTTzpMolBq08WifRaPEPI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "deluxe-mvp.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "deluxe-mvp",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "deluxe-mvp.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "792409762197",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:792409762197:web:7db8304e4065176e39ae9c",
  databaseURL: "https://deluxe-mvp-default-rtdb.firebaseio.com",
  measurementId: "G-KHLGDDG6V6",
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.warn("[v0] Firebase initialization deferred:", error)
}

export const getFirebaseAuth = () => auth
export const getFirebaseDb = () => db
export const getFirebaseStorage = () => storage
export const getFirebaseApp = () => app

export { app, auth, db, storage }
export default app
