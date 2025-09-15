import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, isCompleteUser } from "@/hooks/useAuth";

import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import Landing from "./pages/landing";
import Home from "./pages/home";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Register from "./pages/register";
import Login from "./pages/login";
import AnnouncementsPage from "./pages/announcements";

function Router() {
  const { user, isAuthenticated, isLoading, dbUnavailable, dbError, hasLimitedData } = useAuth();

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

  // Show notification if database is unavailable but user is authenticated
  const dbStatusMessage = dbUnavailable 
    ? "Database temporarily unavailable - some features may be limited" 
    : dbError 
    ? "Database connection issues - some data may not be current"
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Database status notification */}
      {dbStatusMessage && isAuthenticated && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <div className="flex items-center justify-center">
            <div className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              ⚠️ {dbStatusMessage}
            </div>
          </div>
        </div>
      )}
      
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
          {isCompleteUser(user) && (
            <>
              <Route path="/dashboard" component={() => <Dashboard user={user} />} />
              <Route path="/profile" component={() => <Profile user={user} onUserUpdate={handleUserUpdate} />} />
              <Route path="/announcements" component={() => <AnnouncementsPage user={user} />} />
              {user.isAdmin && <Route path="/admin" component={() => <Admin user={user} />} />}
            </>
          )}
        </>
      )}
      <Route component={NotFound} />
      </Switch>
    </div>
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
