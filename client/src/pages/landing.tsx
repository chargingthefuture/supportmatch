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
            PartnerMatch
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect with meaningful partnerships. Find your perfect match for collaboration, 
            friendship, and shared experiences in a safe and welcoming community.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
            data-testid="button-login"
          >
            Get Started
          </Button>
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
                Our intelligent algorithm connects you with compatible partners based on shared interests and values.
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
                Coordinate meetings and activities with built-in scheduling tools and calendar integration.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-500 dark:text-gray-400">
            Join thousands of users who have found their perfect match
          </p>
        </div>
      </div>
    </div>
  );
}

export default Landing;