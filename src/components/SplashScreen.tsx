import { useEffect, useState } from 'react';
import vedaLogo from '../assets/veda-logo.png';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start exit transition at 1.6s
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 1600);

    // Complete splash screen at 2.0s
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[999999] flex items-center justify-center bg-black transition-opacity duration-450 ease-in-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Centered Animated Logo */}
      <div className="flex items-center justify-center">
        <img
          src={vedaLogo}
          alt="App Logo"
          className={`w-32 h-32 object-contain transition-all duration-500 ease-out transform ${
            fadingOut ? 'scale-110 opacity-0' : 'scale-100 opacity-100 animate-pulse'
          }`}
        />
      </div>
    </div>
  );
}
