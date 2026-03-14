"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface Game { id: number; title: string; thumbnail_url: string; category: string; description?: string; }

export default function Home() {
  const router = useRouter();
  const [viewState, setViewState] = useState<'home' | 'pairing' | 'splash' | 'dashboard'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isControllerConnected, setIsControllerConnected] = useState(false);
  const hasShownSplash = useRef(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('games').select('*');
      if (data) { setGames(data); setFilteredGames(data); }
      
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
      await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);

      const channel = supabase.channel(`room-${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${code}` }, 
        (payload: any) => {
          const status = payload.new.status;
          const cmd = payload.new.last_command;

          // ✅ Fix Splash Loop: Only show splash if we haven't shown it yet
          if (status === 'connected' && !hasShownSplash.current) {
            hasShownSplash.current = true;
            setIsControllerConnected(true);
            setViewState('splash');
            setTimeout(() => setViewState('dashboard'), 3500);
          }

          if (cmd && hasShownSplash.current) {
             handleRemoteCommand(cmd);
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [router]);

  const handleRemoteCommand = (cmd: string) => {
    setSelectedIndex((prev) => {
      const total = games.length;
      if (total === 0) return 0;
      if (cmd === 'RIGHT') return (prev + 1) % total;
      if (cmd === 'LEFT') return (prev - 1 + total) % total;
      if (cmd === 'SELECT' || cmd === 'A') {
        const selectedGame = games[prev];
        if (selectedGame) router.push(`/game/${selectedGame.id}`);
      }
      return prev;
    });
  };

  // --- 1. PS5 STYLE SPLASH SCREEN ---
  if (viewState === 'splash') {
    return (
      <main className="h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <div className="text-6xl font-black tracking-tighter mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="h-1.5 w-64 bg-gray-900 rounded-full overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 animate-progress-fast"></div>
          </div>
          <p className="text-cyan-500/50 font-bold mt-8 tracking-[12px] uppercase text-[10px] animate-pulse">Initializing System...</p>
        </div>
        <style jsx>{`
          @keyframes progress-fast {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-progress-fast { animation: progress-fast 1.5s infinite linear; }
        `}</style>
      </main>
    );
  }

  // --- 2. AIRCONSOLE STYLE PAIRING ---
  if (viewState === 'pairing') {
    return (
      <main className="h-screen flex bg-[#050511] font-sans">
        <div className="flex-1 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 flex flex-col items-center justify-center p-12 text-white relative">
           <div className="absolute top-10 left-10 text-2xl font-black italic opacity-20">CONSOLE MODE</div>
           <h2 className="text-5xl font-black mb-12 italic tracking-tighter">PLAYERS</h2>
           <div className="flex gap-4">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center text-4xl animate-pulse">+</div>
           </div>
           <p className="mt-16 font-black tracking-[5px] uppercase text-xs opacity-50">Pair your phone to begin</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#0a0a1a]">
          <h3 className="text-3xl font-black text-white mb-2 uppercase italic">Connect Controller</h3>
          <p className="text-gray-500 mb-10 text-center font-medium">Scan the QR code or enter the digital key</p>
          <div className="bg-[#121220] border-2 border-cyan-500/30 px-12 py-6 rounded-[2rem] mb-10 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <span className="text-white text-6xl font-black tracking-[15px]">{roomCode}</span>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl scale-110">
            <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={200} />
          </div>
        </div>
      </main>
    );
  }

  // --- 3. PREMIUM GAMING DASHBOARD ---
  if (viewState === 'dashboard') {
    const activeGame = games[selectedIndex];
    return (
      <main className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative">
        {/* Background Image with Blur & Darken */}
        <div className="absolute inset-0 z-0">
           <img 
             src={activeGame?.thumbnail_url} 
             className="w-full h-full object-cover opacity-40 blur-2xl transition-all duration-1000 scale-110" 
           />
           <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black"></div>
        </div>

        {/* Content Top: Featured Game */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-20 pt-20">
           <div className="max-w-3xl">
              <span className="bg-cyan-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Featured Game</span>
              <h1 className="text-8xl font-black italic tracking-tighter uppercase mb-6 drop-shadow-2xl animate-in slide-in-from-left duration-700">
                {activeGame?.title}
              </h1>
              <p className="text-gray-300 text-xl max-w-xl mb-10 line-clamp-2 font-medium opacity-80">
                Experience high-octane gaming with {activeGame?.title}. Link your DualSense and dominate the arena.
              </p>
              <div className="flex items-center gap-6">
                 <button className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 hover:scale-105 transition-transform">
                   <span>PLAY NOW</span>
                   <span className="text-xs bg-black/10 px-2 py-1 rounded">✕</span>
                 </button>
                 <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-xs tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Controller Connected
                 </div>
              </div>
           </div>
        </div>

        {/* Bottom: Horizontal Scroll Games */}
        <div className="relative z-10 h-64 px-20 pb-10 flex items-end gap-8 overflow-x-hidden">
           {games.map((game, idx) => (
             <div 
               key={game.id} 
               className={`relative min-w-[320px] h-44 rounded-[2rem] overflow-hidden border-4 transition-all duration-500 ${selectedIndex === idx ? 'border-cyan-400 scale-110 shadow-[0_0_50px_rgba(6,182,212,0.4)]' : 'border-white/5 opacity-40 scale-95'}`}
             >
               <img src={game.thumbnail_url} className="w-full h-full object-cover" />
               <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 transition-opacity ${selectedIndex === idx ? 'opacity-100' : 'opacity-0'}`}>
                  <h3 className="font-black italic text-lg uppercase">{game.title}</h3>
               </div>
             </div>
           ))}
        </div>
      </main>
    );
  }

  // --- 4. ORIGINAL LANDING PAGE ---
  return (
    <main className="min-h-screen bg-[#050511] text-white font-sans">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold">Login / Join</Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight italic">
          Play Instantly. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">Zero Downloads.</span>
        </h1>
        <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mb-12 font-medium">Turn your phone into a DualSense controller and start playing in your browser.</p>
        <button 
          onClick={() => setViewState('pairing')}
          className="bg-[#1ed760] text-black px-14 py-6 rounded-full text-2xl font-black shadow-[0_0_40px_rgba(30,215,96,0.4)] hover:scale-105 active:scale-95 transition-all uppercase tracking-tighter"
        >
          Start playing now
        </button>
      </section>
    </main>
  );
}