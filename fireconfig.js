import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCgUTcOmoxwTe9nGJcZwaUzHkghs6FXsUI",
  authDomain: "betterchoice-a6c02.firebaseapp.com",
  projectId: "betterchoice-a6c02",
  storageBucket: "betterchoice-a6c02.firebasestorage.app",
  messagingSenderId: "674749937487",
  appId: "1:674749937487:web:e8453722f78eb31f93f73a",
  measurementId: "G-W1BEST4XW1",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { app, auth };
