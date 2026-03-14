"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

// --- Inner Component that uses searchParams ---
function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Auto-Connect Logic via QR URL
  useEffect(() => {
    const codeFromURL = searchParams.get('code');
    const autoConnect = searchParams.get('auto');

    if (codeFromURL) {
      setRoomCode(codeFromURL);
      if (autoConnect === 'true') {
        handleAutoConnect(codeFromURL);
      }
    }
  }, [searchParams]);

  const handleAutoConnect = async (code: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', code)
      .single();

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
      (screen.orientation as any).lock('landscape').catch(() => {
        console.log("Landscape lock failed, user might need to rotate manually.");
      });
    }
  };

  const sendCommand = async (command: string) => {
    if (!isConnected) return;

    if (navigator.vibrate) {
      navigator.vibrate(50); 
    }

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
      <main className="min-h-screen bg-[#050511] text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-black mb-6 text-cyan-400">GAMEADDA REMOTE</h1>
          <input 
            type="text" 
            placeholder="Room Code" 
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full bg-[#121220] border-2 border-gray-800 rounded-2xl p-5 text-center text-2xl font-bold mb-6 focus:border-cyan-500 outline-none"
          />
          <button 
            onClick={() => handleAutoConnect(roomCode)}
            className="w-full bg-cyan-600 py-4 rounded-2xl font-black text-xl shadow-lg"
          >
            {loading ? 'LINKING...' : 'CONNECT'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050511] text-white flex items-center justify-between p-8 font-sans touch-none select-none overflow-hidden">
      
      {/* Left Side: D-PAD */}
      <div className="relative w-48 h-48 grid grid-cols-3 grid-rows-3 gap-2">
        <div /> 
        <button onTouchStart={() => sendCommand('UP')} className="bg-gray-800/50 border-2 border-gray-700 rounded-2xl flex items-center justify-center text-2xl active:bg-cyan-500">▲</button>
        <div />
        
        <button onTouchStart={() => sendCommand('LEFT')} className="bg-gray-800/50 border-2 border-gray-700 rounded-2xl flex items-center justify-center text-2xl active:bg-cyan-500">◀</button>
        <div className="bg-gray-900 rounded-full border border-gray-800" />
        <button onTouchStart={() => sendCommand('RIGHT')} className="bg-gray-800/50 border-2 border-gray-700 rounded-2xl flex items-center justify-center text-2xl active:bg-cyan-500">▶</button>
        
        <div />
        <button onTouchStart={() => sendCommand('DOWN')} className="bg-gray-800/50 border-2 border-gray-700 rounded-2xl flex items-center justify-center text-2xl active:bg-cyan-500">▼</button>
        <div />
      </div>

      {/* Center: Info */}
      <div className="text-center">
        <div className="text-[10px] font-bold text-gray-600 tracking-[5px] uppercase mb-2">Connected</div>
        <div className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-4 py-1 rounded-full border border-cyan-400/20">{roomCode}</div>
      </div>

      {/* Right Side: ACTION BUTTONS */}
      <div className="flex gap-6 items-center">
        <button 
          onTouchStart={() => sendCommand('B')} 
          className="w-24 h-24 bg-red-600/20 border-4 border-red-600 rounded-full flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-90 transition-transform"
        >
          B
        </button>
        <button 
          onTouchStart={() => sendCommand('A')} 
          className="w-28 h-28 bg-green-600/20 border-4 border-green-600 rounded-full flex items-center justify-center font-black text-3xl shadow-[0_0_30px_rgba(22,163,74,0.3)] active:scale-90 transition-transform"
        >
          A
        </button>
      </div>

    </main>
  );
}

// --- Main Export with Suspense Boundary ---
export default function Remote() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050511] flex items-center justify-center text-cyan-400 font-bold uppercase tracking-widest">
        Initializing Game Controller...
      </div>
    }>
      <RemoteController />
    </Suspense>
  );
}