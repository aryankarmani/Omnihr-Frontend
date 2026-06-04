import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

export function useRBAC() {
    const { user } = useAuth();

    /**
     * Checks if the current user has the required role.
     * @param allowedRoles Array of roles that can access the resource
     */
    const hasPermission = (allowedRoles: UserRole[]) => {
        if (!user) return false;
        return allowedRoles.includes(user.role);
    };

    return {
        hasPermission,
        role: user?.role,
        isAdmin: user?.role === 'HR_ADMIN',
        // ✅ CHANGED: Manager is no longer a role
        isManager: user?.role === 'HR_ADMIN', // Admins imply manager access usually
    };
}
