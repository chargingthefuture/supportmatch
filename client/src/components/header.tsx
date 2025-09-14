import { User } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Handshake, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface HeaderProps {
  user: User;
  hasActiveMatch?: boolean;
}

export default function Header({ user, hasActiveMatch }: HeaderProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className={location === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-dashboard">
              Dashboard
            </Link>
            <Link href="/profile" className={location === "/profile" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-profile">
              Profile
            </Link>
            {user.isAdmin && (
              <Link href="/admin" className={location === "/admin" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground transition-colors"} data-testid="nav-admin">
                Admin
              </Link>
            )}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-6 mt-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                  </div>
                  
                  <nav className="flex flex-col space-y-4">
                    <Link 
                      href="/"
                      className={`block py-2 px-3 rounded-md transition-colors ${
                        location === "/" 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`} 
                      data-testid="mobile-nav-dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/profile"
                      className={`block py-2 px-3 rounded-md transition-colors ${
                        location === "/profile" 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`} 
                      data-testid="mobile-nav-profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {user.isAdmin && (
                      <Link 
                        href="/admin"
                        className={`block py-2 px-3 rounded-md transition-colors ${
                          location === "/admin" 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`} 
                        data-testid="mobile-nav-admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                  </nav>
                  
                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{getInitials(user.name || "TI User")}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name || "TI User"}</p>
                        <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={handleLogout}
                      className="w-full"
                      data-testid="mobile-button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center space-x-4">
            {hasActiveMatch && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium" data-testid="status-active-match">
                <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></div>
                Active Match
              </div>
            )}
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center" data-testid="user-avatar">
              <span className="text-sm font-medium">{getInitials(user.name || "TI User")}</span>
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
