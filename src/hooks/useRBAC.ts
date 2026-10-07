import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

export function useRBAC() {
    const { user } = useAuth();

    /**
     * Checks if the current user has the required role (array) or granular permission code (string).
     */
    const hasPermission = (allowed: UserRole[] | string) => {
        if (!user) return false;
        if (typeof allowed === 'string') {
            const role = String(user.role || '').toUpperCase();
            if (role === 'SUPER_ADMIN') return true;
            return Array.isArray(user.permissions) && user.permissions.includes(allowed);
        }
        return allowed.includes(user.role);
    };

    const hasGranularPermission = (permissionCode: string) => {
        if (!user) return false;
        const role = String(user.role || '').toUpperCase();
        if (role === 'SUPER_ADMIN') return true;
        return Array.isArray(user.permissions) && user.permissions.includes(permissionCode);
    };

    return {
        hasPermission,
        hasGranularPermission,
        role: user?.role,
        isAdmin: user?.role === 'HR_ADMIN' || (user?.role as string) === 'ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'SUPER_ADMIN',
        // ✅ CHANGED: Manager is no longer a role
        isManager: user?.role === 'HR_ADMIN' || (user?.role as string) === 'ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'SUPER_ADMIN', // Admins imply manager access usually
    };
}
