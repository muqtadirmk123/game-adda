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

  const sendCommand = async (command: string) => {
    if (remoteState !== 'controller') return;
    
    // Haptic Feedback & Visual Press
    if (navigator.vibrate) navigator.vibrate(50);
    setActiveBtn(command);
    setTimeout(() => setActiveBtn(null), 150);
    
    // Ultra-fast DB update
    await supabase.from('rooms').update({ 
      last_command: command, 
      updated_at: new Date().toISOString() 
    }).eq('room_code', roomCode);

    setTimeout(() => {
      supabase.from('rooms').update({ last_command: null }).eq('room_code', roomCode);
    }, 100);
  };

  if (remoteState === 'connecting') {
    return (
      <main className="fixed inset-0 bg-[#111] text-white flex flex-col items-center justify-center font-sans touch-none">
        <div className="animate-spin w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full mb-4"></div>
        <p className="font-bold tracking-widest text-xs uppercase">Connecting...</p>
      </main>
    );
  }

  if (remoteState === 'lobby') {
    return (
      <main className="fixed inset-0 bg-[#222] text-white flex flex-col items-center justify-center p-6 font-sans touch-none">
        <div className="w-24 h-24 bg-[#1ed760] rounded-full flex items-center justify-center text-4xl font-black text-black mb-4 shadow-xl">A</div>
        <h2 className="text-xl font-black tracking-widest uppercase mb-12">PLAYER 1</h2>
        <p className="text-lg font-medium mb-6">Ready to play?</p>
        <button onClick={handleStartGame} className="w-full max-w-xs bg-[#1ed760] text-black py-4 rounded-full font-black text-2xl active:scale-95 transition-transform">
          Start Console
        </button>
      </main>
    );
  }

  // CONTROLLER STATE (Absolute Positioning - Foolproof Layout)
  return (
    <main className="fixed inset-0 bg-[#e2e2e7] touch-none select-none overflow-hidden font-sans">
      
      {/* LEFT: D-PAD (Fixed to left center) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-48 h-48 bg-black/5 p-2 rounded-full shadow-inner border border-black/5">
        <div className="relative w-full h-full">
          <button onTouchStart={() => sendCommand('UP')} className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'UP' ? 'bg-blue-300 scale-95' : 'bg-white shadow-md'}`}>▲</button>
          <button onTouchStart={() => sendCommand('LEFT')} className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'LEFT' ? 'bg-blue-300 scale-95' : 'bg-white shadow-md'}`}>◀</button>
          <button onTouchStart={() => sendCommand('RIGHT')} className={`absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'RIGHT' ? 'bg-blue-300 scale-95' : 'bg-white shadow-md'}`}>▶</button>
          <button onTouchStart={() => sendCommand('DOWN')} className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all ${activeBtn === 'DOWN' ? 'bg-blue-300 scale-95' : 'bg-white shadow-md'}`}>▼</button>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/10 rounded-full"></div>
        </div>
      </div>

      {/* CENTER: Touchpad (Fixed to top center) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-[#f0f0f5] border-x-4 border-b-8 border-black/5 rounded-b-[3rem] flex items-end justify-center pb-4 shadow-sm">
        <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
      </div>
      <div className="absolute top-28 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-20 tracking-[8px] uppercase italic">DualSense</div>

      {/* RIGHT: SHAPES (Fixed to right center) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-48 h-48">
        <div className="relative w-full h-full">
          <button onTouchStart={() => sendCommand('Y')} className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${activeBtn === 'Y' ? 'bg-blue-600 text-white scale-95' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>△</button>
          <button onTouchStart={() => sendCommand('X')} className={`absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${activeBtn === 'X' ? 'bg-blue-600 text-white scale-95' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>□</button>
          <button onTouchStart={() => sendCommand('B')} className={`absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all ${activeBtn === 'B' ? 'bg-blue-600 text-white scale-95' : 'bg-[#2c2c2e] text-white/50 shadow-xl'}`}>○</button>
          <button onTouchStart={() => sendCommand('SELECT')} className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black italic transition-all ${activeBtn === 'SELECT' ? 'bg-blue-800 scale-95' : 'bg-blue-600 text-white shadow-xl'}`}>✕</button>
        </div>
      </div>

    </main>
  );
}

export default function Remote() { return <Suspense fallback={<div className="h-screen bg-[#111]" />}><RemoteController /></Suspense>; }