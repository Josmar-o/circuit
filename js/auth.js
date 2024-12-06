// auth.js
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyD134oGJdsO2zpXSkXSg7Z_VABaQmfiIQQ",
    authDomain: "proyecto-d-iv.firebaseapp.com",
    projectId: "proyecto-d-iv",
    storageBucket: "proyecto-d-iv.firebasestorage.app",
    messagingSenderId: "247422509873",
    appId: "1:247422509873:web:2a11bf59b83aae52494610",
    measurementId: "G-ZNVXN04Z0S"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };