"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

interface Game {
  id: number;
  title: string;
  iframe_url: string;
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomCode = searchParams.get('room');
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    async function fetchGame() {
      const { data } = await supabase.from('games').select('*').eq('id', resolvedParams.id).single();
      if (data) setGame(data);
    }
    fetchGame();

    // 📡 Listen to real-time controller commands
    if (roomCode) {
      const channel = supabase.channel(`room-${roomCode}`)
        .on('broadcast', { event: 'command' }, (payload) => {
          const cmd = payload.payload.command;
          
          // Agar controller se 'HOME' dabaya toh wapas Dashboard par jao
          if (cmd === 'HOME') {
            router.push('/');
          } else {
            simulateKeyPress(cmd);
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [resolvedParams.id, roomCode, router]);

  const simulateKeyPress = (command: string) => {
    // Basic Key Mapping for web games
    const keyMap: any = { 
      'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight', 
      'A': 'z', 'B': 'x', 'X': 'Enter', 'Y': 'Shift' 
    };
    const key = keyMap[command];
    if (key) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key })), 100);
    }
  };

  if (!game) return <div className="min-h-screen bg-black"></div>;

  // 🎮 100% FULLSCREEN IMMERSIVE MODE
  return (
    <main className="fixed inset-0 bg-black z-[999] overflow-hidden touch-none">
      <iframe 
        src={game.iframe_url} 
        className="w-full h-full border-none outline-none" 
        allowFullScreen 
      />
      {/* Subtle hint overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full text-white/50 text-[10px] font-black tracking-[4px] uppercase border border-white/10 pointer-events-none shadow-2xl">
        Press HOME on your controller to exit
      </div>
    </main>
  );
}