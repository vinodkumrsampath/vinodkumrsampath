'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      setAuth(data.accessToken, data.refreshToken, data.user);
      if (data.user.verificationLevel === 'none') {
        router.push('/verify');
      } else {
        router.push('/discover');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-500 mb-2">Verified</h1>
          <p className="text-gray-600">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email address" value={email}
            onChange={(e) => setEmail(e.target.value)} required className="input" />
          <input type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required className="input" />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          No account?{' '}
          <Link href="/register" className="text-brand-500 font-semibold">Create one</Link>
        </p>
      </div>
    </div>
  );
}
