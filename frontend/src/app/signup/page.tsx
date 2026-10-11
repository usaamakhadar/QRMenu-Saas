'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Store, Mail, Lock, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurantName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      // Save JWT token for the kitchen auth guard
      if (data.token) {
        localStorage.setItem('qrmenu_token', data.token);
        localStorage.setItem('qrmenu_slug', data.slug);
        localStorage.setItem('qrmenu_restaurantId', data.id);
        localStorage.setItem('qrmenu_name', data.name);
      }

      // Also save legacy session format (for backward compatibility)
      localStorage.setItem('qrmenu_session', JSON.stringify({
        id: data.id,
        name: data.name,
        slug: data.slug,
        email: data.email,
      }));

      // Route to their specific kitchen dashboard
      router.push(`/kitchen/${data.slug}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b11] text-gray-300 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#ff6b00]/10 to-transparent blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#006c4b]/10 to-transparent blur-[120px] pointer-events-none z-0"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-all duration-200 mb-8 group"
        >
          <ArrowLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>

        {/* Logo Icon */}
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff6b00] to-[#ff8f40] flex items-center justify-center shadow-lg shadow-[#ff6b00]/25 group-hover:scale-105 transition-transform duration-300">
            <UtensilsCrossed className="text-white w-6 h-6" />
          </div>
          <span className="font-headline-md text-2xl font-black tracking-tight text-white">
            QRMenu<span className="text-[#ff6b00]">SaaS</span>
          </span>
        </Link>
        
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">
          Create your Account
        </h2>
        <p className="text-sm text-gray-400 font-light">
          Get started with your free multi-tenant QR menu platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl py-10 px-6 shadow-2xl rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="restaurantName" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Restaurant Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Store className="w-4 h-4" />
                </span>
                <input
                  id="restaurantName"
                  name="restaurantName"
                  type="text"
                  required
                  placeholder="e.g. Usama Burgers"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="pl-10 block w-full bg-white/[0.03] border border-white/[0.08] focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Email address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full bg-white/[0.03] border border-white/[0.08] focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 block w-full bg-white/[0.03] border border-white/[0.08] focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-[#ff6b00]/10 text-base font-bold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8526] hover:from-[#e05e00] hover:to-[#e07119] active:scale-98 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Register Restaurant'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-white/[0.06] pt-6">
            <p className="text-sm text-gray-400 font-light">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-[#ff6b00] hover:text-[#ff8f40] transition-colors">
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
