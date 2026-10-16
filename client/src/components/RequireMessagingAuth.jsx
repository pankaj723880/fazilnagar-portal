import { Navigate, useLocation } from "react-router-dom";
import { getAuthUser } from "../utils/authStorage";

export default function RequireMessagingAuth({ children }) {
  const portalUser = getAuthUser();
  const location = useLocation();

  if (!portalUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname, message: "Please log in to access Fazilnagar Town Messaging." }}
        replace
      />
    );
  }

  return children;
}
