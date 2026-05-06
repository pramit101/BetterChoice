import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { IP } from "../constants/IP";
import { auth } from "../fireconfig";

interface UserProfile {
  isOnboarded: boolean;
  age?: number;
  weight?: number;
  goal?: string;
  activityLevel?: string;
  gender?: string;
  height?: number;
  targateData?: Date;
}
const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  serverError: boolean;
  clearServerError: () => void;
  refreshProfile: () => Promise<void> | null;
}>({
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  serverError: false,
  clearServerError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [serverError, setServerError] = useState(false);
  //LogBox.ignoreLogs(["TypeError: Network request failed"]);

  const fetchProfile = async (u: User) => {
    try {
      // Added :3000 assuming your Express server runs on that port
      const response = await fetch(`http://${IP}:3000/api/user/${u.uid}`);
      if (response.status === 404) {
        // New user — not in DB yet, not a server error
        setProfile({ isOnboarded: false });
        setServerError(false);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setServerError(false);
      } else {
        setServerError(true);
        return;
      }
    } catch (error) {
      setServerError(true);
    }
  };

  const clearServerError = () => setServerError(false);

  // 3. Updated refreshProfile to return a Promise so you can 'await' it
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        refreshProfile,
        serverError,
        clearServerError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
