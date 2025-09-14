import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import Landing from "./pages/landing";
import Home from "./pages/home";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Register from "./pages/register";
import Login from "./pages/login";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleUserUpdate = (updatedUser: any) => {
    // Invalidate user query to trigger a refresh
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/register" component={Register} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={() => <Dashboard user={user!} />} />
          <Route path="/profile" component={() => <Profile user={user!} onUserUpdate={handleUserUpdate} />} />
          {user?.isAdmin && <Route path="/admin" component={() => <Admin user={user!} />} />}
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
