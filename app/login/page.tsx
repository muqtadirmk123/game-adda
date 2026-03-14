"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'info', message: isLogin ? 'Logging in...' : 'Creating account...' });

    if (isLogin) {
      // 🔐 LOGIN LOGIC
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus({ type: 'error', message: error.message });
      } else {
        setStatus({ type: 'success', message: 'Welcome back to the Adda!' });
        router.push('/'); // Login ke baad homepage par bhej do
      }
    } else {
      // 📝 SIGNUP LOGIC
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setStatus({ type: 'error', message: error.message });
      } else {
        setStatus({ type: 'success', message: 'Account created! Check your email to verify (if enabled) or just login.' });
        setIsLogin(true); // Signup ke baad login form dikha do
        setPassword('');
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#050511] flex items-center justify-center p-6 text-white font-sans selection:bg-fuchsia-500">
      <div className="w-full max-w-md bg-[#0a0a1a] border border-gray-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-block mb-6 text-sm text-gray-500 hover:text-cyan-400 transition-colors font-semibold">
            ← Back to Arcade
          </Link>

          <h2 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            {isLogin ? 'Welcome Back' : 'Join the Adda'}
          </h2>
          <p className="text-gray-400 mb-8 text-sm">
            {isLogin ? 'Login to continue your gaming journey.' : 'Create an account to track scores and play.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {status.message && (
              <div className={`p-3 rounded-lg text-sm font-bold text-center ${status.type === 'error' ? 'bg-red-900/50 text-red-400' : status.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                {status.message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-50 uppercase tracking-widest mt-2"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login Now' : 'Create Account')}
            </button>
          </form>
          
          <div className="mt-8 text-center text-gray-400 text-sm border-t border-gray-800 pt-6">
            {isLogin ? "Don't have an account? " : "Already a player? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setStatus({type: '', message: ''}); }}
              className="text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors"
            >
              {isLogin ? 'Sign up here' : 'Login instead'}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}