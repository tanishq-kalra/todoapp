import {Navigate} from "react-router-dom"
import {useAuth} from "../contexts/AuthContext"

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  // Wait for authentication check to finish
  if (loading) {
    return null; // Or a loading spinner if preferred, though AuthContext handles full screen loading
  }

  // Only redirect if explicitly not authenticated after loading completes
  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute