"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [remoteState, setRemoteState] = useState<'connecting' | 'lobby' | 'controller'>('connecting');

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
      // Just connect to the room, don't start the game yet.
      await supabase.from('rooms').update({ status: 'connected' }).eq('room_code', code);
      setRemoteState('lobby');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleStartGame = async () => {
    // This tells the desktop to move from Pairing to Splash/Dashboard
    await supabase.from('rooms').update({ status: 'playing' }).eq('room_code', roomCode);
    setRemoteState('controller');
  };

  const sendCommand = async (command: string) => {
    if (remoteState !== 'controller') return;
    if (navigator.vibrate) navigator.vibrate(40);
    
    await supabase.from('rooms').update({ 
      last_command: command, 
      updated_at: new Date().toISOString() 
    }).eq('room_code', roomCode);

    setTimeout(() => {
      supabase.from('rooms').update({ last_command: null }).eq('room_code', roomCode);
    }, 100);
  };

  // --- 1. CONNECTING STATE ---
  if (remoteState === 'connecting') {
    return (
      <main className="fixed inset-0 bg-[#111] text-white flex flex-col items-center justify-center p-6 font-sans touch-none">
        <div className="animate-spin w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full mb-4"></div>
        <p className="font-bold tracking-widest text-xs uppercase">Connecting to Room...</p>
      </main>
    );
  }

  // --- 2. LOBBY STATE (AirConsole Style "Wait for players") ---
  if (remoteState === 'lobby') {
    return (
      <main className="fixed inset-0 bg-[#222] text-white flex flex-col items-center justify-between py-16 px-6 font-sans touch-none overscroll-none">
        <div className="flex flex-col items-center mt-10">
          <div className="w-32 h-32 bg-[#1ed760] rounded-full flex items-center justify-center text-6xl font-black text-white mb-4 shadow-xl">
            A
          </div>
          <h2 className="text-2xl font-black tracking-widest uppercase">AMK</h2>
        </div>

        <div className="text-center">
           <p className="text-xl font-medium mb-12">Wait for more players to join</p>
           <p className="text-sm text-gray-400 mb-4 font-bold">Has everyone joined?</p>
           <button 
             onClick={handleStartGame}
             className="w-full max-w-xs bg-[#1ed760] text-black py-4 rounded-full font-black text-2xl active:scale-95 transition-transform"
           >
             Yes
           </button>
        </div>
      </main>
    );
  }

  // --- 3. CONTROLLER STATE (PS5 Style DualSense) ---
  return (
    <main className="fixed inset-0 bg-[#e2e2e7] flex items-center justify-between px-12 touch-none select-none overscroll-none font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>

      {/* LEFT: D-PAD */}
      <div className="flex flex-col gap-8 items-center z-10 w-[30%]">
        <div className="grid grid-cols-3 gap-2 bg-black/5 p-4 rounded-[2rem] shadow-inner border border-black/5 w-full aspect-square max-w-[180px]">
          <div /> 
          <button onTouchStart={() => sendCommand('UP')} className="w-full h-full bg-white shadow-md rounded-2xl flex items-center justify-center text-xl active:bg-blue-200 active:scale-95 transition-all">▲</button> 
          <div />
          
          <button onTouchStart={() => sendCommand('LEFT')} className="w-full h-full bg-white shadow-md rounded-2xl flex items-center justify-center text-xl active:bg-blue-200 active:scale-95 transition-all">◀</button>
          <div className="w-full h-full bg-black/10 rounded-full" />
          <button onTouchStart={() => sendCommand('RIGHT')} className="w-full h-full bg-white shadow-md rounded-2xl flex items-center justify-center text-xl active:bg-blue-200 active:scale-95 transition-all">▶</button>
          
          <div /> 
          <button onTouchStart={() => sendCommand('DOWN')} className="w-full h-full bg-white shadow-md rounded-2xl flex items-center justify-center text-xl active:bg-blue-200 active:scale-95 transition-all">▼</button> 
          <div />
        </div>
      </div>

      {/* CENTER: TOUCHPAD */}
      <div className="flex flex-col items-center justify-start h-full pt-4 w-[30%]">
        <div className="w-full max-w-[200px] h-24 bg-[#f0f0f5] border-x-4 border-b-8 border-black/5 rounded-b-[4rem] flex items-end justify-center pb-4 shadow-sm">
          <div className="w-16 h-1 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
        </div>
        <div className="text-[10px] font-black opacity-20 mt-6 tracking-[8px] uppercase italic text-center">DualSense</div>
      </div>

      {/* RIGHT: SHAPES */}
      <div className="flex flex-col gap-12 items-center z-10 w-[30%]">
        <div className="grid grid-cols-2 gap-4 p-4 w-full aspect-square max-w-[180px]">
          <button onTouchStart={() => sendCommand('Y')} className="w-full h-full bg-[#2c2c2e] text-white/50 rounded-full shadow-xl flex items-center justify-center text-2xl active:bg-blue-600 transition-colors">△</button>
          <button onTouchStart={() => sendCommand('B')} className="w-full h-full bg-[#2c2c2e] text-white/50 rounded-full shadow-xl flex items-center justify-center text-2xl active:bg-blue-600 transition-colors">○</button>
          <button onTouchStart={() => sendCommand('X')} className="w-full h-full bg-[#2c2c2e] text-white/50 rounded-full shadow-xl flex items-center justify-center text-2xl active:bg-blue-600 transition-colors">□</button>
          <button onTouchStart={() => sendCommand('SELECT')} className="w-full h-full bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-3xl italic font-black active:bg-blue-700 transition-all scale-110">✕</button>
        </div>
      </div>
    </main>
  );
}

export default function Remote() { return <Suspense fallback={<div className="h-screen bg-[#111]" />}><RemoteController /></Suspense>; }