import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAvskFA6lA852XiFqI3T-_QBlG7EG5iHSI",
  authDomain: "billarmania.firebaseapp.com",
  projectId: "billarmania",
  storageBucket: "billarmania.firebasestorage.app",
  messagingSenderId: "412224605492",
  appId: "1:412224605492:web:bf841d23e3005718b86961"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);