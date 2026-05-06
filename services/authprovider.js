import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";
import { auth } from "../fireconfig";

export const signUp = async (email, password, fullName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, {
    displayName: fullName,
  });
  await user.reload();
  return auth.currentUser;
};

export const signIn = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const logOut = async () => {
  await signOut(auth);
};
