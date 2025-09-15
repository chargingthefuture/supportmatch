import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ExtendedUser extends Partial<User> {
  id?: string;
  dbUnavailable?: boolean;
  dbError?: boolean;
  isAuthenticated?: boolean;
}

// Type guard to check if user has all required properties for components
function isCompleteUser(user: ExtendedUser | undefined): user is User & { dbUnavailable?: boolean; dbError?: boolean; isAuthenticated?: boolean } {
  return !!(user && user.id && typeof user.id === 'string');
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<ExtendedUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Handle authentication errors gracefully
  const isAuthError = error && isUnauthorizedError(error as Error);
  
  // User is authenticated if we have user data, even if DB is down
  const isAuthenticated = !!user && !isAuthError;
  
  // Provide status information for UI to handle gracefully
  const authStatus = {
    isAuthenticated,
    isLoading: isLoading && !isAuthError,
    user,
    error: isAuthError ? error : null,
    dbUnavailable: user?.dbUnavailable || false,
    dbError: user?.dbError || false,
    hasLimitedData: !!(user?.dbUnavailable || user?.dbError),
    isCompleteUser: isCompleteUser(user)
  };

  return authStatus;
}

// Export the type guard for use in components
export { isCompleteUser };