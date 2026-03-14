"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const codeFromURL = searchParams.get('code');
    const autoConnect = searchParams.get('auto');
    if (codeFromURL) {
      setRoomCode(codeFromURL);
      if (autoConnect === 'true') handleAutoConnect(codeFromURL);
    }

    if (isConnected && roomCode) {
      const channel = supabase
        .channel(`room-${roomCode}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, 
        (payload: any) => {
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
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }
    setLoading(false);
  };

  const sendCommand = async (command: string) => {
    if (!isConnected) return;
    if (navigator.vibrate) navigator.vibrate(40);

    await supabase.from('rooms').update({ 
      last_command: command, 
      updated_at: new Date().toISOString() 
    }).eq('room_code', roomCode);

    setTimeout(async () => {
      await supabase.from('rooms').update({ last_command: null }).eq('room_code', roomCode);
    }, 50);
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#16161f] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-center">
          <h1 className="text-2xl font-black mb-8 italic tracking-tighter">DUALSENSE CONNECT</h1>
          <input type="text" placeholder="ENTER CODE" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-2xl p-5 text-center text-3xl font-mono mb-8 outline-none focus:border-blue-500 text-white uppercase" />
          <button onClick={() => handleAutoConnect(roomCode)} className="w-full bg-white text-black py-5 rounded-2xl font-black text-lg active:scale-95 transition-all">LINK CONTROLLER</button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-[#e2e2e7] text-black flex items-center justify-between px-10 font-sans touch-none select-none overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

      {/* 🕹️ Left Section: D-PAD */}
      <div className="flex flex-col items-center justify-center gap-4 h-full relative z-10">
         <div className="relative w-32 h-32 bg-black/5 rounded-3xl p-2 grid grid-cols-3 grid-rows-3 gap-1 shadow-inner">
            <div /> <button onTouchStart={() => sendCommand('UP')} className="w-full h-full bg-white shadow-sm rounded-lg flex items-center justify-center text-xs active:bg-blue-100 transition-colors">▲</button> <div />
            <button onTouchStart={() => sendCommand('LEFT')} className="w-full h-full bg-white shadow-sm rounded-lg flex items-center justify-center text-xs active:bg-blue-100 transition-colors">◀</button>
            <div className="bg-black/5 rounded-full" />
            <button onTouchStart={() => sendCommand('RIGHT')} className="w-full h-full bg-white shadow-sm rounded-lg flex items-center justify-center text-xs active:bg-blue-100 transition-colors">▶</button>
            <div /> <button onTouchStart={() => sendCommand('DOWN')} className="w-full h-full bg-white shadow-sm rounded-lg flex items-center justify-center text-xs active:bg-blue-100 transition-colors">▼</button> <div />
         </div>
         <div className="w-24 h-24 bg-[#d1d1d6] rounded-full shadow-inner flex items-center justify-center border-4 border-white">
            <div className="w-14 h-14 bg-[#2c2c2e] rounded-full shadow-2xl border-2 border-black/20"></div>
         </div>
      </div>

      {/* 🎮 Center: Touchpad & Branding */}
      <div className="flex flex-col items-center justify-center gap-4 h-full pt-6">
        <div className="w-56 h-28 bg-[#f0f0f5] border-x-4 border-b-4 border-black/5 rounded-b-[3.5rem] shadow-sm flex items-end justify-center pb-4">
            <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        </div>
        <div className="text-[8px] font-black text-black/20 tracking-[8px] uppercase italic text-center">Sony Interactive<br/>Entertainment</div>
      </div>

      {/* 🔘 Right Section: Actions */}
      <div className="flex flex-col items-center justify-center gap-4 h-full relative z-10">
        <div className="grid grid-cols-2 gap-3 p-2">
            <button onTouchStart={() => sendCommand('Y')} className="w-14 h-14 bg-[#2c2c2e] text-white/50 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-xl">△</button>
            <button onTouchStart={() => sendCommand('B')} className="w-14 h-14 bg-[#2c2c2e] text-white/50 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-xl">○</button>
            <button onTouchStart={() => sendCommand('X')} className="w-14 h-14 bg-[#2c2c2e] text-white/50 rounded-full font-bold shadow-xl active:bg-blue-600 flex items-center justify-center text-xl">□</button>
            <button onTouchStart={() => sendCommand('SELECT')} className="w-14 h-14 bg-blue-600 text-white rounded-full font-bold shadow-xl active:bg-blue-700 flex items-center justify-center text-xl italic">✕</button>
        </div>
         <div className="w-24 h-24 bg-[#d1d1d6] rounded-full shadow-inner flex items-center justify-center border-4 border-white">
            <div className="w-14 h-14 bg-[#2c2c2e] rounded-full shadow-2xl border-2 border-black/20"></div>
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