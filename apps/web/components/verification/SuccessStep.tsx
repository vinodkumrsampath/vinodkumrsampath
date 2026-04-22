'use client';

import { useEffect, useState } from 'react';

export function SuccessStep({ onComplete }: { onComplete: () => void }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); onComplete(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="card p-8 text-center">
      <div className="relative mx-auto w-24 h-24 mb-6">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl animate-bounce">
          ✅
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Verified!</h2>
      <p className="text-gray-600 mb-6">
        Your profile will now display the verified badge. Every photo you upload will be checked against your selfie.
      </p>
      <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
        <span>✅</span> Verified Member
      </div>
      <p className="text-gray-400 text-sm mt-6">Continuing in {countdown}...</p>
    </div>
  );
}
