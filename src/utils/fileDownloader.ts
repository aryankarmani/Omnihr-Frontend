/**
 * Utility to reliably download files in the browser by fetching them as a Blob,
 * bypassing cross-origin restrictions on the HTML5 `download` attribute.
 */
export const downloadFile = async (url: string, fileName?: string): Promise<void> => {
    if (!url) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        let finalFileName = fileName || url.split('/').pop()?.split('?')[0] || 'document';
        // If finalFileName does not have an extension, try to extract it from url
        if (!finalFileName.includes('.')) {
            const urlPath = url.split('?')[0];
            const ext = urlPath.split('.').pop();
            if (ext && ext.length <= 5 && !ext.includes('/')) {
                finalFileName = `${finalFileName}.${ext}`;
            }
        }

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Direct download failed, falling back to direct link:', err);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'document';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
