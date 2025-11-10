// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6h-oOG7xteSiJt2jDpSyGitiPp0aDimI",
  authDomain: "wacelmarkt.firebaseapp.com",
  projectId: "wacelmarkt",
  storageBucket: "wacelmarkt.firebasestorage.app",
  messagingSenderId: "662446208797",
  appId: "1:662446208797:web:a3cc83551d42761e4753f4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, storage, ref, uploadBytes, getDownloadURL };
