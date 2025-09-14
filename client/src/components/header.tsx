import { User } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Handshake, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: User;
  hasActiveMatch?: boolean;
}

export default function Header({ user, hasActiveMatch }: HeaderProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'TU'; // Default initials for "TI User"
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg" data-testid="logo">
              <Handshake className="text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-semibold" data-testid="app-title">TI Partners</h1>
              <p className="text-xs text-muted-foreground">Safe Accountability Network</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={location === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-dashboard">
                Dashboard
              </a>
            </Link>
            <Link href="/profile">
              <a className={location === "/profile" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-profile">
                Profile
              </a>
            </Link>
            {user.isAdmin && (
              <Link href="/admin">
                <a className={location === "/admin" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-admin">
                  Admin
                </a>
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {hasActiveMatch && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium" data-testid="status-active-match">
                <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></div>
                Active Match
              </div>
            )}
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center" data-testid="user-avatar">
              <span className="text-sm font-medium">{getInitials(user.name)}</span>
            </div>
            <Button
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
