// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2xRmLMZOFQ6VZS8bzEpreZcV1F0qLYOM",
  authDomain: "synthia-11c9c.firebaseapp.com",
  projectId: "synthia-11c9c",
  storageBucket: "synthia-11c9c.firebasestorage.app",
  messagingSenderId: "1035613486069",
  appId: "1:1035613486069:web:4c1beb084634ae5d64febc",
  measurementId: "G-H5WWE8KPJ8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
