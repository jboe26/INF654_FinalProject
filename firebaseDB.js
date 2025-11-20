// Modular Firebase SDK setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDC6JoO8EBCGEwJqpFBIsnXKhhxikcopUQ",
  authDomain: "taskmanagerpwa-2cb19.firebaseapp.com",
  projectId: "taskmanagerpwa-2cb19",
  storageBucket: "taskmanagerpwa-2cb19.appspot.com",
  messagingSenderId: "87980517677",
  appId: "1:87980517677:web:38fa3ac380ea95bdf40ba4",
  measurementId: "G-RKWWN1E0VK",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
