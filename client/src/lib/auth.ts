import { User } from "@shared/schema";

class AuthManager {
  private currentUser: User | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.sessionId = localStorage.getItem('sessionId');
  }

  setSession(user: User, sessionId: string) {
    this.currentUser = user;
    this.sessionId = sessionId;
    localStorage.setItem('sessionId', sessionId);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isAuthenticated(): boolean {
    return !!this.sessionId;
  }

  logout() {
    this.currentUser = null;
    this.sessionId = null;
    localStorage.removeItem('sessionId');
  }

  getAuthHeaders(): Record<string, string> {
    if (this.sessionId) {
      return { 'x-session-id': this.sessionId };
    }
    return {};
  }
}

export const authManager = new AuthManager();
