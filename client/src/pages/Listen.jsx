import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Flame,
  AlertTriangle,
  Clock,
  Mic, 
  ShieldAlert,
  Trash2,
  Volume2,
  Loader2,
  Sparkles
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Listen() {
  const { id } = useParams();

  // State: 'checking' | 'ready' | 'playing' | 'paused' | 'burned' | 'error'
  const [status, setStatus] = useState('checking');
  const [noteData, setNoteData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isBurning, setIsBurning] = useState(false);

  const audioRef = useRef(null);

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Verify note status on mount
  useEffect(() => {
    let isMounted = true;

    const verifyNote = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/notes/${id}`);
        const data = await response.json();

        if (!isMounted) return;

        if (response.status === 404 || !response.ok) {
          setStatus('burned');
          setErrorMessage(data.error || 'Message expired or destroyed');
          return;
        }

        setNoteData(data.note);
        setDuration(data.note.duration || 0);
        setStatus('ready');
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to verify note:', err);
        setStatus('burned');
        setErrorMessage('Message expired or destroyed');
      }
    };

    verifyNote();

    return () => {
      isMounted = false;
      // Cleanup audio element if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [id]);

  // Step 2: Trigger destruction endpoint
  const destroyNote = async () => {
    try {
      setIsBurning(true);
      await fetch(`${API_BASE}/api/notes/${id}/destroy`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to destroy note on server:', err);
    } finally {
      // Disarm audio player
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsBurning(false);
      setStatus('burned');
    }
  };

  // Step 3: Handle Audio Events
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setStatus('playing');
      }).catch((e) => {
        console.error('Audio play error:', e);
      });
    } else {
      audioRef.current.pause();
      setStatus('paused');
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const total = audioRef.current.duration || duration || 1;
      setCurrentTime(cur);
      setProgress((cur / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  // Immediate burn when audio reaches the end
  const handleAudioEnded = () => {
    destroyNote();
  };

  const handleSeek = (e) => {
    const seekPercent = parseFloat(e.target.value);
    if (audioRef.current) {
      const total = audioRef.current.duration || duration;
      audioRef.current.currentTime = (seekPercent / 100) * total;
      setProgress(seekPercent);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-xl mx-auto w-full">
      {/* CHECKING / LOADING STATE */}
      {status === 'checking' && (
        <div className="w-full bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-10 backdrop-blur-xl text-center flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-white">Verifying voice capsule...</h3>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Checking status with VaporMic vault...
          </p>
        </div>
      )}

      {/* BURNED / EXPIRED STATE */}
      {status === 'burned' && (
        <div className="w-full bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-8 sm:p-10 backdrop-blur-xl text-center flex flex-col items-center relative overflow-hidden shadow-2xl">
          {/* Ambient red burn background */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-rose-900/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-zinc-950/80 border border-rose-900/50 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-950/60">
              <Flame className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Vaporized</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Message Burned or Expired
          </h2>

          <p className="text-zinc-400 text-xs sm:text-sm mt-3 max-w-md leading-relaxed">
            This voice note has either already been listened to and self-destructed, or its 24-hour lifetime expired. It has been permanently purged from all servers and storage.
          </p>

          <div className="mt-8 pt-6 border-t border-zinc-800/80 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Record a New Voice Note</span>
            </Link>
          </div>
        </div>
      )}

      {/* READY / PLAYING / PAUSED STATE */}
      {(status === 'ready' || status === 'playing' || status === 'paused') && (
        <div className="w-full bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Self Destruct Warning Notice */}
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-200/90 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Play-Once Notice</p>
              <p className="mt-0.5 text-amber-300/80 leading-relaxed">
                This note will self-destruct permanently the moment it finishes playing. You cannot replay it once finished.
              </p>
            </div>
          </div>

          {/* Audio Element streaming from backend */}
          <audio
            ref={audioRef}
            src={`${API_BASE}/api/notes/${id}/stream`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleAudioEnded}
            controlsList="nodownload"
            preload="metadata"
          />

          {/* Note Info Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Note ID: <span className="font-mono text-zinc-300">{id}</span></span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/40 border border-rose-800/50 text-[11px] font-semibold text-rose-400">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Live Capsule</span>
            </div>
          </div>

          {/* Player Visualizer & Time Display */}
          <div className="flex flex-col items-center my-6">
            <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs mb-6">
              {[30, 45, 65, 85, 50, 75, 40, 60, 90, 45, 30, 55, 70, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-200 ${
                    status === 'playing'
                      ? 'bg-gradient-to-t from-rose-500 to-amber-400 animate-pulse'
                      : 'bg-zinc-700'
                  }`}
                  style={{
                    height: status === 'playing' ? `${Math.max(15, (h * (progress + 20)) % 100)}%` : `${h * 0.4}%`
                  }}
                ></div>
              ))}
            </div>

            <div className="text-4xl font-mono font-bold text-white tracking-widest mb-1">
              {formatTime(currentTime)}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              of {formatTime(duration)}
            </p>
          </div>

          {/* Custom Player Scrubber Bar */}
          <div className="w-full bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 transition-all cursor-pointer shrink-0"
                title={status === 'playing' ? 'Pause Note' : 'Play Note'}
              >
                {status === 'playing' ? (
                  <Pause className="w-6 h-6 fill-white" />
                ) : (
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                )}
              </button>

              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-zinc-400">
                  <span className="text-rose-400 font-medium">{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls: Instant Burn button */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={destroyNote}
              disabled={isBurning}
              className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-800 hover:border-rose-900/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{isBurning ? 'Vaporizing...' : 'Burn Note Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

