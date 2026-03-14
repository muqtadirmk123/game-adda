"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [remoteState, setRemoteState] = useState<'connecting' | 'lobby' | 'controller'>('connecting');
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code);
      handleConnectToLobby(code);
    }
  }, [searchParams]);

  const handleConnectToLobby = async (code: string) => {
    const { data } = await supabase.from('rooms').select('*').eq('room_code', code).single();
    if (data) {
      await supabase.from('rooms').update({ status: 'connected' }).eq('room_code', code);
      setRemoteState('lobby');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleStartGame = async () => {
    await supabase.from('rooms').update({ status: 'playing' }).eq('room_code', roomCode);
    setRemoteState('controller');
  };

  // 🔥 YAHAN MASLA THA - Ab ye fast aur accurate hai
  const sendCommand = async (command: string) => {
    if (remoteState !== 'controller') return;
    
    // Vibrate & button press effect
    if (navigator.vibrate) navigator.vibrate(50);
    setActiveBtn(command);
    setTimeout(() => setActiveBtn(null), 150); // Visual UI reset only
    
    // Database mein command aur current time bhej do (taake har click alag count ho)
    await supabase.from('rooms').update({ 
      last_command: command, 
      updated_at: new Date().toISOString() 
    }).eq('room_code', roomCode);
    
    // NOTE: Ab hum command ko 'null' nahi kar rahe taake desktop se miss na ho
  };

  if (remoteState === 'connecting') {
    return (
      <main className="fixed inset-0 bg-[#111] text-white flex flex-col items-center justify-center font-sans">
        <div className="animate-spin w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full mb-4"></div>
        <p className="font-bold tracking-widest text-xs uppercase">Connecting...</p>
      </main>
    );
  }

  if (remoteState === 'lobby') {
    return (
      <main className="fixed inset-0 bg-[#222] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-24 h-24 bg-[#1ed760] rounded-full flex items-center justify-center text-4xl font-black text-black mb-4 shadow-xl">A</div>
        <h2 className="text-xl font-black tracking-widest uppercase mb-12">PLAYER 1</h2>
        <button onClick={handleStartGame} className="w-full max-w-xs bg-[#1ed760] text-black py-4 rounded-full font-black text-2xl active:scale-95 transition-transform">
          Yes, I'm Ready
        </button>
      </main>
    );
  }

  // 📱 PERFECT MOBILE UI LOGIC
  return (
    <main className="fixed inset-0 bg-[#e2e2e7] flex flex-row items-center justify-between px-4 sm:px-10 touch-none select-none overflow-hidden font-sans">
      
      {/* LEFT: D-PAD */}
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0">
        <div className="w-full h-full bg-black/5 p-2 rounded-full shadow-inner border border-black/5">
           <div className="relative w-full h-full">
             <button onTouchStart={() => sendCommand('UP')} className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'UP' ? 'bg-blue-300 scale-90' : 'bg-white shadow-md'}`}>▲</button>
             <button onTouchStart={() => sendCommand('LEFT')} className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'LEFT' ? 'bg-blue-300 scale-90' : 'bg-white shadow-md'}`}>◀</button>
             <button onTouchStart={() => sendCommand('RIGHT')} className={`absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'RIGHT' ? 'bg-blue-300 scale-90' : 'bg-white shadow-md'}`}>▶</button>
             <button onTouchStart={() => sendCommand('DOWN')} className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'DOWN' ? 'bg-blue-300 scale-90' : 'bg-white shadow-md'}`}>▼</button>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black/10 rounded-full"></div>
           </div>
        </div>
      </div>

      {/* CENTER: TOUCHPAD */}
      <div className="flex-1 flex flex-col items-center justify-start h-full pt-2">
        <div className="w-[80%] max-w-[180px] h-16 sm:h-20 bg-[#f0f0f5] border-x-4 border-b-8 border-black/5 rounded-b-[2.5rem] flex items-end justify-center pb-2 shadow-sm">
          <div className="w-12 h-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
        </div>
        <div className="text-[9px] font-black opacity-30 mt-3 tracking-[5px] uppercase italic text-center">DualSense</div>
      </div>

      {/* RIGHT: ACTION BUTTONS */}
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0">
        <div className="relative w-full h-full p-2">
           <button onTouchStart={() => sendCommand('Y')} className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${activeBtn === 'Y' ? 'bg-blue-600 text-white scale-90' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>△</button>
           <button onTouchStart={() => sendCommand('X')} className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${activeBtn === 'X' ? 'bg-blue-600 text-white scale-90' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>□</button>
           <button onTouchStart={() => sendCommand('B')} className={`absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${activeBtn === 'B' ? 'bg-blue-600 text-white scale-90' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>○</button>
           <button onTouchStart={() => sendCommand('SELECT')} className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-black italic transition-all ${activeBtn === 'SELECT' ? 'bg-blue-800 scale-90' : 'bg-blue-600 text-white shadow-xl'}`}>✕</button>
        </div>
      </div>

    </main>
  );
}

export default function Remote() { return <Suspense fallback={<div className="h-screen bg-[#111]" />}><RemoteController /></Suspense>; }