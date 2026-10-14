import React, { useState } from 'react';
import { getMediaUrl } from '../../utils/api';

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    bgClassName?: string;
}

const sizeClasses: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
};

export const getInitials = (name?: string | null): string => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function UserAvatar({
    src,
    name,
    size = 'sm',
    className = '',
    bgClassName = 'bg-[#EEF1F5] dark:bg-gray-700 text-[#12151C] dark:text-white',
}: UserAvatarProps) {
    const rawSrc = src && typeof src === 'string' && !src.startsWith('bg-') ? src : null;
    const initialUrl = rawSrc ? getMediaUrl(rawSrc) : null;
    const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
    const [imgError, setImgError] = useState(false);
    const [triedFallback, setTriedFallback] = useState(false);

    React.useEffect(() => {
        const u = rawSrc ? getMediaUrl(rawSrc) : null;
        setCurrentUrl(u);
        setImgError(false);
        setTriedFallback(false);
    }, [src]);

    const handleError = () => {
        if (!triedFallback && currentUrl && currentUrl.includes('localhost:3001')) {
            setTriedFallback(true);
            const renderUrl = currentUrl.replace('http://localhost:3001', 'https://omnihr-backend-19fx.onrender.com');
            setCurrentUrl(renderUrl);
        } else {
            setImgError(true);
        }
    };

    const initials = getInitials(name);
    const sizeCls = sizeClasses[size] || sizeClasses.sm;

    return (
        <div
            className={`relative rounded-full flex items-center justify-center font-mono-numbers font-semibold shrink-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${sizeCls} ${bgClassName} ${className}`}
        >
            {currentUrl && !imgError ? (
                <img
                    src={currentUrl}
                    alt={name || 'User'}
                    className="w-full h-full object-cover object-top rounded-full"
                    onError={handleError}
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
}
