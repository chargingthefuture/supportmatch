import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Heart, Users, Calendar } from "lucide-react";

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-full">
              <Handshake className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Support Match
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Match with TIs for collaboration, friendship, and shared experiences in a welcoming community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = "/register"}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
              data-testid="button-register"
            >
              Create Account
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => window.location.href = "/login"}
              className="border-2 border-pink-500 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950 px-8 py-4 text-lg rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Or continue with
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = "/api/login"}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
              data-testid="button-replit-auth"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.04 2.5A4.54 4.54 0 0 0 2.5 7.04v4.92c0 .92.76 1.67 1.68 1.67h4.26c.92 0 1.67-.75 1.67-1.67V7.04A4.54 4.54 0 0 0 5.57 2.5H7.04zM7.04 14.37c.92 0 1.67.75 1.67 1.67v4.92a4.54 4.54 0 0 1-4.54 4.54H2.5v-1.67c0-4.54 3.68-8.21 8.21-8.21h-3.67z"/>
                <path d="M14.37 2.5H21.5v11.87h-3.67c-4.53 0-8.21 3.67-8.21 8.21v1.67h-1.67a4.54 4.54 0 0 1-4.54-4.54v-4.92c0-.92.75-1.67 1.67-1.67h4.26c.92 0 1.67.75 1.67 1.67v-11.87h3.67z"/>
              </svg>
              Continue with Replit
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="text-center border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Heart className="h-12 w-12 text-pink-500" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">Safe Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Build meaningful relationships in a secure, moderated environment designed for genuine connections.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Users className="h-12 w-12 text-purple-500" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">Smart Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Our intelligent algorithm connects you with compatible TIs based on shared interests and values.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Calendar className="h-12 w-12 text-indigo-500" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">Easy Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Coordinate meetings and activities with built-in chat.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-500 dark:text-gray-400">
            Join thousands of users who have found their perfect match.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Landing;