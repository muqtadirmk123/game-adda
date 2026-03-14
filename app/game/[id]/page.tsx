"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Game {
  id: number;
  title: string;
  thumbnail_url: string;
  iframe_url: string;
  category: string;
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [controllerStatus, setControllerStatus] = useState('Disconnected');

  useEffect(() => {
    async function initGame() {
      // 1. Fetch Game Data
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (data) setGame(data);
      setLoading(false);

      // 2. Generate or Join Room for Controller
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
      setRoomCode(generatedCode);

      const { error: roomError } = await supabase
        .from('rooms')
        .insert([{ room_code: generatedCode, status: 'waiting' }]);

      if (roomError) console.error("Room Error:", roomError);

      // 3. Listen for Realtime Controller Commands
      const channel = supabase
        .channel(`room-${generatedCode}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${generatedCode}` },
          (payload: any) => {
            const newStatus = payload.new.status;
            const lastCommand = payload.new.last_command;

            if (newStatus === 'connected') setControllerStatus('Connected ✅');
            
            if (lastCommand) {
              console.log("Mobile Command Received:", lastCommand);
              // Yahan hum game ko command bhejenge (Keyboard simulation)
              simulateKeyPress(lastCommand);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    initGame();
  }, [resolvedParams.id]);

  // Function to simulate keyboard for the game
  const simulateKeyPress = (command: string) => {
    const keyMap: any = {
      'UP': 'ArrowUp',
      'DOWN': 'ArrowDown',
      'LEFT': 'ArrowLeft',
      'RIGHT': 'ArrowRight',
      'A': 'z', // Common web game keys
      'B': 'x'
    };
    
    const key = keyMap[command];
    if (key) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key }));
      }, 100);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050511] flex items-center justify-center text-white">Loading Game...</div>;
  if (!game) return <div className="min-h-screen bg-[#050511] flex items-center justify-center text-white">Game Not Found</div>;

  return (
    <main className="min-h-screen bg-[#050511] text-white p-4 md:p-10 font-sans selection:bg-fuchsia-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Game Player */}
        <div className="lg:col-span-3">
          <Link href="/" className="inline-flex items-center text-gray-400 hover:text-cyan-400 mb-6 font-semibold">
            <span className="mr-2">←</span> Back to Arcade
          </Link>

          <div className="aspect-video w-full bg-[#0a0a1a] border border-gray-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.2)] relative">
            <iframe
              src={game.iframe_url}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
              {game.title}
            </h1>
            <span className="bg-gray-800 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-fuchsia-400">
              {game.category}
            </span>
          </div>
        </div>

        {/* Right Side: Controller Connection Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a1a] border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 blur-3xl"></div>
            
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
              Mobile Controller
            </h2>

            <div className="space-y-4">
              <div className="bg-[#121220] p-4 rounded-2xl border border-gray-800 text-center">
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Room Code</p>
                <p className="text-4xl font-black tracking-[10px] text-white">{roomCode || '----'}</p>
              </div>

              <div className="text-sm text-gray-400 bg-black/30 p-4 rounded-xl border border-white/5 text-center">
                Scan QR or go to <br /> 
                <span className="text-cyan-400 font-bold">gameadda.com/remote</span>
              </div>

              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-gray-500 font-bold uppercase">Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${controllerStatus.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {controllerStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-fuchsia-900/20 to-transparent border border-fuchsia-500/20 rounded-3xl">
            <h3 className="font-bold text-sm text-fuchsia-400 mb-2 uppercase italic">How to play?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Open the remote page on your phone, enter the code, and use your phone as a gamepad. Perfect for multiplayer!
            </p>
          </div>
        </div>
        
      </div>
    </main>
  );
}