import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (code: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Captcha: React.FC<CaptchaProps> = ({ onVerify, className = "", children }) => {
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
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 ml-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Enter Captcha *
        </label>
        <button
          type="button"
          onClick={generateCaptcha}
          className="text-brand-600 hover:text-brand-700 active:scale-95 transition-all outline-none flex items-center justify-center"
          title="Refresh Captcha"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <div className="w-32 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-300 select-none overflow-hidden shadow-sm">
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
        {children}
      </div>
    </div>
  );
};
