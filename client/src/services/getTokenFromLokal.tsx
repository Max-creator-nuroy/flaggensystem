export default function getUserFromToken(token: any) {
  
  if (token) {
    const base64Payload = token.split(".")[1]; // Teil zwischen den Punkten
    const payload = JSON.parse(atob(base64Payload)); // Base64 -> JSON
    return payload;
  }
  return null;
}
