import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Send,
  Copy, 
  Check,
  Flame,
  Volume2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Home() {
  // State: 'idle' | 'recording' | 'preview' | 'uploading' | 'created'
  const [status, setStatus] = useState('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareableUrl, setShareableUrl] = useState('');
  const [noteId, setNoteId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [audioVisualBars, setAudioVisualBars] = useState([20, 30, 45, 60, 40, 25, 35, 50]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const previewAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Start audio recording
  const startRecording = async () => {
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        // Stop all mic tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Realtime Audio Waveform Visualizer
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVisualizer = () => {
            if (mediaRecorder.state === 'recording') {
              analyser.getByteFrequencyData(dataArray);
              // Pick 12 bars from low to mid frequency
              const bars = [];
              const step = Math.floor(dataArray.length / 12) || 1;
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 0;
                // Scale value between 12% and 100%
                const heightPercent = Math.max(12, Math.min(100, (val / 255) * 100 * 1.5));
                bars.push(heightPercent);
              }
              setAudioVisualBars(bars);
              animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            }
          };
          updateVisualizer();
        }
      } catch (audioErr) {
        console.warn('Audio visualization unavailable:', audioErr);
      }

      mediaRecorder.start(200); // 200ms slice chunks
      setStatus('recording');
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setErrorMsg(
        err.message || 'Microphone access denied. Please allow microphone permissions in your browser.'
      );
      setStatus('idle');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    setDuration(recordingTime);
    setStatus('preview');
  };

  // Discard and re-record
  const handleReset = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setDuration(0);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setPreviewCurrentTime(0);
    setErrorMsg('');
    setStatus('idle');
  };

  // Preview Playback Controls
  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => {
        console.error('Preview playback failed:', e);
      });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (previewAudioRef.current) {
      const cur = previewAudioRef.current.currentTime;
      const total = previewAudioRef.current.duration || duration || 1;
      setPreviewCurrentTime(cur);
      setPreviewProgress((cur / total) * 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingPreview(false);
    setPreviewProgress(100);
  };

  const handleSeek = (e) => {
    const seekPercent = parseFloat(e.target.value);
    if (previewAudioRef.current) {
      const total = previewAudioRef.current.duration || duration;
      previewAudioRef.current.currentTime = (seekPercent / 100) * total;
      setPreviewProgress(seekPercent);
    }
  };

  // Upload Audio Note to Backend
  const handleCreateNote = async () => {
    if (!audioBlob) {
      setErrorMsg('No audio note recorded.');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voicenote.webm');
      formData.append('duration', duration || recordingTime);

      const response = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload voice note.');
      }

      setNoteId(data.id);
      const fullUrl = `${window.location.origin}${data.url}`;
      setShareableUrl(fullUrl);
      setStatus('created');
    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMsg(err.message || 'Network error while generating voice note.');
      setStatus('preview');
    }
  };

  // Copy shareable link to clipboard
  const handleCopyLink = async () => {
    if (!shareableUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareableUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-xl mx-auto w-full">
      {/* Top Banner Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 mb-8 shadow-inner">
        <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
        <span className="font-medium">One-Time Playback</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-400">Vaporizes after listening</span>
      </div>

      {/* Main Glass Card */}
      <div className="w-full bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Unable to Proceed</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STATE: IDLE */}
        {status === 'idle' && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="relative group mb-8">
              {/* Outer Glow Ring */}
              <div className="absolute -inset-4 bg-gradient-to-r from-rose-600 to-amber-600 rounded-full opacity-30 group-hover:opacity-75 blur-xl transition duration-500 group-hover:scale-105"></div>
              
              <button
                onClick={startRecording}
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-b from-rose-500 to-rose-700 text-white flex flex-col items-center justify-center shadow-xl shadow-rose-950/70 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-rose-500/40 cursor-pointer"
                title="Tap to record voice note"
              >
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-[11px] font-semibold tracking-wider uppercase mt-1 text-rose-100">
                  Record
                </span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ready to record your note?
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-sm">
              Speak freely. Once the recipient listens to this note, it vanishes permanently from existence.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm text-left">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Burn on Listen</p>
                  <p className="text-[11px] text-zinc-400">Destroyed the millisecond audio finishes.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-zinc-200">24-Hour TTL</p>
                  <p className="text-[11px] text-zinc-400">Unlistened notes auto-expire after 24 hrs.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE: RECORDING */}
        {status === 'recording' && (
          <div className="flex flex-col items-center text-center py-6">
            {/* Pulsing Recording Indicator */}
            <div className="relative mb-6">
              <div className="absolute -inset-3 rounded-full bg-rose-500/20 animate-vapor-pulse"></div>
              <div className="relative w-24 h-24 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-900/60">
                <Mic className="w-10 h-10 animate-bounce" />
              </div>
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-14 w-full max-w-xs mb-4">
              {audioVisualBars.map((height, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-rose-600 via-rose-400 to-amber-400 rounded-full transition-all duration-75"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>

            {/* Live Timer */}
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-widest mb-1">
              {formatTime(recordingTime)}
            </div>
            <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Recording audio via microphone...
            </p>

            {/* Stop Button */}
            <button
              onClick={stopRecording}
              className="px-8 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-semibold flex items-center gap-2.5 shadow-xl transition-all cursor-pointer border border-zinc-700/60"
            >
              <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>Finish Recording</span>
            </button>
          </div>
        )}

        {/* STATE: PREVIEW */}
        {status === 'preview' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
              <Volume2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">Review Your Voice Note</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 mb-6">
              Listen to the preview or re-record before generating your secret link.
            </p>

            {/* Hidden Native Audio Element for Preview */}
            {audioUrl && (
              <audio
                ref={previewAudioRef}
                src={audioUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
              />
            )}

            {/* Custom Audio Preview Player Card */}
            <div className="w-full bg-zinc-950/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePreviewPlay}
                  className="w-12 h-12 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 transition-all cursor-pointer shrink-0"
                  title={isPlayingPreview ? 'Pause' : 'Play'}
                >
                  {isPlayingPreview ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>{formatTime(previewCurrentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={previewProgress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700/50 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                <span>Re-record</span>
              </button>

              <button
                onClick={handleCreateNote}
                className="flex-[2] py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Create Secret Link</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: UPLOADING */}
        {status === 'uploading' && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-rose-500 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-rose-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white">Encrypting & Storing Note</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xs">
              Preparing your single-listen ephemeral voice capsule...
            </p>
          </div>
        )}

        {/* STATE: CREATED (SUCCESS LINK) */}
        {status === 'created' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-950/40">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Secret Link Generated!
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 mb-6 max-w-sm">
              Share this one-time link. As soon as the recipient finishes playback, the note is incinerated forever.
            </p>

            {/* Link Box with Copy Button */}
            <div className="w-full bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-2.5 sm:p-3 mb-6 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="bg-transparent text-xs sm:text-sm text-zinc-200 font-mono flex-1 px-2.5 py-1.5 focus:outline-none select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Note Details Pill */}
            <div className="w-full bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3 mb-6 flex items-center justify-around text-xs text-zinc-400">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">ID</span>
                <span className="font-mono text-zinc-300 font-medium">{noteId}</span>
              </div>
              <div className="h-6 w-px bg-zinc-800"></div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">Duration</span>
                <span className="font-mono text-zinc-300 font-medium">{formatTime(duration)}</span>
              </div>
              <div className="h-6 w-px bg-zinc-800"></div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">Self-Destruct</span>
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3" /> After Play
                </span>
              </div>
            </div>

            {/* Navigation / Next actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <a
                href={shareableUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-700/50 transition-all cursor-pointer"
              >
                <span>Test Note in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>

              <button
                onClick={handleReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-zinc-800 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4 text-rose-500" />
                <span>Record Another</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security notice footer */}
      <div className="mt-8 text-center text-xs text-zinc-500 max-w-sm flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-zinc-400" />
        <span>End-to-end ephemeral delivery. No tracking, zero persistence.</span>
      </div>
    </div>
  );
}

