import React from 'react';
import { Mic, Flame, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50 group-hover:scale-105 transition-transform duration-200">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-rose-400 transition-colors">
                Vapor<span className="text-rose-500">Mic</span>
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 -mt-0.5 tracking-wider uppercase font-medium">
              Ephemeral Voice Notes
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Play-Once Burn</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>24h TTL</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Retention</span>
          </div>
        </div>
      </div>
    </header>
  );
}

