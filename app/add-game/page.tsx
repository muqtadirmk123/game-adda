"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AddGame() {
  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Tera Secret Password (Isko tu baad mein change kar lena)
  const ADMIN_PASSWORD = "boss";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Ghalat password bhai! Tu admin nahi hai.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'info', message: 'Adding game to database...' });

    const { error } = await supabase
      .from('games')
      .insert([{ title, category, thumbnail_url: thumbnailUrl, iframe_url: iframeUrl }]);

    if (error) {
      setStatus({ type: 'error', message: `Failed: ${error.message}` });
    } else {
      setStatus({ type: 'success', message: '🎉 Game Added Successfully!' });
      setTitle(''); setCategory(''); setThumbnailUrl(''); setIframeUrl('');
    }
    setLoading(false);
  };

  // 🔒 AGAR LOGIN NAHI HAI TOH YEH SCREEN DIKHEGI
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#050511] flex items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md bg-[#0a0a1a] border border-gray-800 rounded-3xl p-8 text-center shadow-[0_0_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-fuchsia-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Admin Access
          </h2>
          <p className="text-gray-400 mb-8 text-sm">Enter the secret passcode to add games.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter Passcode..."
              className="w-full bg-[#121220] border border-gray-700 text-center text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-all tracking-widest"
            />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              Unlock Dashboard
            </button>
          </form>
          
          <Link href="/" className="block mt-6 text-sm text-gray-500 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // 🔓 AGAR LOGIN HO GAYA TOH YEH ASLI FORM DIKHEGA
  return (
    <main className="min-h-screen bg-[#050511] text-white p-6 md:p-12 font-sans flex items-center justify-center">
      <div className="w-full max-w-2xl bg-[#0a0a1a] border border-gray-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(192,38,211,0.1)] relative">
        <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-fuchsia-400 mb-6 font-semibold">
          <span className="mr-2">←</span> Back to Arcade
        </Link>
        <h1 className="text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Add New Game
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Game Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-cyan-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Category</label>
              <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-cyan-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Thumbnail Image URL</label>
            <input type="url" required value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-fuchsia-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Game iframe URL</label>
            <input type="url" required value={iframeUrl} onChange={(e) => setIframeUrl(e.target.value)} className="w-full bg-[#121220] border border-gray-700 text-white px-4 py-3 rounded-xl focus:border-fuchsia-500 outline-none" />
          </div>

          {status.message && (
            <div className={`p-4 rounded-xl text-sm font-bold ${status.type === 'error' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
              {status.message}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl mt-4">
            {loading ? 'Publishing...' : 'Publish Game'}
          </button>
        </form>
      </div>
    </main>
  );
}