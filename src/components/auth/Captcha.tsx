import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (code: string) => void;
  className?: string;
}

export const Captcha: React.FC<CaptchaProps> = ({ onVerify, className = "" }) => {
  const [captchaText, setCaptchaText] = useState("");

  const generateCaptcha = useCallback(() => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    onVerify(result);
  }, [onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 select-none overflow-hidden">
        <span
          className="text-xl font-black tracking-[0.2em] text-gray-800 italic whitespace-nowrap"
          style={{
            fontFamily: 'monospace',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            background: 'linear-gradient(45deg, #1e1b4b, #4c1d95)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {captchaText}
        </span>
      </div>
      <button
        type="button"
        onClick={generateCaptcha}
        className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
        title="Refresh Captcha"
      >
        <RefreshCw size={20} className="text-brand-600" />
      </button>
    </div>
  );
};
