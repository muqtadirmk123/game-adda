"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [remoteState, setRemoteState] = useState<'connecting' | 'lobby' | 'controller'>('connecting');
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const [playerName, setPlayerName] = useState('Player 1');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('ga_playerName');
    if (savedName) setPlayerName(savedName);

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, []);

  // 🚪 INSTANT DISCONNECT JAB CHROME BAND HO
  useEffect(() => {
    const handleUnload = () => {
      if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'command', payload: { command: 'DISCONNECT' } });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('ga_playerName', newName);
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'ping', payload: { playerName: newName } });
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code);
      handleConnectToLobby(code);

      const channel = supabase.channel(`room-${code}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          channel.send({ type: 'broadcast', event: 'join', payload: { playerName } });
        }
      });
      return () => { supabase.removeChannel(channel); };
    }
  }, [searchParams]);

  // 🫀 Fast Heartbeat every 5 seconds
  useEffect(() => {
    if (remoteState !== 'connecting') {
      const pingInterval = setInterval(() => {
        if (channelRef.current) {
          channelRef.current.send({ type: 'broadcast', event: 'ping', payload: { playerName } });
        }
      }, 5000);
      return () => clearInterval(pingInterval);
    }
  }, [remoteState, playerName]);

  const handleConnectToLobby = async (code: string) => {
    const { data } = await supabase.from('rooms').select('*').eq('room_code', code).single();
    if (data) {
      await supabase.from('rooms').update({ status: 'connected' }).eq('room_code', code);
      setRemoteState('lobby');
    }
  };

  const handleStartGame = async () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'start_game', payload: {} });
    }
    setRemoteState('controller');
  };

  const sendCommand = (command: string) => {
    if (remoteState !== 'controller') return;
    
    if (navigator.vibrate) navigator.vibrate(40);
    setActiveBtn(command);
    setTimeout(() => setActiveBtn(null), 150);
    
    if (command === 'MUTE') setIsMuted(!isMuted);

    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'command', payload: { command, playerName } });
    }
  };

  if (remoteState === 'connecting') {
    return (
      <main className="fixed inset-0 bg-[#111] text-white flex flex-col items-center justify-center font-sans">
        <div className="animate-spin w-10 h-10 border-4 border-[#1ed760] border-t-transparent rounded-full mb-4"></div>
      </main>
    );
  }

  if (remoteState === 'lobby') {
    return (
      <main className="fixed inset-0 bg-[#1a1a1a] text-white flex flex-col items-center justify-between py-20 px-6 font-sans touch-none">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 bg-[#42a82a] rounded-full flex items-center justify-center text-6xl font-black text-white mb-4 shadow-[0_0_30px_rgba(66,168,42,0.4)] uppercase">
            {playerName.charAt(0)}
          </div>
          
          <div className="flex items-center gap-2 mt-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            <input 
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="bg-transparent text-xl font-bold tracking-widest uppercase outline-none text-center w-32"
              maxLength={10}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center">
           <p className="text-xl mb-12">Wait for more players to join</p>
           <p className="text-sm font-bold mb-4">Has everyone joined?</p>
           <button onClick={handleStartGame} className="w-full max-w-xs bg-[#00e676] text-black py-4 rounded-full font-black text-xl hover:bg-[#00c853] active:scale-95 transition-all">
             Yes
           </button>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#1c1c1c] text-white flex flex-col items-center justify-between py-10 px-4 touch-none select-none overflow-hidden font-sans">
      
      <div className="flex flex-col items-center">
        <div className="text-[#00e676] mb-4">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div className="w-24 h-24 bg-[#42a82a] rounded-full flex items-center justify-center text-5xl font-black text-white shadow-xl border-4 border-[#222] uppercase">
          {playerName.charAt(0)}
        </div>
        <div className="flex items-center gap-2 mt-3 bg-[#111] px-4 py-1 rounded-full border border-[#333]">
          <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>
          <input 
            type="text"
            value={playerName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="bg-transparent text-sm font-bold tracking-widest uppercase outline-none text-center w-24 text-white"
            maxLength={10}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 w-full px-4 border-y border-[#333] py-4 bg-[#111]/30">
        <button onTouchStart={() => sendCommand('SEARCH')} className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center active:bg-white/20 transition-colors border border-[#444]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
        <button onTouchStart={() => sendCommand('HOME')} className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center active:bg-white/20 transition-colors border border-[#444]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></button>
        <button onTouchStart={() => sendCommand('FAV')} className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center active:bg-white/20 transition-colors border border-[#444]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
        <button onTouchStart={() => sendCommand('MUTE')} className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center active:bg-white/20 transition-colors border border-[#444]">
          {isMuted ? (
             <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          ) : (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.899a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          )}
        </button>
      </div>

      <div className="relative w-64 h-64 bg-[#2a2a2a] rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)] border-[6px] border-[#222] my-4">
        <button onTouchStart={() => sendCommand('UP')} className={`absolute top-0 left-1/4 w-1/2 h-[35%] rounded-t-full flex items-start justify-center pt-4 transition-all ${activeBtn === 'UP' ? 'bg-white/10' : ''}`}><div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-gray-400"></div></button>
        <button onTouchStart={() => sendCommand('DOWN')} className={`absolute bottom-0 left-1/4 w-1/2 h-[35%] rounded-b-full flex items-end justify-center pb-4 transition-all ${activeBtn === 'DOWN' ? 'bg-white/10' : ''}`}><div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-gray-400"></div></button>
        <button onTouchStart={() => sendCommand('LEFT')} className={`absolute left-0 top-1/4 w-[35%] h-1/2 rounded-l-full flex items-center justify-start pl-4 transition-all ${activeBtn === 'LEFT' ? 'bg-white/10' : ''}`}><div className="w-0 h-0 border-y-[8px] border-r-[12px] border-y-transparent border-r-gray-400"></div></button>
        <button onTouchStart={() => sendCommand('RIGHT')} className={`absolute right-0 top-1/4 w-[35%] h-1/2 rounded-r-full flex items-center justify-end pr-4 transition-all ${activeBtn === 'RIGHT' ? 'bg-white/10' : ''}`}><div className="w-0 h-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-gray-400"></div></button>
        <button onTouchStart={() => sendCommand('SELECT')} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#1c1c1c] border-4 border-[#222] shadow-inner flex items-center justify-center transition-all ${activeBtn === 'SELECT' ? 'bg-[#333] scale-95' : ''}`}>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
        </button>
      </div>

      <div className="flex gap-4 mb-2">
         <button onTouchStart={() => sendCommand('Y')} className="w-14 h-14 bg-[#2a2a2a] text-yellow-500 rounded-full font-bold shadow-lg border-b-4 border-[#111] active:border-b-0 active:translate-y-1">Y</button>
         <button onTouchStart={() => sendCommand('X')} className="w-14 h-14 bg-[#2a2a2a] text-blue-500 rounded-full font-bold shadow-lg border-b-4 border-[#111] active:border-b-0 active:translate-y-1">X</button>
         <button onTouchStart={() => sendCommand('A')} className="w-14 h-14 bg-[#2a2a2a] text-green-500 rounded-full font-bold shadow-lg border-b-4 border-[#111] active:border-b-0 active:translate-y-1">A</button>
         <button onTouchStart={() => sendCommand('B')} className="w-14 h-14 bg-[#2a2a2a] text-red-500 rounded-full font-bold shadow-lg border-b-4 border-[#111] active:border-b-0 active:translate-y-1">B</button>
      </div>
    </main>
  );
}

export default function Remote() { return <Suspense fallback={<div className="h-screen bg-[#111]" />}><RemoteController /></Suspense>; }