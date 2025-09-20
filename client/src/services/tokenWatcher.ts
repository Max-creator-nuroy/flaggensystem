import { isTokenExpired, logout } from './getTokenFromLokal';

export class TokenWatcher {
  private intervalId: number | null = null;
  private checkInterval = 60000; // Check every minute

  start() {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(() => {
      this.checkTokenExpiration();
    }, this.checkInterval);

    // Also check immediately
    this.checkTokenExpiration();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private checkTokenExpiration() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // No token found, redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return;
    }

    if (isTokenExpired(token)) {
      console.log('Token expired, logging out...');
      logout();
      return;
    }

    // Check if token expires within the next 30 minutes
    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      const thirtyMinutes = 30 * 60 * 1000;

      if (timeUntilExpiration <= thirtyMinutes && timeUntilExpiration > 0) {
        console.log(`Token expires in ${Math.round(timeUntilExpiration / (60 * 1000))} minutes`);
        // You could show a warning notification here
        // For now, we'll just log it
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      logout();
    }
  }

  // Method to get remaining time until token expiration
  getTimeUntilExpiration(): number | null {
    const token = localStorage.getItem('token');
    
    if (!token) return null;

    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      return Math.max(0, expirationTime - currentTime);
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const tokenWatcher = new TokenWatcher();