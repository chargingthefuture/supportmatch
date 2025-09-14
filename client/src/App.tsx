import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { authManager } from "./lib/auth";
import { User } from "@shared/schema";

import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import Register from "./pages/register";
import Profile from "./pages/profile";
import Admin from "./pages/admin";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = authManager.getSessionId();
      if (sessionId) {
        try {
          const response = await fetch('/api/users/me', {
            headers: authManager.getAuthHeaders()
          });
          if (response.ok) {
            const userData = await response.json();
            authManager.setSession(userData, sessionId);
            setUser(userData);
          } else {
            authManager.logout();
          }
        } catch (error) {
          authManager.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/register" component={() => <Register onLogin={setUser} />} />
      {!user ? (
        <Route path="/" component={() => <Register onLogin={setUser} />} />
      ) : (
        <>
          <Route path="/" component={() => <Dashboard user={user} />} />
          <Route path="/profile" component={() => <Profile user={user} onUserUpdate={setUser} />} />
          {user.isAdmin && <Route path="/admin" component={() => <Admin user={user} />} />}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
