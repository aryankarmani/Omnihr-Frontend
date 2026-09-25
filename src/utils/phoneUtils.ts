/**
 * Utility to extract clean 10 digits from any phone string (stripping duplicated "+91", country codes, spaces, etc.)
 */
export const extractPhoneDigits = (phone?: string | null): string => {
    if (!phone || typeof phone !== 'string') return '';
    let cleaned = phone.trim();
    // Repeatedly remove "+91" from the beginning
    while (cleaned.startsWith('+91')) {
        cleaned = cleaned.slice(3).trim();
    }
    // Also remove any stray "+91" inside
    cleaned = cleaned.replace(/\+91/g, '').trim();
    // Extract remaining digits
    const digits = cleaned.replace(/\D/g, '');
    // If someone stored 12 digits like 919876543210:
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2);
    }
    // If it's just '91' or '9191' or less than 10 digits without being a full number
    if (digits === '91' || digits === '9191') {
        return '';
    }
    return digits.slice(-10);
};

/**
 * Format a phone number for display with country code +91
 */
export const formatPhoneNumber = (phone?: string | null): string => {
    const digits = extractPhoneDigits(phone);
    return digits ? `+91 ${digits}` : '';
};
