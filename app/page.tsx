"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface Game { id: number; title: string; thumbnail_url: string; category: string; }

export default function Home() {
  const router = useRouter();
  const [viewState, setViewState] = useState<'home' | 'pairing' | 'splash' | 'dashboard'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isControllerConnected, setIsControllerConnected] = useState(false);

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

          // 🔄 Fix Loop: Sirf pairing state mein ho tabhi splash par jao
          if (status === 'connected' && !isControllerConnected) {
            setIsControllerConnected(true);
            setViewState('splash');
            setTimeout(() => setViewState('dashboard'), 3000);
          }

          if (cmd && viewState === 'dashboard') {
             handleRemoteCommand(cmd);
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [viewState, isControllerConnected]);

  const handleRemoteCommand = (cmd: string) => {
    setSelectedIndex((prev) => {
      const cols = 4;
      const total = games.length;
      if (cmd === 'RIGHT') return (prev + 1) % total;
      if (cmd === 'LEFT') return (prev - 1 + total) % total;
      if (cmd === 'DOWN') return (prev + cols) < total ? prev + cols : prev;
      if (cmd === 'UP') return (prev - cols) >= 0 ? prev - cols : prev;
      if (cmd === 'SELECT') {
        const selectedGame = games[prev];
        if (selectedGame) router.push(`/game/${selectedGame.id}`);
      }
      return prev;
    });
  };

  // --- UI SECTIONS ---

  // 1. Splash Screen (PS5 Style Animation with YOUR logo)
  if (viewState === 'splash') {
    return (
      <main className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
           <div className="text-5xl font-extrabold tracking-tighter mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="h-1 w-48 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
          <p className="text-cyan-500 font-bold mt-6 tracking-[10px] uppercase text-[10px]">Connecting DualSense...</p>
        </div>
      </main>
    );
  }

  // 2. Pairing Screen (Split Screen like AirConsole)
  if (viewState === 'pairing') {
    return (
      <main className="h-screen flex bg-[#050511]">
        <div className="flex-1 bg-gradient-to-br from-blue-700 to-blue-900 flex flex-col items-center justify-center p-12 text-white">
           <h2 className="text-4xl font-black mb-8 italic">PLAYERS</h2>
           <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center text-4xl opacity-50">+</div>
           <p className="mt-12 font-bold tracking-widest uppercase text-sm opacity-60 text-center">Your phone is the controller</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-l border-white/5">
          <h3 className="text-2xl font-bold mb-4">Pair Your Device</h3>
          <p className="text-gray-400 mb-8 text-center">Open <span className="text-cyan-400">gameadda.com</span> on your phone<br/>and enter this code:</p>
          <div className="bg-[#121220] border-2 border-cyan-500 px-10 py-4 rounded-2xl mb-8">
            <span className="text-white text-5xl font-black tracking-[10px]">{roomCode}</span>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-2xl">
            <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={180} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-[#050511] text-white font-sans ${viewState === 'dashboard' ? 'bg-black' : ''}`}>
      
      {/* 🌟 YOUR ORIGINAL NAVBAR */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800 transition-all ${viewState === 'dashboard' ? '-translate-y-full' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold text-white">Login / Join</Link>
          </div>
        </div>
      </nav>

      {/* 🚀 YOUR ORIGINAL HERO SECTION */}
      {viewState === 'home' && (
        <section className="relative max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            Play Instantly. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">Zero Downloads.</span>
          </h1>
          <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mb-12">Turn your phone into a PS5 controller and play directly in your browser.</p>
          
          <button 
            onClick={() => setViewState('pairing')}
            className="bg-[#1ed760] text-black px-12 py-5 rounded-full text-2xl font-black shadow-[0_0_30px_rgba(30,215,96,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            Start playing now
          </button>
        </section>
      )}

      {/* 🎮 GAMING DASHBOARD (Only visible after pairing) */}
      <section className={`max-w-7xl mx-auto px-6 pb-24 transition-all duration-1000 ${viewState === 'dashboard' ? 'pt-20 opacity-100' : 'pt-10 opacity-100'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredGames.map((game, index) => (
            <div 
              key={game.id} 
              className={`group relative bg-[#121220] rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${selectedIndex === index ? 'border-cyan-400 scale-105 shadow-[0_0_50px_rgba(6,182,212,0.4)] ring-4 ring-cyan-500/20' : 'border-gray-800'}`}
            >
              <img src={game.thumbnail_url} className="h-56 w-full object-cover" />
              <div className="p-6">
                <h3 className="text-xl font-bold truncate mb-4">{game.title}</h3>
                <div className={`text-center py-4 rounded-2xl font-black text-xs uppercase ${selectedIndex === index ? 'bg-cyan-500' : 'bg-gray-800 text-gray-500'}`}>Play Now</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}