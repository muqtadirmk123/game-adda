"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

// 🔥 Naye columns add kiye (video_url aur controller_type)
interface Game { id: number; title: string; thumbnail_url: string; iframe_url: string; category: string; video_url?: string; controller_type?: string; }
interface Player { id: string; name: string; lastSeen: number; }

export default function Home() {
  const [viewState, setViewState] = useState<'home' | 'pairing' | 'splash' | 'dashboard' | 'playing'>('home');
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [roomCode, setRoomCode] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const viewStateRef = useRef(viewState);
  const gamesRef = useRef(games);
  const playersRef = useRef(players);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(false);
  
  // 🔥 Channel Ref add kiya taake Portal Mobile ko command bhej sake
  const channelRef = useRef<any>(null);

  useEffect(() => { viewStateRef.current = viewState; }, [viewState]);
  useEffect(() => { gamesRef.current = games; }, [games]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => console.log("Fullscreen blocked"));
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    }
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
       if (viewStateRef.current === 'dashboard' || viewStateRef.current === 'pairing' || viewStateRef.current === 'playing') {
          const now = Date.now();
          const activePlayers = playersRef.current.filter(p => now - p.lastSeen < 15000); 
          
          if (activePlayers.length === 0 && playersRef.current.length > 0) {
             exitFullScreen();
             setViewState('home');
             setPlayers([]);
             setActiveGame(null);
             sessionStorage.removeItem('ga_roomCode');
          } else if (activePlayers.length !== playersRef.current.length) {
             setPlayers(activePlayers);
          }
       }
    }, 3000); 
    return () => clearInterval(timer);
  }, []);

  const playSound = (type: 'move' | 'select' | 'join' | 'startup') => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
      const createReverb = (decay: number, duration: number) => {
        const length = ctx.sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
          const n = i === 0 ? 1 : Math.random() * 2 - 1;
          left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
      };

      if (type === 'move') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(); osc.stop(now + 0.05);
      } 
      else if (type === 'select') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(); osc.stop(now + 0.15);
      }
      else if (type === 'join') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }
      else if (type === 'startup') {
        const masterGain = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        const reverb = createReverb(2.0, 4.0);
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
        masterGain.connect(reverb);
        reverb.connect(ctx.destination);
        masterGain.gain.value = 0.8;

        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.connect(subGain); subGain.connect(masterGain);
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(100, now);
        subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(1.0, now + 0.05);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 3);
        subOsc.start(now); subOsc.stop(now + 4);

        const sweepOsc = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweepOsc.connect(sweepGain); sweepGain.connect(masterGain);
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(150, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 1.5);
        sweepGain.disconnect();
        sweepGain.connect(filter); filter.connect(masterGain);
        sweepGain.gain.setValueAtTime(0, now);
        sweepGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 3.5);
        sweepOsc.start(now); sweepOsc.stop(now + 4);

        const chord = [220.00, 329.63, 493.88, 587.33];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(masterGain);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.8 + (i * 0.1)); 
          gain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
          osc.start(now); osc.stop(now + 5);
        });

        const bufferSize = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 5000;
        const noiseGain = ctx.createGain();
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.05, now + 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        noiseSource.start(now);
      }
    } catch (e) {}
  };

  const sendCommandToGame = (command: string) => {
    const iframe = document.getElementById('game-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'CONTROLLER_COMMAND', command }, '*');
    }
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('games').select('*');
      if (data) {
        setGames(data); setFilteredGames(data);
        setCategories(['All', ...Array.from(new Set(data.map((g: Game) => g.category)))]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      let code = sessionStorage.getItem('ga_roomCode');
      if (!code) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('ga_roomCode', code);
        await supabase.from('rooms').insert([{ room_code: code, status: 'waiting' }]);
      }
      setRoomCode(code);

      const channel = supabase.channel(`room-${code}`)
        .on('broadcast', { event: 'join' }, (payload) => {
           const deviceId = payload.payload.deviceId || `anon_${Math.random()}`;
           const name = payload.payload.playerName || 'Player';
           setPlayers(prev => {
              const existingPlayer = prev.find(p => p.id === deviceId);
              if (existingPlayer) return prev.map(p => p.id === deviceId ? { ...p, name, lastSeen: Date.now() } : p);
              playSound('join'); 
              return [...prev, { id: deviceId, name, lastSeen: Date.now() }];
           });
        })
        .on('broadcast', { event: 'ping' }, (payload) => {
           const deviceId = payload.payload.deviceId || `anon_${Math.random()}`;
           const name = payload.payload.playerName || 'Player';
           setPlayers(prev => {
              const existingPlayer = prev.find(p => p.id === deviceId);
              if (existingPlayer) return prev.map(p => p.id === deviceId ? { ...p, name, lastSeen: Date.now() } : p);
              playSound('join'); 
              return [...prev, { id: deviceId, name, lastSeen: Date.now() }];
           });
        })
        .on('broadcast', { event: 'start_game' }, () => {
           if (viewStateRef.current === 'pairing') {
             playSound('startup'); 
             setViewState('splash');
             setTimeout(() => setViewState('dashboard'), 4000);
           }
        })
        .on('broadcast', { event: 'command' }, (payload) => {
          const cmd = payload.payload.command;
          const deviceId = payload.payload.deviceId || `anon_${Math.random()}`;
          const name = payload.payload.playerName || 'Player';
          
          setPlayers(prev => prev.map(p => p.id === deviceId ? { ...p, name, lastSeen: Date.now() } : p));

          if (cmd === 'MUTE') {
             isMutedRef.current = !isMutedRef.current;
             return;
          }
          if (cmd === 'DISCONNECT') {
             exitFullScreen();
             setViewState('home');
             setPlayers([]);
             setActiveGame(null);
             sessionStorage.removeItem('ga_roomCode');
             return;
          }

          if (viewStateRef.current === 'playing') {
             if (cmd === 'HOME') {
               playSound('select');
               setViewState('dashboard');
               setActiveGame(null);
               // 🔥 Tell mobiles to go back to Default Controller
               if (channelRef.current) {
                 channelRef.current.send({ type: 'broadcast', event: 'set_controller', payload: { controller_type: 'default' } });
               }
             } else {
               sendCommandToGame(cmd); 
             }
             return;
          }

          if (viewStateRef.current === 'dashboard') {
             if (cmd === 'SELECT' || cmd === 'A' || cmd === 'B' || cmd === 'X' || cmd === 'Y') playSound('select');
             else if (cmd !== 'HOME') playSound('move');

             setSelectedIndex((prev) => {
               const list = gamesRef.current;
               const total = list.length;
               if (total === 0) return 0;
               
               if (cmd === 'RIGHT') return (prev + 1) % total;
               if (cmd === 'LEFT') return (prev - 1 + total) % total;
               if (cmd === 'DOWN') return (prev + 4) < total ? prev + 4 : prev;
               if (cmd === 'UP') return (prev - 4) >= 0 ? prev - 4 : prev;
               
               if (cmd === 'SELECT') {
                 const selectedGame = list[prev];
                 if (selectedGame && selectedGame.iframe_url) {
                   setActiveGame(selectedGame);
                   setViewState('playing');
                   // 🔥 Tell mobiles to switch to THIS game's specific controller!
                   if (channelRef.current) {
                     channelRef.current.send({ 
                        type: 'broadcast', 
                        event: 'set_controller', 
                        payload: { controller_type: selectedGame.controller_type || 'default' } 
                     });
                   }
                 } else {
                   setSystemError("GAME NOT AVAILABLE");
                   setTimeout(() => setSystemError(null), 3000);
                 }
               }
               return prev;
             });
          }
        });
        
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel; // Save ref to send commands
        }
      });

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, []);

  const handleFilter = (category: string) => {
    setActiveCategory(category);
    if (category === 'All') setFilteredGames(games);
    else setFilteredGames(games.filter((g) => g.category === category));
  };

  const ErrorToast = () => {
    if (!systemError) return null;
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-red-600 text-white px-12 py-6 rounded-[2rem] font-black text-4xl tracking-widest shadow-[0_0_50px_rgba(220,38,38,0.8)] border-4 border-white animate-bounce text-center">
        ⚠️<br/>{systemError}
      </div>
    );
  };

  if (viewState === 'playing' && activeGame) {
    return (
      <main className="fixed inset-0 bg-black z-[999] overflow-hidden touch-none flex items-center justify-center">
        <iframe 
          id="game-iframe"
          src={activeGame.iframe_url} 
          className="w-full h-full border-none outline-none" 
          allowFullScreen 
        />
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full text-white/70 text-[10px] font-black tracking-[4px] uppercase border border-white/10 pointer-events-none shadow-2xl">
          Press HOME on mobile to exit
        </div>
      </main>
    );
  }

  if (viewState === 'splash') {
    return (
      <main className="h-screen bg-[#050511] flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#050511] to-[#050511]"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <div className="text-6xl font-extrabold tracking-tighter mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="h-1 w-64 bg-gray-900 rounded-full overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 animate-[progress_1.5s_infinite_linear]"></div>
          </div>
        </div>
      </main>
    );
  }

  if (viewState === 'pairing') {
    return (
      <main className="h-screen w-full bg-[#050511] font-sans relative flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 w-[90%] max-w-6xl h-[80vh] bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden">
          
          <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative">
            <div className="absolute top-8 left-8 lg:top-12 lg:left-12 text-3xl font-extrabold tracking-tighter">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
            </div>
            
            <div className="mt-8 lg:mt-0">
              <h2 className="text-5xl font-black text-white mb-4 tracking-tight">Link Device</h2>
              <p className="text-gray-400 text-lg mb-10">Scan the visual code or navigate to <span className="text-cyan-400 font-bold">gameadda.com</span> on your phone.</p>
              
              <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center">
                <div className="p-4 bg-white rounded-[2rem] shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:scale-105 transition-transform duration-500">
                  <QRCodeSVG value={`${window.location.origin}/remote?code=${roomCode}&auto=true`} size={160} />
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-[4px]">Digital Key</span>
                  <div className="bg-black/40 border border-white/10 px-8 py-5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 text-cyan-400 text-5xl font-mono font-black tracking-[10px]">{roomCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-12 lg:p-16 bg-gradient-to-br from-white/[0.01] to-black/40 flex flex-col relative">
             <div className="flex justify-between items-center mb-12">
               <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                 <span className="w-2.5 h-2.5 bg-[#1ed760] rounded-full animate-pulse shadow-[0_0_10px_rgba(30,215,96,0.8)]"></span>
                 Player Lounge
               </h3>
               <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-gray-300 tracking-widest uppercase">
                 {players.length} Connected
               </span>
             </div>

             {players.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-70">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                     <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-ping duration-1000"></div>
                     <div className="absolute inset-4 border-2 border-cyan-500/40 rounded-full animate-ping duration-1000 delay-150"></div>
                     <div className="absolute inset-8 border border-fuchsia-500/30 rounded-full animate-ping duration-1000 delay-300"></div>
                     <svg className="w-10 h-10 text-cyan-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <p className="text-gray-400 font-bold tracking-[3px] uppercase text-xs">Awaiting challengers...</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-max overflow-y-auto pr-2 scrollbar-hide">
                 {players.map((p) => (
                   <div key={p.id} className="bg-black/20 border border-white/10 p-5 rounded-3xl flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-xl hover:bg-white/5 transition-colors">
                     <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[1rem] flex items-center justify-center text-xl font-black text-black shadow-inner uppercase">
                       {p.name.charAt(0)}
                     </div>
                     <div className="flex flex-col">
                       <span className="text-white font-bold text-lg truncate w-24">{p.name}</span>
                       <span className="text-[#1ed760] text-[10px] font-black uppercase tracking-[2px]">Ready</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}

             <button onClick={() => { exitFullScreen(); setViewState('home'); }} className="absolute top-8 right-8 lg:top-12 lg:right-12 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl text-gray-400 hover:text-white transition-all" title="Cancel Pairing">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          </div>

        </div>
      </main>
    );
  }

  if (viewState === 'dashboard') {
    const highlightedGame = filteredGames[selectedIndex];
    return (
      <main className="h-screen w-full bg-[#050511] font-sans overflow-hidden relative flex flex-col">
        <ErrorToast />
        
        {/* 🔥 NEW VIDEO PREVIEW FEATURE 🔥 */}
        <div className="absolute inset-0 z-0">
           {highlightedGame?.video_url ? (
             <video 
               src={highlightedGame.video_url} 
               autoPlay 
               loop 
               muted 
               playsInline 
               className="w-full h-full object-cover opacity-50 transition-all duration-500 scale-105 blur-[2px]" 
             />
           ) : (
             <img 
               src={highlightedGame?.thumbnail_url} 
               className="w-full h-full object-cover opacity-50 transition-all duration-500 scale-105 blur-md" 
             />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-[#050511]/70 to-[#050511]/30"></div>
        </div>

        <div className="relative z-10 w-full p-8 flex justify-between items-center">
           <div className="text-3xl font-extrabold tracking-tighter">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
           </div>
           
           <div className="flex gap-4 items-center">
              {players.slice(0,2).map((p) => (
                <div key={p.id} className="bg-black/50 border border-white/10 px-5 py-2 rounded-xl text-white font-bold flex items-center gap-3">
                   <span className="w-6 h-6 bg-[#1ed760] text-black rounded-full flex items-center justify-center text-xs font-black uppercase">{p.name.charAt(0)}</span>
                   <span className="tracking-widest uppercase text-sm truncate max-w-[80px]">{p.name}</span>
                </div>
              ))}
              <div className="bg-black/80 border border-[#1ed760]/30 px-6 py-2 rounded-xl text-white font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(30,215,96,0.1)]">
                 <span className="text-[#1ed760] text-sm uppercase tracking-widest opacity-80">Room</span>
                 <span className="text-xl tracking-[5px] text-white font-mono">{roomCode}</span>
              </div>
              <button onClick={() => { exitFullScreen(); setViewState('home'); }} className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 p-2.5 rounded-xl text-red-400 cursor-pointer">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
           </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-end px-16 pb-10">
           <div className="max-w-2xl mb-6">
              <h4 className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-2">Featured Game</h4>
              <h1 className="text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">{highlightedGame?.title || 'Unknown Game'}</h1>
              <div className="flex items-center gap-4 mb-6 text-yellow-400 text-lg">
                 ★★★★★ <span className="text-gray-300 text-sm font-medium">| {highlightedGame?.category || 'Arcade'}</span>
              </div>
              <button className="bg-[#1ed760] text-black px-10 py-4 rounded-xl font-black text-xl flex items-center gap-3 shadow-lg">
                 <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                 Play now
              </button>
           </div>
        </div>

        <div className="relative z-10 h-48 px-16 pb-8 flex items-center gap-6 overflow-x-hidden">
           {filteredGames.map((game, idx) => (
             <div key={game.id} className={`relative min-w-[240px] h-36 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${selectedIndex === idx ? 'border-4 border-[#1ed760] scale-105' : 'border border-white/10 opacity-60 scale-95'}`}>
               <img src={game.thumbnail_url} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                 <p className="text-white font-bold text-sm truncate">{game.title}</p>
               </div>
             </div>
           ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050511] text-white font-sans selection:bg-fuchsia-500">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0a1a]/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-3xl font-extrabold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Game</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-purple-600">Adda</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-cyan-400 hidden sm:inline-block font-mono border border-cyan-900 bg-cyan-900/20 px-3 py-1.5 rounded-full">{user.email}</span>
                <button onClick={() => supabase.auth.signOut()} className="bg-red-600/20 text-red-400 border border-red-600/50 px-5 py-2 rounded-full text-sm font-bold">Logout</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-2 rounded-full text-sm font-bold text-white shadow-lg">Login / Join</Link>
            )}
          </div>
        </div>
      </nav>
      <section className="relative max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">Play Instantly. <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500">Zero Downloads.</span></h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl font-medium mb-10">Use your phone as a controller and dive into the arcade.</p>
        <button 
          onClick={() => { 
            enterFullScreen(); 
            if (!audioCtxRef.current) { 
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext; 
              if (AudioContextClass) audioCtxRef.current = new AudioContextClass(); 
            } 
            setViewState('pairing'); 
          }} 
          className="bg-[#1ed760] text-black px-12 py-5 rounded-full text-2xl font-black shadow-[0_0_30px_rgba(30,215,96,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-tighter mb-10"
        >
          Start playing now
        </button>
      </section>
      <section className="max-w-7xl mx-auto px-6 pb-24 relative z-10 pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button key={category} onClick={() => handleFilter(category)} className={`px-6 py-2 rounded-full font-bold text-sm uppercase transition-all border ${activeCategory === category ? 'bg-cyan-500 border-transparent text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-[#121220] border-gray-700 text-gray-400 hover:border-cyan-500'}`}>{category}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredGames.map((game) => (
            <div key={game.id} className="group relative bg-[#121220] rounded-3xl overflow-hidden border border-gray-800 transition-all duration-500 hover:border-cyan-400 hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)]">
              <div className="relative h-52 overflow-hidden">
                <img src={game.thumbnail_url} alt={game.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4"><span className="bg-black/80 backdrop-blur-md text-[10px] font-bold text-cyan-400 px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest">{game.category}</span></div>
              </div>
              <div className="p-6"><h3 className="text-xl font-bold mb-4 truncate group-hover:text-cyan-400 transition-colors">{game.title}</h3><div className="block w-full text-center py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all bg-gray-800/50 text-gray-400">Play Game</div></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}