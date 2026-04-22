'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';

export function OtpStep({ onComplete }: { onComplete: () => void }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/email/verify-otp', { otp });
      toast.success('Email verified!');
      onComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post('/auth/email/request-otp');
      toast.success('New code sent to your email');
    } catch {
      toast.error('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📧</div>
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-gray-600 mt-2">Enter the 6-digit code we sent you</p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          className="input text-center text-3xl tracking-widest font-bold"
        />
        <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <button
        onClick={handleResend}
        disabled={resending}
        className="w-full text-center text-brand-500 text-sm mt-4 hover:underline"
      >
        {resending ? 'Sending...' : 'Resend code'}
      </button>
    </div>
  );
}
