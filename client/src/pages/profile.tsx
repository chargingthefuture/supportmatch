import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserX, Settings, Trash2 } from "lucide-react";
import { z } from "zod";

const updateProfileSchema = insertUserSchema.pick({
  name: true,
  gender: true,
  timezone: true,
});

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

interface ExclusionWithUser {
  id: string;
  excludedUser: User;
  reason: string | null;
  createdAt: string;
}

export default function Profile({ user, onUserUpdate }: ProfileProps) {
  const [activeSection, setActiveSection] = useState<'profile' | 'exclusions' | 'privacy'>('profile');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      gender: user.gender,
      timezone: user.timezone || "",
    },
  });

  // Fetch exclusions
  const { data: exclusions = [], isLoading: exclusionsLoading } = useQuery<ExclusionWithUser[]>({
    queryKey: ['/api/exclusions'],
    enabled: activeSection === 'exclusions',
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: z.infer<typeof updateProfileSchema>) => {
      return apiRequest('PUT', '/api/users/me', data);
    },
    onSuccess: (response: Response) => {
      response.json().then((updatedUser: User) => {
        onUserUpdate(updatedUser);
        // Reset form with updated values
        form.reset({
          name: updatedUser.name,
          gender: updatedUser.gender,
          timezone: updatedUser.timezone || "",
        });
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Remove exclusion mutation (for future implementation)
  const removeExclusion = useMutation({
    mutationFn: async (exclusionId: string) => {
      return apiRequest('DELETE', `/api/exclusions/${exclusionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Exclusion Removed",
        description: "The user exclusion has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/exclusions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove exclusion",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof updateProfileSchema>) => {
    await updateProfile.mutateAsync(values);
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ');
  };


  const getInitials = (name: string | null) => {
    if (!name || typeof name !== 'string') {
      return 'TU';
    }
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-profile">
      <Header user={user} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" data-testid="heading-profile">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account, privacy settings, and safety preferences.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              data-testid="tab-profile"
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveSection('exclusions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'exclusions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              data-testid="tab-exclusions"
            >
              <UserX className="w-4 h-4 inline mr-2" />
              Exclusions ({exclusions.length})
            </button>
            <button
              onClick={() => setActiveSection('privacy')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'privacy'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              data-testid="tab-privacy"
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Privacy
            </button>
          </nav>
        </div>

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <Card data-testid="section-profile">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your personal information and preferences.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""} data-testid="select-gender">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="non-binary">Non-binary</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., PST, EST, UTC-8" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-timezone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateProfile.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Exclusions Section */}
        {activeSection === 'exclusions' && (
          <Card data-testid="section-exclusions">
            <CardHeader>
              <CardTitle>Exclusion Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Users you've excluded from future partnerships. These users will not be matched with you.
              </p>
            </CardHeader>
            <CardContent>
              {exclusionsLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading exclusions...</div>
                </div>
              ) : exclusions.length === 0 ? (
                <div className="text-center py-8">
                  <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Exclusions</h3>
                  <p className="text-muted-foreground">
                    You haven't excluded any users from future partnerships yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exclusions.map((exclusion) => (
                    <div 
                      key={exclusion.id} 
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                      data-testid={`exclusion-${exclusion.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-semibold">
                          {getInitials(exclusion.excludedUser.name)}
                        </div>
                        <div>
                          <h4 className="font-medium" data-testid={`exclusion-name-${exclusion.id}`}>
                            {exclusion.excludedUser.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatGender(exclusion.excludedUser.gender)} • 
                            Excluded {new Date(exclusion.createdAt).toLocaleDateString()}
                          </p>
                          {exclusion.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reason: {exclusion.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeExclusion.mutate(exclusion.id)}
                        disabled={removeExclusion.isPending}
                        data-testid={`button-remove-exclusion-${exclusion.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Privacy Section */}
        {activeSection === 'privacy' && (
          <Card data-testid="section-privacy">
            <CardHeader>
              <CardTitle>Privacy & Safety</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your privacy settings and safety preferences.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Matching Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Gender-based matching</p>
                      <p className="text-sm text-muted-foreground">
                        You'll only be matched with users of the same gender
                      </p>
                    </div>
                    <Badge variant="secondary" data-testid="badge-gender-matching">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Exclusion list active</p>
                      <p className="text-sm text-muted-foreground">
                        Users you've excluded won't be matched with you
                      </p>
                    </div>
                    <Badge variant="secondary" data-testid="badge-exclusions-active">
                      {exclusions.length} excluded
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Data & Communication</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Message history</p>
                      <p className="text-sm text-muted-foreground">
                        Your messages are stored securely during partnerships
                      </p>
                    </div>
                    <Badge variant="secondary" data-testid="badge-message-storage">Encrypted</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Account Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Account active</p>
                      <p className="text-sm text-muted-foreground">
                        You're eligible for new partnerships
                      </p>
                    </div>
                    <Badge 
                      variant={user.isActive ? "default" : "destructive"}
                      data-testid="badge-account-status"
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Member since</p>
                      <p className="text-sm text-muted-foreground">
                        Your account creation date
                      </p>
                    </div>
                    <Badge variant="outline" data-testid="badge-member-since">
                      {new Date(user.createdAt!).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
