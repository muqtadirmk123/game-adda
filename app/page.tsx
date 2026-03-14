"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface Game { id: number; title: string; thumbnail_url: string; category: string; }

export default function Home() {
  const router = useRouter();
  
  // States
  const [viewState, setViewState] = useState<'home' | 'pairing' | 'splash' | 'dashboard'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Refs to prevent loops
  const viewStateRef = useRef(viewState);
  const gamesRef = useRef(games);

  useEffect(() => { viewStateRef.current = viewState; }, [viewState]);
  useEffect(() => { gamesRef.current = games; }, [games]);

  useEffect(() => {
    async function init() {
      // Fetch Games
      const { data } = await supabase.from('games').select('*');
      if (data) {
        setGames(data);
        setFilteredGames(data);
        const uniqueCategories = Array.from(new Set(data.map((game: Game) => game.category)));
        setCategories(['All', ...uniqueCategories]);
      }

      // Check User
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // Setup Room
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCode(code);
      await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);

      // Realtime Listener
      const channel = supabase.channel(`room-${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${code}` }, 
        (payload: any) => {
          const status = payload.new.status;
          const cmd = payload.new.last_command;

          // Transition to Splash -> Dashboard when mobile clicks 'Yes'
          if (status === 'playing' && viewStateRef.current === 'pairing') {
            setViewState('splash');
            setTimeout(() => setViewState('dashboard'), 3000);
          }

          // Handle Controller Commands ONLY in Dashboard state
          if (cmd && viewStateRef.current === 'dashboard') {
             setSelectedIndex((prev) => {
               const list = gamesRef.current;
               const total = list.length;
               if (total === 0) return 0;
               
               if (cmd === 'RIGHT') return (prev + 1) % total;
               if (cmd === 'LEFT') return (prev - 1 + total) % total;
               if (cmd === 'SELECT') {
                 const selectedGame = list[prev];
                 if (selectedGame && selectedGame.id) {
                   router.push(`/game/${selectedGame.id}`);
                 } else {
                   setSystemError("GAME NOT AVAILABLE YET");
                   setTimeout(() => setSystemError(null), 3000);
                 }
               }
               return prev;
             });
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [router]);

  // Handle Original Homepage Filtering
  const handleFilter = (category: string) => {
    setActiveCategory(category);
    if (category === 'All') setFilteredGames(games);
    else setFilteredGames(games.filter((game) => game.category === category));
  };

  // --- ERROR TOAST ---
  const ErrorToast = () => {
    if (!systemError) return null;
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-red-600 text-white px-12 py-6 rounded-[2rem] font-black text-4xl tracking-widest shadow-[0_0_50px_rgba(220,38,38,0.8)] border-4 border-white animate-bounce text-center">
        ⚠️<br/>{systemError}
      </div>
    );
  };

  // ==========================================
  // STATE 1: SPLASH SCREEN (PS5 Style)
  // ==========================================
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

  // ==========================================
  // STATE 2: PAIRING SCREEN (AirConsole Style)
  // ==========================================
  if (viewState === 'pairing') {
    return (
      <main className="h-screen flex bg-[#050511] font-sans">
        <div className="flex-1 bg-[#1875F0] flex flex-col items-center justify-center p-12 text-white relative">
           <h2 className="text-4xl font-black mb-12 capitalize drop-shadow-md">Players</h2>
           <div className="w-24 h-24 rounded-full border-4 border-dashed border-white flex items-center justify-center opacity-70">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
           </div>
           <p className="absolute bottom-10 font-bold tracking-widest text-sm opacity-80">Phones + Screen = Console</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#222]">
          <h3 className="text-4xl font-black text-white mb-4">Connect your phones</h3>
          <p className="text-gray-400 mb-8 text-center text-lg">Open <span className="text-[#1ed760] font-bold">gameadda.com</span> on your phone<br/>and enter the code below:</p>
          <div className="border border-white/20 bg-black/50 px-10 py-4 rounded-2xl mb-10">
            <span className="text-[#1ed760] text-5xl font-mono font-black tracking-[10px]">{roomCode}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={200} />
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // STATE 3: PREMIUM DASHBOARD (Controlled by Phone)
  // ==========================================
  if (viewState === 'dashboard') {
    const activeGame = games[selectedIndex];
    return (
      <main className="h-screen w-full bg-[#050511] font-sans overflow-hidden relative flex flex-col">
        <ErrorToast />
        <div className="absolute inset-0 z-0">
           <img src={activeGame?.thumbnail_url} className="w-full h-full object-cover opacity-80 transition-all duration-500" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/70 to-[#111]/30"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/50 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full p-6 flex justify-between items-center">
           <div className="text-xl font-extrabold tracking-tighter text-white">
              <span className="text-cyan-400">Game</span>Adda
           </div>
           <div className="bg-black/50 border border-white/10 px-4 py-2 rounded-lg text-white font-bold flex items-center gap-2">
              <span className="w-6 h-6 bg-[#1ed760] text-black rounded-full flex items-center justify-center text-xs">A</span>
              P1 Connected
           </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-end px-16 pb-10">
           <div className="max-w-2xl mb-6">
              <h4 className="text-white text-sm font-bold tracking-widest uppercase mb-2">Featured Game</h4>
              <h1 className="text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">{activeGame?.title || 'Unknown Game'}</h1>
              <div className="flex items-center gap-4 mb-6 text-yellow-400 text-lg">
                 ★★★★★ <span className="text-gray-300 text-sm font-medium">| {activeGame?.category || 'Arcade'}</span>
              </div>
              <button className="bg-white text-black px-10 py-4 rounded-xl font-black text-xl flex items-center gap-3">
                 <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 Play now
              </button>
           </div>
        </div>

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

  // ==========================================
  // STATE 0: YOUR ORIGINAL HOMEPAGE
  // ==========================================
  return (
    <main className="min-h-screen bg-[#050511] text-white font-sans selection:bg-fuchsia-500">
      {/* 🌟 Original Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-cyan-400 hidden sm:inline-block font-mono border border-cyan-900 bg-cyan-900/20 px-3 py-1.5 rounded-full">{user.email}</span>
                <button onClick={() => supabase.auth.signOut()} className="bg-red-600/20 text-red-400 border border-red-600/50 px-5 py-2 rounded-full text-sm font-bold">Logout</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold text-white shadow-lg">Login / Join</Link>
            )}
          </div>
        </div>
      </nav>

      {/* 🚀 Original Hero Section + NEW BUTTON */}
      <section className="relative max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          Play Instantly. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">Zero Downloads.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-medium mb-10">
          Use your phone as a controller and dive into the arcade.
        </p>

        {/* 🟢 THE TRIGGER BUTTON */}
        <button 
          onClick={() => setViewState('pairing')}
          className="bg-[#1ed760] text-black px-12 py-5 rounded-full text-2xl font-black shadow-[0_0_30px_rgba(30,215,96,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-tighter mb-10"
        >
          Start playing now
        </button>
      </section>

      {/* 🎮 Original Game Grid & Filters */}
      <section className="max-w-7xl mx-auto px-6 pb-24 relative z-10 pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button 
              key={category} 
              onClick={() => handleFilter(category)} 
              className={`px-6 py-2 rounded-full font-bold text-sm uppercase transition-all border ${activeCategory === category ? 'bg-cyan-500 border-transparent text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-[#121220] border-gray-700 text-gray-400 hover:border-cyan-500'}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredGames.map((game) => (
            <div 
              key={game.id} 
              className="group relative bg-[#121220] rounded-3xl overflow-hidden border border-gray-800 transition-all duration-500 hover:border-cyan-400 hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]"
            >
              <div className="relative h-52 overflow-hidden">
                <img src={game.thumbnail_url} alt={game.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4"><span className="bg-black/80 backdrop-blur-md text-[10px] font-bold text-cyan-400 px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest">{game.category}</span></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4 truncate group-hover:text-cyan-400 transition-colors">{game.title}</h3>
                <Link href={`/game/${game.id}`} className="block w-full text-center py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all bg-gray-800/50 text-gray-400 group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:to-blue-600 group-hover:text-white">Play Game</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}