'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { email, password });
      setAuth(data.accessToken, data.refreshToken, data.user);
      toast.success('Account created! Check your email for a verification code.');
      router.push('/verify');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-500 mb-2">Verified</h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="input"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-500 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
