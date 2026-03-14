"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

// --- Types ---
interface Game { id: number; title: string; thumbnail_url: string; category: string; }

export default function Home() {
  const router = useRouter();
  // States: 'landing' | 'pairing' | 'splash' | 'dashboard'
  const [viewState, setViewState] = useState<'landing' | 'pairing' | 'splash' | 'dashboard'>('landing');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);

  // 🕹️ Navigation Logic
  const handleRemoteCommand = (cmd: string, currentList: Game[]) => {
    if (viewState !== 'dashboard') return;
    setSelectedIndex((prev) => {
      const cols = 4;
      const total = currentList.length;
      if (cmd === 'RIGHT') return (prev + 1) % total;
      if (cmd === 'LEFT') return (prev - 1 + total) % total;
      if (cmd === 'DOWN') return (prev + cols) < total ? prev + cols : prev;
      if (cmd === 'UP') return (prev - cols) >= 0 ? prev - cols : prev;
      if (cmd === 'SELECT') {
        const selectedGame = currentList[prev];
        if (selectedGame) router.push(`/game/${selectedGame.id}`);
      }
      return prev;
    });
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('games').select('*');
      if (data) { setGames(data); setFilteredGames(data); }
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCode(code);
      await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);

      const channel = supabase.channel(`room-${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${code}` }, 
        (payload: any) => {
          const status = payload.new.status;
          const cmd = payload.new.last_command;

          if (status === 'connected' && viewState === 'pairing') {
            setViewState('splash');
            setConnectedPlayers(['Player 1']); // Future: Multi-player logic
            setTimeout(() => setViewState('dashboard'), 3000); // 3 sec splash
          }
          if (cmd) setFilteredGames(list => { handleRemoteCommand(cmd, list); return list; });
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [viewState]);

  // --- RENDERING LOGIC ---

  // 1. Landing Screen
  if (viewState === 'landing') {
    return (
      <main className="h-screen bg-[#111] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-6xl font-black text-white mb-4">Playing games together<br/>has never been so easy</h1>
        <p className="text-gray-400 text-xl mb-10">Use your phones as controllers and start playing instantly</p>
        <button onClick={() => setViewState('pairing')} className="bg-[#1ed760] hover:bg-[#1fbb56] text-black px-12 py-5 rounded-full text-2xl font-black transition-all transform hover:scale-105 active:scale-95">
          Start playing now
        </button>
        <p className="mt-6 text-gray-500 font-bold">Start for free, get full access later.</p>
      </main>
    );
  }

  // 2. Pairing Screen (Split Screen)
  if (viewState === 'pairing') {
    return (
      <main className="h-screen flex bg-[#111]">
        {/* Left Side: Players Info */}
        <div className="flex-1 bg-blue-600 flex flex-col items-center justify-center p-12 relative overflow-hidden">
          <h2 className="text-4xl font-black text-white mb-12">Players</h2>
          <div className="flex gap-6">
             <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
                <span className="text-white/30 text-4xl">+</span>
             </div>
          </div>
          <p className="absolute bottom-10 text-white font-bold text-xl">Phones + Screen = Console</p>
        </div>
        {/* Right Side: Instructions */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 border-l border-white/5">
          <h3 className="text-3xl font-bold text-white mb-4">Connect your phones</h3>
          <p className="text-gray-400 mb-8 text-center text-lg">Open <span className="text-[#1ed760]">gameadda.com</span> on your phone<br/>and enter the code below:</p>
          <div className="bg-blue-900/20 border-2 border-blue-500 px-10 py-4 rounded-xl mb-8">
            <span className="text-white text-5xl font-mono font-black tracking-widest">{roomCode}</span>
          </div>
          <p className="text-gray-500 mb-4 font-bold uppercase tracking-widest">Or scan:</p>
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={200} />
          </div>
        </div>
      </main>
    );
  }

  // 3. Splash Screen (PS5 Style)
  if (viewState === 'splash') {
    return (
      <main className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
          <div className="text-5xl font-black tracking-tighter italic text-white mb-4">GAMEADDA</div>
          <div className="h-1 w-48 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,1)]"></div>
          <p className="text-blue-500 font-bold mt-6 tracking-[10px] uppercase text-xs">Initializing System</p>
        </div>
      </main>
    );
  }

  // 4. Dashboard (Final Gaming Panel)
  return (
    <main className="h-screen bg-[#050511] overflow-hidden flex flex-col">
       {/* Featured Game Area */}
       <div className="relative h-[70%] w-full">
          <img src={filteredGames[selectedIndex]?.thumbnail_url} className="w-full h-full object-cover opacity-40 blur-sm absolute inset-0 transition-all duration-1000" />
          <div className="relative z-10 flex flex-col justify-end h-full p-20 bg-gradient-to-t from-[#050511] to-transparent">
             <span className="text-cyan-400 font-bold uppercase tracking-widest mb-2">Featured Game</span>
             <h1 className="text-7xl font-black text-white mb-6 uppercase italic">{filteredGames[selectedIndex]?.title}</h1>
             <button className="bg-white text-black px-10 py-4 rounded-xl font-black text-xl w-fit">Play Now</button>
          </div>
       </div>
       {/* Games List (Bottom Row) */}
       <div className="h-[30%] px-20 flex items-center gap-8 overflow-x-hidden">
          {filteredGames.map((game, idx) => (
            <div key={game.id} className={`min-w-[280px] h-40 rounded-3xl overflow-hidden border-4 transition-all duration-300 ${selectedIndex === idx ? 'border-cyan-400 scale-110 shadow-2xl' : 'border-transparent opacity-50'}`}>
               <img src={game.thumbnail_url} className="w-full h-full object-cover" />
            </div>
          ))}
       </div>
    </main>
  );
}