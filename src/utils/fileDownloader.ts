import api from './api';
import toast from 'react-hot-toast';

/**
 * Utility to reliably download files in the browser by fetching them as an authenticated Blob,
 * bypassing cross-origin restrictions on the HTML5 `download` attribute and attaching
 * JWT authorization and tenant headers for protected document endpoints.
 */
export const downloadFile = async (url: string, fileName?: string): Promise<void> => {
    if (!url) return;

    // Handle existing client-side blob: or data: URLs directly
    if (url.startsWith('blob:') || url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    let finalFileName = fileName || url.split('/').pop()?.split('?')[0] || 'document';
    if (!finalFileName.includes('.')) {
        const urlPath = url.split('?')[0];
        const ext = urlPath.split('.').pop();
        if (ext && ext.length <= 5 && !ext.includes('/')) {
            finalFileName = `${finalFileName}.${ext}`;
        }
    }

    try {
        // First try authenticated download via api instance (sends Bearer token & x-tenant-id with auto-refresh)
        const response = await api.get(url, {
            responseType: 'blob',
        });

        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data], {
                type: String(response.headers['content-type'] || 'application/octet-stream'),
            });
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (apiErr: any) {
        console.warn('Authenticated download via api failed, falling back to fetch/headers:', apiErr);
        try {
            // Fallback for external public URLs (e.g. CDN or S3) that might reject custom headers
            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
            const tenantId = sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (tenantId) headers['x-tenant-id'] = tenantId;

            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = finalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (fetchErr) {
            console.error('All download mechanisms failed:', fetchErr);
            toast.error('Failed to download document. Please check your network or permissions.');
        }
    }
};

