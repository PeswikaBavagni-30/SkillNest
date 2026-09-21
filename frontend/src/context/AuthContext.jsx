import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("skillnest_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("skillnest_token") || null;
  });

  // Loading state indicates session verification in progress (Requirement 4)
  const [loading, setLoading] = useState(true);

  // Re-verify session with backend on initial application load (Requirement 4, 12)
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem("skillnest_token");

      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success && data.user) {
          if (isMounted) {
            setUser(data.user);
            localStorage.setItem("skillnest_user", JSON.stringify(data.user));
          }
        } else {
          // Token expired, invalid, or user is suspended -> clean logout
          if (isMounted) {
            setUser(null);
            setToken(null);
            localStorage.removeItem("skillnest_user");
            localStorage.removeItem("skillnest_token");
          }
        }
      } catch (err) {
        // Network error during verification - retain local session if present
        console.warn("Session verification warning:", err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginUser = (userData, sessionToken) => {
    setUser(userData);
    setToken(sessionToken || "");
    localStorage.setItem("skillnest_user", JSON.stringify(userData));
    if (sessionToken) {
      localStorage.setItem("skillnest_token", sessionToken);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem("skillnest_user", JSON.stringify(merged));
      return merged;
    });
  };

  const logoutUser = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("skillnest_user");
    localStorage.removeItem("skillnest_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginUser,
        updateUser,
        logoutUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
