"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface Game {
  id: number;
  title: string;
  thumbnail_url: string;
  category: string;
}

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isControllerConnected, setIsControllerConnected] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // 🕹️ Navigation Logic
  const handleRemoteCommand = (cmd: string, currentList: Game[]) => {
    setSelectedIndex((prev) => {
      const cols = 4; 
      const total = currentList.length;
      if (total === 0) return 0;

      if (cmd === 'RIGHT') return (prev + 1) % total;
      if (cmd === 'LEFT') return (prev - 1 + total) % total;
      if (cmd === 'DOWN') return (prev + cols) < total ? prev + cols : prev;
      if (cmd === 'UP') return (prev - cols) >= 0 ? prev - cols : prev;
      if (cmd === 'SELECT') {
        const selectedGame = currentList[prev];
        if (selectedGame) setTimeout(() => router.push(`/game/${selectedGame.id}`), 100);
        return prev;
      }
      return prev;
    });
  };

  useEffect(() => {
    async function initData() {
      const { data, error } = await supabase.from('games').select('*');
      if (!error && data) {
        setGames(data);
        setFilteredGames(data);
        const uniqueCategories = Array.from(new Set(data.map((game: Game) => game.category)));
        setCategories(['All', ...uniqueCategories]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
      await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);

      const channel = supabase
        .channel(`room-${code}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${code}` }, 
        (payload: any) => {
          const cmd = payload.new.last_command;
          if (payload.new.status === 'connected') setIsControllerConnected(true);
          if (cmd) {
            setFilteredGames((latestList) => {
              handleRemoteCommand(cmd, latestList);
              return latestList;
            });
          }
        })
        .subscribe();

      setLoading(false);
      return () => { supabase.removeChannel(channel); };
    }
    initData();
  }, [router]);

  const handleFilter = (category: string) => {
    setActiveCategory(category);
    setSelectedIndex(0);
    if (category === 'All') setFilteredGames(games);
    else setFilteredGames(games.filter((game) => game.category === category));
  };

  return (
    <main className={`min-h-screen bg-[#050511] text-white font-sans transition-all duration-700 ${isControllerConnected ? 'bg-[#000000]' : ''}`}>
      
      {/* 🌟 Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800 transition-transform ${isControllerConnected ? '-translate-y-full opacity-0' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setShowQR(!showQR)} className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border border-gray-700 text-gray-400 hover:border-cyan-500">
              📱 Connect Controller
            </button>
            <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold text-white">Login / Join</Link>
          </div>
        </div>
      </nav>

      {/* 📡 QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6">
          <div className="bg-[#0a0a1a] border border-gray-800 p-8 rounded-3xl text-center max-w-sm w-full relative">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <h2 className="text-2xl font-black mb-2 text-cyan-400 uppercase">Pair Controller</h2>
            <div className="bg-white p-5 rounded-2xl inline-block mb-6"><QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={180} /></div>
            <div className="bg-[#121220] p-4 rounded-xl border border-gray-800 text-3xl font-black tracking-[10px] text-white">{roomCode}</div>
          </div>
        </div>
      )}

      {/* 🚀 Hero Section (Connected hone par chhip jayega) */}
      {!isControllerConnected && (
        <section className="relative max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Play Instantly. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">Zero Downloads.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-medium">Use your phone as a controller and dive into the arcade.</p>
        </section>
      )}

      {/* 🎮 Gaming Dashboard / Grid */}
      <section className={`max-w-7xl mx-auto px-6 pb-24 transition-all duration-700 ${isControllerConnected ? 'pt-24 scale-110' : 'pt-10'}`}>
        
        {/* Animated Console Header (Sirf connected hone par dikhega) */}
        {isControllerConnected && (
          <div className="flex flex-col items-center mb-16 animate-bounce">
            <div className="text-xs font-black tracking-[10px] text-cyan-500 mb-2 uppercase">Console Mode Active</div>
            <div className="h-1 w-32 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
          </div>
        )}

        <div className={`flex flex-wrap items-center justify-center gap-3 mb-12 ${isControllerConnected ? 'hidden' : ''}`}>
          {categories.map((category) => (
            <button key={category} onClick={() => handleFilter(category)} className={`px-6 py-2 rounded-full font-bold text-sm uppercase border ${activeCategory === category ? 'bg-cyan-500 border-transparent' : 'bg-[#121220] border-gray-800'}`}>{category}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredGames.map((game, index) => (
            <div key={game.id} className={`group relative bg-[#121220] rounded-3xl overflow-hidden border transition-all duration-500 ${selectedIndex === index ? 'border-cyan-400 scale-105 shadow-[0_0_40px_rgba(6,182,212,0.4)] ring-4 ring-cyan-500/20' : 'border-gray-800 opacity-60'}`}>
              <div className="relative h-52 overflow-hidden">
                <img src={game.thumbnail_url} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4"><span className="bg-black/80 text-[10px] font-bold text-cyan-400 px-3 py-1 rounded-full uppercase">{game.category}</span></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4 truncate">{game.title}</h3>
                <div className={`text-center py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] ${selectedIndex === index ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gray-800/50 text-gray-400'}`}>Play Now</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}