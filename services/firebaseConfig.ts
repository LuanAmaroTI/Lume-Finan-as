
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARf-p0iS-PuaATEecAul3Vmz0aOlmXzqY",
  authDomain: "lume-a912b.firebaseapp.com",
  projectId: "lume-a912b",
  storageBucket: "lume-a912b.appspot.com",
  messagingSenderId: "432436406656",
  appId: "1:432436406656:web:lume_web_app" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
