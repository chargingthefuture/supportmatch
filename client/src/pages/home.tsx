import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import AnnouncementDisplay from "@/components/announcement-display";
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  Settings, 
  LogOut,
  UserCircle,
  Shield,
  Megaphone
} from "lucide-react";

function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Support Match
              </h1>
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-300" data-testid="text-welcome">
                  Welcome back, {user.firstName || user.email}!
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {user?.isAdmin && (
                <Button 
                  variant="outline" 
                  asChild 
                  className="flex items-center space-x-2"
                  data-testid="button-admin"
                >
                  <Link href="/admin">
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                </Button>
              )}
              <Button 
                variant="outline" 
                asChild 
                className="flex items-center space-x-2"
                data-testid="button-profile"
              >
                <Link href="/profile">
                  <UserCircle className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = "/api/logout"}
                className="flex items-center space-x-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Login Announcements */}
        <AnnouncementDisplay 
          showLoginOnly={true}
          className="mb-8"
          maxCount={3}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>View your matches and partnerships</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
                data-testid="button-dashboard"
              >
                <Link href="/dashboard">View Dashboard</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>Chat with your connections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                className="w-full"
                data-testid="button-messages"
              >
                <Link href="/dashboard">View Messages</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Megaphone className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle>Announcements</CardTitle>
                  <CardDescription>View all announcements and updates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant="outline" 
                className="w-full"
                data-testid="button-announcements"
              >
                <Link href="/announcements">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-gray-600" />
                <div>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Update your preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant="outline" 
                className="w-full"
                data-testid="button-settings"
              >
                <Link href="/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

export default Home;