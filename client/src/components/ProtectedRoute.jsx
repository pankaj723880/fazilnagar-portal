import { Navigate } from "react-router-dom";
import { isUserLoggedIn } from "../utils/authStorage";

export default function ProtectedRoute({ children }) {
  const isAuthenticated = isUserLoggedIn();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}