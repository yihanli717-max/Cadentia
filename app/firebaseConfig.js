// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKipHiEnrsKjI9aJwuur9a0rKesieA0to",
  authDomain: "vivid-a6bd0.firebaseapp.com",
  projectId: "vivid-a6bd0",
  storageBucket: "vivid-a6bd0.firebasestorage.app",
  messagingSenderId: "862164328335",
  appId: "1:862164328335:web:36c2cfabe97270d29375fa",
  measurementId: "G-6YWLGF4GCH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
