import {jwtDecode} from "jwt-decode";

interface JwtPayload {
  exp: number; // Ablaufzeit in Sekunden
  [key: string]: any;
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: JwtPayload = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Zeit in Sekunden
    return decoded.exp < currentTime;
  } catch (e) {
    return true; // ungültiger Token → sicherheitshalber als abgelaufen behandeln
  }
};
