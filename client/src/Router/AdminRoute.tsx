import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AdminRoute = () => {
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/login" replace />;

  const decoded = jwtDecode<{ role: string }>(token);
  const role = decoded.role;

  if (role !== "ADMIN") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
