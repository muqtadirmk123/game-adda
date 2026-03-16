"use client";

import { useEffect, useState, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

// 🔥 NEXT-GEN: Added controller_url to the interface
interface Game {
  id: number;
  title: string;
  iframe_url: string;
  controller_url?: string; 
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomCode = searchParams.get('room');
  const [game, setGame] = useState<Game | null>(null);
  const channelRef = useRef<any>(null); // 🔥 Reference to send broadcast signals

  useEffect(() => {
    async function fetchGame() {
      const { data } = await supabase.from('games').select('*').eq('id', resolvedParams.id).single();
      if (data) {
        setGame(data);
        
        // 🔥 SIGNAL TO MOBILE: Load custom HTML URL if available, else keep default
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'set_controller',
            payload: { controller_url: data.controller_url || null }
          });
        }
      }
    }

    if (roomCode) {
      const channel = supabase.channel(`room-${roomCode}`)
        .on('broadcast', { event: 'command' }, (payload) => {
          const cmd = payload.payload.command;
          
          if (cmd === 'HOME') {
            // 🔥 Reset mobile to Default when leaving the game
            channel.send({ 
              type: 'broadcast', 
              event: 'set_controller', 
              payload: { controller_url: null } 
            });
            router.push(`/?state=dashboard&room=${roomCode}`);
          } else {
            simulateKeyPress(cmd);
          }
        });
      
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          fetchGame(); // Game fetch tabhi karo jab channel ready ho
        }
      });

      return () => { supabase.removeChannel(channel); };
    }
  }, [resolvedParams.id, roomCode, router]);

  const simulateKeyPress = (command: string) => {
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

  return (
    <main className="fixed inset-0 bg-black z-[999] overflow-hidden touch-none">
      <iframe 
        src={game.iframe_url} 
        className="w-full h-full border-none outline-none" 
        allowFullScreen 
      />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full text-white/70 text-[10px] font-black tracking-[4px] uppercase border border-white/10 pointer-events-none shadow-2xl">
        Playing: {game.title} | Press HOME on mobile to exit
      </div>
    </main>
  );
}