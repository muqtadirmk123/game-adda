"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function RemoteController() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [remoteState, setRemoteState] = useState<'connecting' | 'lobby' | 'controller'>('connecting');
  
  const [controllerUrl, setControllerUrl] = useState<string | null>(null); 
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const channelRef = useRef<any>(null);
  const deviceIdRef = useRef<string>('');

  useEffect(() => {
    const savedName = localStorage.getItem('ga_playerName');
    if (savedName) setPlayerName(savedName);

    let dId = localStorage.getItem('ga_deviceId');
    if (!dId) {
      dId = 'dev_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ga_deviceId', dId);
    }
    deviceIdRef.current = dId;

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (channelRef.current) {
        channelRef.current.send({ 
          type: 'broadcast', 
          event: 'command', 
          payload: { command: 'DISCONNECT', deviceId: deviceIdRef.current, playerName } 
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [playerName]);

  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('ga_playerName', newName);
    if (channelRef.current) {
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'ping', 
        payload: { playerName: newName, deviceId: deviceIdRef.current } 
      });
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code);
      handleConnectToLobby(code);

      const channel = supabase.channel(`room-${code}`)
        .on('broadcast', { event: 'set_controller' }, (payload) => {
          setControllerUrl(payload.payload.controller_url || null);
        });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          channel.send({ 
            type: 'broadcast', 
            event: 'join', 
            payload: { playerName, deviceId: deviceIdRef.current } 
          });
        }
      });
      return () => { supabase.removeChannel(channel); };
    }
  }, [searchParams, playerName]);

  useEffect(() => {
    if (remoteState !== 'connecting') {
      const pingInterval = setInterval(() => {
        if (channelRef.current) {
          channelRef.current.send({ 
            type: 'broadcast', 
            event: 'ping', 
            payload: { playerName, deviceId: deviceIdRef.current } 
          });
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
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'start_game', 
        payload: { deviceId: deviceIdRef.current } 
      });
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
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'command', 
        payload: { command, playerName, deviceId: deviceIdRef.current } 
      });
    }
  };

  const handleLeaveSession = () => {
    if (navigator.vibrate) navigator.vibrate(200); 
    if (channelRef.current) {
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'command', 
        payload: { command: 'DISCONNECT', deviceId: deviceIdRef.current, playerName } 
      });
    }
    window.location.href = '/'; 
  };

  if (remoteState === 'connecting') {
    return (
      <main className="fixed inset-0 bg-[#050511] text-white flex flex-col items-center justify-center font-sans">
        <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
      </main>
    );
  }

  if (remoteState === 'lobby') {
    return (
      <main className="fixed inset-0 bg-[#050511] text-white flex flex-col items-center justify-between py-12 px-6 font-sans touch-none relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full flex justify-end relative z-10">
          <button onClick={handleLeaveSession} className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest active:bg-red-500 active:text-white transition-all backdrop-blur-md">
            Leave Area
          </button>
        </div>

        {/* 🔥 Logo ka Size Bada Kar Diya (w-24 h-24) 🔥 */}
        <div className="absolute top-8 left-6 z-10">
           <img src="/logo.png" alt="GA" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
        </div>

        <div className="flex flex-col items-center relative z-10 mt-14">
          <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-full flex items-center justify-center text-6xl font-black text-white mb-8 shadow-[0_0_40px_rgba(6,182,212,0.4)] uppercase border-4 border-white/20">
            {playerName.charAt(0)}
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md">
            <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            <input 
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="bg-transparent text-xl font-bold tracking-widest uppercase outline-none text-center w-32 text-white"
              maxLength={10}
            />
          </div>
        </div>

        <div className="w-full flex flex-col items-center relative z-10 mt-12 mb-8">
           <p className="text-lg mb-8 text-gray-400 font-medium tracking-widest uppercase text-center">Waiting for command...</p>
           <button onClick={handleStartGame} className="w-full max-w-xs bg-gradient-to-r from-cyan-400 to-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-95 transition-all tracking-[2px]">
             ENTER ARCADE
           </button>
        </div>
      </main>
    );
  }

  if (controllerUrl) {
    return (
      <main className="fixed inset-0 w-full h-[100dvh] bg-black overflow-hidden touch-none relative">
        <iframe src={controllerUrl} className="w-full h-full border-none outline-none" allowFullScreen />
        <div className="absolute top-4 right-4 flex gap-3 z-50">
          <button onTouchStart={() => sendCommand('HOME')} className="bg-black/60 backdrop-blur-md text-white border border-white/20 p-3 rounded-full hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></button>
          <button onClick={handleLeaveSession} className="bg-red-600/80 backdrop-blur-md text-white border border-red-500 p-3 rounded-full hover:bg-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></button>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#050511] text-white flex flex-col items-center justify-between py-8 px-4 touch-none select-none overflow-hidden font-sans relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#050511] to-[#050511] pointer-events-none"></div>

      <div className="w-full flex justify-between items-center px-2 relative z-10">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md pr-5 rounded-full border border-white/10 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-xl font-black text-black uppercase shadow-inner">
            {playerName.charAt(0)}
          </div>
          <span className="text-xs font-black tracking-[3px] uppercase text-cyan-50">{playerName}</span>
        </div>
        <button onClick={handleLeaveSession} className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-3 rounded-full text-xs font-bold uppercase active:bg-red-500 active:text-white transition-all backdrop-blur-md">
          Leave
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 w-full px-4 border-y border-white/5 py-5 bg-white/[0.02] backdrop-blur-md mt-4 relative z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <button onTouchStart={() => sendCommand('SEARCH')} className="w-14 h-14 rounded-full bg-[#0a0a1a] flex items-center justify-center active:bg-cyan-900/50 transition-colors border border-white/10 shadow-lg text-gray-400 active:text-cyan-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
        <button onTouchStart={() => sendCommand('HOME')} className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] border-2 border-white/20"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg></button>
        <button onTouchStart={() => sendCommand('FAV')} className="w-14 h-14 rounded-full bg-[#0a0a1a] flex items-center justify-center active:bg-cyan-900/50 transition-colors border border-white/10 shadow-lg text-gray-400 active:text-cyan-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
        <button onTouchStart={() => sendCommand('MUTE')} className="w-14 h-14 rounded-full bg-[#0a0a1a] flex items-center justify-center active:bg-cyan-900/50 transition-colors border border-white/10 shadow-lg text-gray-400 active:text-cyan-400">
          {isMuted ? <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
          : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.899a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>}
        </button>
      </div>

      <div className="relative w-64 h-64 bg-[#0a0a1a] rounded-full shadow-[0_0_50px_rgba(6,182,212,0.15)] border-[4px] border-cyan-900/30 my-6 relative z-10 backdrop-blur-xl">
        <button onTouchStart={() => sendCommand('UP')} className={`absolute top-0 left-1/4 w-1/2 h-[35%] rounded-t-full flex items-start justify-center pt-5 transition-all ${activeBtn === 'UP' ? 'bg-cyan-500/20' : ''}`}><div className={`w-0 h-0 border-l-[12px] border-r-[12px] border-b-[18px] border-l-transparent border-r-transparent ${activeBtn==='UP' ? 'border-b-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'border-b-gray-600'}`}></div></button>
        <button onTouchStart={() => sendCommand('DOWN')} className={`absolute bottom-0 left-1/4 w-1/2 h-[35%] rounded-b-full flex items-end justify-center pb-5 transition-all ${activeBtn === 'DOWN' ? 'bg-cyan-500/20' : ''}`}><div className={`w-0 h-0 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent ${activeBtn==='DOWN' ? 'border-t-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'border-t-gray-600'}`}></div></button>
        <button onTouchStart={() => sendCommand('LEFT')} className={`absolute left-0 top-1/4 w-[35%] h-1/2 rounded-l-full flex items-center justify-start pl-5 transition-all ${activeBtn === 'LEFT' ? 'bg-cyan-500/20' : ''}`}><div className={`w-0 h-0 border-y-[12px] border-r-[18px] border-y-transparent ${activeBtn==='LEFT' ? 'border-r-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'border-r-gray-600'}`}></div></button>
        <button onTouchStart={() => sendCommand('RIGHT')} className={`absolute right-0 top-1/4 w-[35%] h-1/2 rounded-r-full flex items-center justify-end pr-5 transition-all ${activeBtn === 'RIGHT' ? 'bg-cyan-500/20' : ''}`}><div className={`w-0 h-0 border-y-[12px] border-l-[18px] border-y-transparent ${activeBtn==='RIGHT' ? 'border-l-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'border-l-gray-600'}`}></div></button>
        <button onTouchStart={() => sendCommand('SELECT')} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#121220] border-[2px] border-cyan-500/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center transition-all ${activeBtn === 'SELECT' ? 'bg-cyan-500/20 scale-95' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
          </div>
        </button>
      </div>

      <div className="flex gap-4 mb-8 relative z-10">
         <button onTouchStart={() => sendCommand('Y')} className="w-16 h-16 bg-[#0a0a1a] text-yellow-400 rounded-full font-black text-2xl shadow-[0_8px_15px_rgba(0,0,0,0.6)] border-2 border-yellow-500/30 active:scale-90 active:border-yellow-400 active:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all">Y</button>
         <button onTouchStart={() => sendCommand('X')} className="w-16 h-16 bg-[#0a0a1a] text-blue-400 rounded-full font-black text-2xl shadow-[0_8px_15px_rgba(0,0,0,0.6)] border-2 border-blue-500/30 active:scale-90 active:border-blue-400 active:shadow-[0_0_20px_rgba(96,165,250,0.5)] transition-all">X</button>
         <button onTouchStart={() => sendCommand('A')} className="w-16 h-16 bg-[#0a0a1a] text-cyan-400 rounded-full font-black text-2xl shadow-[0_8px_15px_rgba(0,0,0,0.6)] border-2 border-cyan-500/30 active:scale-90 active:border-cyan-400 active:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">A</button>
         <button onTouchStart={() => sendCommand('B')} className="w-16 h-16 bg-[#0a0a1a] text-fuchsia-500 rounded-full font-black text-2xl shadow-[0_8px_15px_rgba(0,0,0,0.6)] border-2 border-fuchsia-500/30 active:scale-90 active:border-fuchsia-400 active:shadow-[0_0_20px_rgba(217,70,239,0.5)] transition-all">B</button>
      </div>
    </main>
  );
}

export default function Remote() { return <Suspense fallback={<div className="h-screen bg-[#050511]" />}><RemoteController /></Suspense>; }