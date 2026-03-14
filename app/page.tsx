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

  // 🕹️ Navigation Logic (Grid Aware)
  const handleRemoteCommand = (cmd: string, currentList: Game[]) => {
    setSelectedIndex((prev) => {
      const cols = 4; // Numbers of items per row on desktop
      const total = currentList.length;
      if (total === 0) return 0;

      if (cmd === 'RIGHT') return (prev + 1) % total;
      if (cmd === 'LEFT') return (prev - 1 + total) % total;
      if (cmd === 'DOWN') return (prev + cols) < total ? prev + cols : prev;
      if (cmd === 'UP') return (prev - cols) >= 0 ? prev - cols : prev;
      
      if (cmd === 'SELECT') {
        const selectedGame = currentList[prev];
        if (selectedGame) {
          setTimeout(() => router.push(`/game/${selectedGame.id}`), 100);
        }
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

      // 📡 Real-time Subscription
      const channel = supabase
        .channel(`room-${code}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `room_code=eq.${code}` 
        }, 
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
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  const handleFilter = (category: string) => {
    setActiveCategory(category);
    setSelectedIndex(0);
    if (category === 'All') setFilteredGames(games);
    else setFilteredGames(games.filter((game) => game.category === category));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <main className="min-h-screen bg-[#050511] text-white font-sans selection:bg-fuchsia-500">
      
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowQR(!showQR)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${isControllerConnected ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-700 text-gray-400 hover:border-cyan-500'}`}
            >
              {isControllerConnected ? '🎮 Connected' : '📱 Connect Controller'}
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-cyan-400 hidden sm:inline-block font-mono border border-cyan-900 bg-cyan-900/20 px-3 py-1.5 rounded-full">{user.email}</span>
                <button onClick={handleLogout} className="bg-red-600/20 text-red-400 border border-red-600/50 px-5 py-2 rounded-full text-sm font-bold">Logout</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold text-white transition-all shadow-lg hover:shadow-cyan-500/20">Login / Join</Link>
            )}
          </div>
        </div>
      </nav>

      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
          <div className="bg-[#0a0a1a] border border-white/5 p-10 rounded-[3rem] text-center max-w-sm w-full relative">
            <button onClick={() => setShowQR(false)} className="absolute top-6 right-8 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-black mb-2 text-cyan-400 uppercase italic tracking-tighter">DualSense Link</h2>
            <p className="text-gray-400 text-[10px] mb-8 font-black uppercase tracking-[4px]">Pair your mobile controller</p>
            <div className="bg-white p-6 rounded-3xl inline-block mb-8 shadow-[0_0_60px_rgba(6,182,212,0.3)] border-8 border-cyan-500/10">
              <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={180} />
            </div>
            <div className="bg-[#121220] p-5 rounded-2xl border border-gray-800">
              <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Digital Room ID</p>
              <p className="text-4xl font-black tracking-[12px] text-white">{roomCode}</p>
            </div>
          </div>
        </div>
      )}

      <section className="max-w-7xl mx-auto px-6 pb-24 pt-16">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          {categories.map((category) => (
            <button 
              key={category} 
              onClick={() => handleFilter(category)} 
              className={`px-8 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all border ${activeCategory === category ? 'bg-cyan-500 border-transparent text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] scale-105' : 'bg-[#121220] border-gray-800 text-gray-500 hover:border-cyan-500'}`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-fuchsia-500 shadow-[0_0_15px_rgba(192,38,211,0.5)]"></div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {filteredGames.map((game, index) => (
              <div 
                key={game.id} 
                className={`group relative bg-[#121220] rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${selectedIndex === index ? 'border-cyan-400 scale-105 shadow-[0_0_50px_rgba(6,182,212,0.4)] ring-4 ring-cyan-500/10' : 'border-gray-800'}`}
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={game.thumbnail_url} alt={game.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-5 right-5"><span className="bg-black/60 backdrop-blur-md text-[9px] font-black text-cyan-400 px-4 py-1.5 rounded-full border border-gray-700 uppercase tracking-[2px]">{game.category}</span></div>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-black mb-5 truncate group-hover:text-cyan-400 transition-colors italic tracking-tight">{game.title}</h3>
                  <Link href={`/game/${game.id}`} className={`block w-full text-center py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] transition-all ${selectedIndex === index ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700'}`}>Play Game</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}