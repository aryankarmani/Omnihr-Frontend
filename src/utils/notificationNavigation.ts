export function getNotificationRedirectUrl(n: any): string | null {
    if (!n) return null;

    if (n.link && typeof n.link === 'string' && n.link.trim() !== '') {
        return n.link.trim();
    }

    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    const type = (n.type || '').toLowerCase();

    // Shift updates
    if (title.includes('shift') || msg.includes('shift')) {
        return '/profile?tab=shiftRoster';
    }

    // Salary updates
    if (title.includes('salary') || msg.includes('salary')) {
        return '/profile?tab=salary';
    }

    // Statutory & Bank updates
    if (
        title.includes('statutory') ||
        title.includes('bank') ||
        msg.includes('statutory') ||
        msg.includes('bank')
    ) {
        return '/profile?tab=statutory';
    }

    // Corrections & Regularizations
    if (
        title.includes('correction') ||
        title.includes('regularization') ||
        msg.includes('correction') ||
        msg.includes('regularization') ||
        msg.includes('regularize')
    ) {
        if (
            title.includes('request') ||
            msg.includes('request') ||
            title.includes('pending') ||
            msg.includes('submitted')
        ) {
            return '/regularizations';
        }
        return '/attendance';
    }

    // Attendance & Late marks
    if (
        type === 'attendance' ||
        title.includes('attendance') ||
        title.includes('late') ||
        msg.includes('late mark') ||
        msg.includes('logged in at')
    ) {
        return '/attendance';
    }

    // Leave
    if (type === 'leave' || title.includes('leave') || msg.includes('leave')) {
        if (
            title.includes('request') ||
            msg.includes('request') ||
            title.includes('submitted') ||
            title.includes('applied') ||
            title.includes('pending')
        ) {
            return '/leave?tab=APPROVALS';
        }
        return '/leave?tab=MY_LEAVE';
    }

    // Team & Manager
    if (
        title.includes('team') ||
        msg.includes('team') ||
        title.includes('manager') ||
        msg.includes('manager')
    ) {
        return '/team';
    }

    // Profile general
    if (title.includes('profile') || msg.includes('profile')) {
        return '/profile?tab=personal';
    }

    return null;
}
