"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface Game { id: number; title: string; thumbnail_url: string; category: string; }

export default function Home() {
  const router = useRouter();
  const [viewState, setViewState] = useState<'home' | 'pairing' | 'splash' | 'dashboard'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // 🚀 REF USE KIYE HAIN TA KAY LOOP NA BANE
  const viewStateRef = useRef(viewState);
  const gamesRef = useRef(games);

  useEffect(() => { viewStateRef.current = viewState; }, [viewState]);
  useEffect(() => { gamesRef.current = games; }, [games]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('games').select('*');
      if (data) setGames(data);
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCode(code);
      await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);

      const channel = supabase.channel(`room-${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${code}` }, 
        (payload: any) => {
          const status = payload.new.status;
          const cmd = payload.new.last_command;

          // Jab mobile se 'Yes' dabayenge tab status 'playing' aayega
          if (status === 'playing' && viewStateRef.current === 'pairing') {
            setViewState('splash');
            setTimeout(() => setViewState('dashboard'), 3000);
          }

          // Controller Commands (Sirf dashboard par chalenge)
          if (cmd && viewStateRef.current === 'dashboard') {
             setSelectedIndex((prev) => {
               const list = gamesRef.current;
               const total = list.length;
               if (total === 0) return 0;
               if (cmd === 'RIGHT') return (prev + 1) % total;
               if (cmd === 'LEFT') return (prev - 1 + total) % total;
               if (cmd === 'SELECT' || cmd === 'A') {
                 const selectedGame = list[prev];
                 if (selectedGame) router.push(`/game/${selectedGame.id}`);
               }
               return prev;
             });
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [router]);

  // --- 1. PS5 SPLASH SCREEN ---
  if (viewState === 'splash') {
    return (
      <main className="h-screen bg-[#050511] flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <div className="text-6xl font-black tracking-tighter mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="h-1 w-64 bg-gray-900 rounded-full overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 animate-[progress_1.5s_infinite_linear]"></div>
          </div>
        </div>
      </main>
    );
  }

  // --- 2. AIRCONSOLE STYLE PAIRING SCREEN ---
  if (viewState === 'pairing') {
    return (
      <main className="h-screen flex bg-[#050511] font-sans">
        {/* Left Side: Players Lobby */}
        <div className="flex-1 bg-[#1875F0] flex flex-col items-center justify-center p-12 text-white relative">
           <h2 className="text-4xl font-black mb-12 capitalize drop-shadow-md">Players</h2>
           <div className="flex gap-6 items-center">
              {/* Waiting circle */}
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-white flex items-center justify-center opacity-70">
                 <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
           </div>
           <p className="absolute bottom-10 font-bold tracking-widest text-sm opacity-80">Phones + Screen = Console</p>
        </div>

        {/* Right Side: QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#222]">
          <h3 className="text-4xl font-black text-white mb-4">Connect your phones</h3>
          <p className="text-gray-400 mb-8 text-center text-lg">Open <span className="text-[#1ed760] font-bold">gameadda.com</span> on your phone<br/>and enter the code below:</p>
          <div className="border border-white/20 bg-black/50 px-10 py-4 rounded-2xl mb-10">
            <span className="text-[#1ed760] text-5xl font-mono font-black tracking-[10px]">{roomCode}</span>
          </div>
          <p className="text-gray-400 mb-4 uppercase text-xs tracking-widest font-bold">Or scan:</p>
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={200} />
          </div>
        </div>
      </main>
    );
  }

  // --- 3. PREMIUM AIRCONSOLE STYLE DASHBOARD ---
  if (viewState === 'dashboard') {
    const activeGame = games[selectedIndex];
    return (
      <main className="h-screen w-full bg-[#050511] font-sans overflow-hidden relative flex flex-col">
        {/* Background Image (Full Screen Blurred) */}
        <div className="absolute inset-0 z-0">
           <img src={activeGame?.thumbnail_url} className="w-full h-full object-cover opacity-80" />
           {/* Dark Gradient Overlay for text readability */}
           <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/70 to-[#111]/30"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/50 to-transparent"></div>
        </div>

        {/* Top Navbar Area */}
        <div className="relative z-10 w-full p-6 flex justify-between items-center">
           <div className="text-xl font-extrabold tracking-tighter text-white">
              <span className="text-cyan-400">Game</span>Adda
           </div>
           <div className="flex gap-4">
              <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-lg text-white font-bold flex items-center gap-2">
                 <span className="w-6 h-6 bg-[#1ed760] text-black rounded-full flex items-center justify-center text-xs">A</span>
                 AMK
              </div>
           </div>
        </div>

        {/* Middle Content: Featured Game Details */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-16 pb-10">
           <div className="max-w-2xl mb-6">
              <h4 className="text-white text-sm font-bold tracking-widest uppercase mb-2">Featured Game</h4>
              <h1 className="text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">{activeGame?.title}</h1>
              
              <div className="flex items-center gap-4 mb-6 text-yellow-400 text-lg">
                 ★★★★★ <span className="text-gray-300 text-sm font-medium">| {activeGame?.category}</span>
              </div>

              <button className="bg-white hover:bg-gray-200 text-black px-10 py-4 rounded-xl font-black text-xl flex items-center gap-3 transition-transform">
                 <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 Play now
              </button>
           </div>
        </div>

        {/* Bottom Carousel: Game Thumbnails */}
        <div className="relative z-10 h-48 px-16 pb-8 flex items-center gap-6 overflow-x-hidden">
           {games.map((game, idx) => (
             <div 
               key={game.id} 
               className={`relative min-w-[240px] h-36 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${selectedIndex === idx ? 'border-4 border-[#1ed760] scale-105' : 'border border-white/10 opacity-60 scale-95'}`}
             >
               <img src={game.thumbnail_url} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                 <p className="text-white font-bold text-sm truncate">{game.title}</p>
               </div>
             </div>
           ))}
        </div>
      </main>
    );
  }

  // --- 4. YOUR ORIGINAL LANDING PAGE ---
  return (
    <main className="min-h-screen bg-[#111] text-white font-sans">
      <nav className="sticky top-0 z-50 bg-[#111] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <Link href="/login" className="border border-white/20 px-6 py-2 rounded-full text-sm font-bold text-white hover:bg-white hover:text-black transition-colors">Login / Join</Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-32 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white">
          Playing games together<br />has never been so easy
        </h1>
        <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mb-12 font-medium">Use your phones as controllers<br/>and start playing instantly.</p>
        
        <button 
          onClick={() => setViewState('pairing')}
          className="bg-[#1ed760] text-black px-12 py-5 rounded-full text-2xl font-bold hover:scale-105 active:scale-95 transition-transform"
        >
          Start playing now
        </button>
        <p className="mt-8 text-gray-400 font-medium">Start for free, get full access later.</p>
      </section>
    </main>
  );
}