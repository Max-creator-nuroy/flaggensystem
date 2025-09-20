import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { isTokenExpired, logout } from "@/services/getTokenFromLokal";

type Props = {
  allowedRoles: string[];
};

const RoleProtectedRoute = ({ allowedRoles }: Props) => {
  const token = localStorage.getItem("token");

    if (!token || isTokenExpired(token)) {
    logout(); // Use centralized logout function
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode<{ role: string }>(token);
    const role = decoded.role;

    return allowedRoles.includes(role) ? (
      <Outlet />
    ) : (
      <Navigate to="/unauthorized" replace />
    );
  } catch (err) {
    return <Navigate to="/login" replace />;
  }
};

export default RoleProtectedRoute;
