import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingSpinner } from "./LoadingSpinner";


interface ProtectedRouteProps {
    children?: React.ReactNode;
}


export const ProtectedtedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { token, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />

    if (!token) {
        return <Navigate to="/login" replace />
    }

    return children ? <>{children}</> : <Outlet />

}