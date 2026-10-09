import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../utils/api';

interface CaptchaProps {
  onVerify: (token: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Captcha: React.FC<CaptchaProps> = ({ onVerify, className = "", children }) => {
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const fetchCaptcha = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/captcha');
      if (res.data?.captchaSvg) {
        setCaptchaSvg(res.data.captchaSvg);
        onVerify(res.data.captchaToken || '');
      }
    } catch (e) {
      console.error('Failed to load captcha from server:', e);
    } finally {
      setLoading(false);
    }
  }, [onVerify]);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Enter Captcha *
        </label>
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          className="text-brand-600 hover:text-brand-700 active:scale-95 transition-all outline-none flex items-center justify-center cursor-pointer disabled:opacity-50"
          aria-label="Refresh Captcha"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <div
          className="w-32 h-11 bg-[#F8F9FA] dark:bg-gray-800 rounded-[6px] flex items-center justify-center border border-[#E2E6ED] dark:border-gray-700 select-none overflow-hidden shrink-0"
          dangerouslySetInnerHTML={{
            __html: captchaSvg || '<span style="font-size:11px;color:#9AA3B1;">Loading...</span>'
          }}
        />
        {children}
      </div>
    </div>
  );
};

