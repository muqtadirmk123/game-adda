"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [battery] = useState('85%'); // Simulated for UI

  // 1. Auto-Connect & Rumble Listener
  useEffect(() => {
    const codeFromURL = searchParams.get('code');
    const autoConnect = searchParams.get('auto');

    if (codeFromURL) {
      setRoomCode(codeFromURL);
      if (autoConnect === 'true') {
        handleAutoConnect(codeFromURL);
      }
    }

    if (isConnected && roomCode) {
      const channel = supabase
        .channel(`room-${roomCode}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `room_code=eq.${roomCode}` 
        }, 
        (payload: any) => {
          // Rumble/Vibration logic: Agar desktop status 'vibrate' bhejta hai
          if (payload.new.status === 'vibrate' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); 
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [searchParams, isConnected, roomCode]);

  const handleAutoConnect = async (code: string) => {
    setLoading(true);
    const { data } = await supabase.from('rooms').select('*').eq('room_code', code).single();
    if (data) {
      await supabase.from('rooms').update({ status: 'connected' }).eq('room_code', code);
      setIsConnected(true);
      setupController();
    }
    setLoading(false);
  };

  const setupController = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (typeof screen.orientation !== 'undefined' && (screen.orientation as any).lock) {
      (screen.orientation as any).lock('landscape').catch(() => {});
    }
  };

  const sendCommand = async (command: string) => {
    if (!isConnected) return;
    if (navigator.vibrate) navigator.vibrate(40); // Soft haptic feedback

    await supabase
      .from('rooms')
      .update({ last_command: command, updated_at: new Date() })
      .eq('room_code', roomCode);

    setTimeout(async () => {
      await supabase.from('rooms').update({ last_command: null }).eq('room_code', roomCode);
    }, 50);
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-[#16161f] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl text-center">
          <h1 className="text-2xl font-black mb-8 italic tracking-tighter">DUALSENSE CONNECT</h1>
          <input 
            type="text" 
            placeholder="ENTER CODE" 
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-2xl p-5 text-center text-3xl font-mono mb-8 outline-none focus:border-blue-500 transition-all text-white uppercase"
          />
          <button 
            onClick={() => handleAutoConnect(roomCode)}
            className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg active:scale-95 transition-all"
          >
            {loading ? 'LINKING...' : 'LINK CONTROLLER'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#e2e2e7] text-black flex items-center justify-between px-16 font-sans touch-none select-none overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

      {/* 🔋 Status Bar (Battery & Signal) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-40">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            <span>Signal</span> 
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 h-1.5 bg-black rounded-full"></div>
              <div className="w-1 h-2 bg-black rounded-full"></div>
              <div className="w-1 h-3 bg-black rounded-full"></div>
            </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            <span>{battery}</span> 
            <div className="w-6 h-3 border-2 border-black rounded-sm p-0.5 flex items-center">
              <div className="h-full bg-black w-3/4"></div>
            </div>
        </div>
      </div>

      {/* 🕹️ Left: D-PAD & Analog */}
      <div className="flex flex-col gap-10 items-center z-10">
         <div className="grid grid-cols-3 gap-1 bg-black/5 p-2 rounded-2xl border border-black/5">
            <div /> <button onTouchStart={() => sendCommand('UP')} className="w-16 h-16 bg-white shadow-md rounded-xl flex items-center justify-center text-xl active:bg-blue-100 transition-colors">▲</button> <div />
            <button onTouchStart={() => sendCommand('LEFT')} className="w-16 h-16 bg-white shadow-md rounded-xl flex items-center justify-center text-xl active:bg-blue-100 transition-colors">◀</button>
            <div className="w-16 h-16 bg-black/10 rounded-full" />
            <button onTouchStart={() => sendCommand('RIGHT')} className="w-16 h-16 bg-white shadow-md rounded-xl flex items-center justify-center text-xl active:bg-blue-100 transition-colors">▶</button>
            <div /> <button onTouchStart={() => sendCommand('DOWN')} className="w-16 h-16 bg-white shadow-md rounded-xl flex items-center justify-center text-xl active:bg-blue-100 transition-colors">▼</button> <div />
         </div>
         <div className="w-32 h-32 bg-[#d1d1d6] rounded-full shadow-inner flex items-center justify-center border-4 border-white">
            <div className="w-16 h-16 bg-[#2c2c2e] rounded-full shadow-2xl border-2 border-black/20"></div>
         </div>
      </div>

      {/* 🎮 Center: PS5 Touchpad Style */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-64 h-32 bg-[#f0f0f5] border-x-4 border-b-4 border-black/5 rounded-b-[4rem] shadow-sm flex items-end justify-center pb-6">
            <div className="w-20 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        </div>
        <div className="flex gap-4">
            <div className="w-2 h-2 bg-black/10 rounded-full"></div>
            <div className="w-2 h-2 bg-black/10 rounded-full"></div>
            <div className="w-2 h-2 bg-black/10 rounded-full"></div>
        </div>
        <p className="text-[10px] font-black text-black/20 tracking-[10px] uppercase italic">DualSense Wireless</p>
      </div>

      {/* 🔘 Right: Action Buttons */}
      <div className="flex flex-col gap-10 items-center z-10">
        <div className="grid grid-cols-2 gap-5">
            <button onTouchStart={() => sendCommand('Y')} className="w-18 h-18 bg-[#2c2c2e] text-white/40 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-2xl">△</button>
            <button onTouchStart={() => sendCommand('B')} className="w-18 h-18 bg-[#2c2c2e] text-white/40 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-2xl">○</button>
            <button onTouchStart={() => sendCommand('X')} className="w-18 h-18 bg-[#2c2c2e] text-white/40 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-2xl">□</button>
            <button onTouchStart={() => sendCommand('SELECT')} className="w-18 h-18 bg-blue-600 text-white rounded-full font-bold shadow-xl active:bg-blue-700 flex items-center justify-center text-2xl italic">✕</button>
        </div>
         <div className="w-32 h-32 bg-[#d1d1d6] rounded-full shadow-inner flex items-center justify-center border-4 border-white">
            <div className="w-16 h-16 bg-[#2c2c2e] rounded-full shadow-2xl border-2 border-black/20"></div>
         </div>
      </div>
    </main>
  );
}

export default function Remote() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]"></div>}>
      <RemoteController />
    </Suspense>
  );
}