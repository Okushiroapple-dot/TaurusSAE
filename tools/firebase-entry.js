// Firebase: só o necessário para gravar os formulários no Firestore (versão "lite", sem tempo real)
export { initializeApp, getApps } from "firebase/app";
export { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore/lite";
