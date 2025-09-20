export default function getUserFromToken(token: any) {
  
  if (token) {
    try {
      const base64Payload = token.split(".")[1]; // Teil zwischen den Punkten
      const payload = JSON.parse(atob(base64Payload)); // Base64 -> JSON
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token is expired, remove it and redirect to login
        localStorage.removeItem("token");
        window.location.href = "/login";
        return null;
      }
      
      return payload;
    } catch (error) {
      // Invalid token format, remove it and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
      return null;
    }
  }
  return null;
}

// Helper function to check if token is expired without automatic logout
export function isTokenExpired(token: any): boolean {
  if (!token) return true;
  
  try {
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload.exp && payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}

// Helper function to manually logout
export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}
