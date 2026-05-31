import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAKFLXr7dSlzb1TqQWA6uLlnQQyU6oXNUk",
  authDomain: "quackhacks-93c64.firebaseapp.com",
  projectId: "quackhacks-93c64",
  storageBucket: "quackhacks-93c64.firebasestorage.app",
  messagingSenderId: "830653967338",
  appId: "1:830653967338:web:00da53ce1d1175faea2093",
  measurementId: "G-6VKZ31FLKC",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
