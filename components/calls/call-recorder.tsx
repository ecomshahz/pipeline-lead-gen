'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
}

export function CallRecorder({ onRecordingComplete }: CallRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        onRecordingComplete(blob, durationSec);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      mediaRecorder.start(1000); // Collect data every second
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setPermissionDenied(true);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {permissionDenied && (
        <div className="flex items-center gap-2 text-sm text-accent-red bg-accent-red/10 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          Microphone access denied. Please allow microphone access in your browser settings.
        </div>
      )}

      <div className="flex items-center gap-4">
        {recording ? (
          <>
            {/* Recording indicator */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-3 h-3 bg-accent-red rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-accent-red rounded-full animate-ping" />
              </div>
              <span className="font-mono text-lg text-accent-red">{formatTime(duration)}</span>
            </motion.div>

            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-red text-white text-sm font-medium rounded-lg hover:bg-accent-red/90 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </button>
          </>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Start Recording
          </button>
        )}
      </div>

      {recording && (
        <p className="text-xs text-muted">
          Recording your call... Click stop when finished.
        </p>
      )}
    </div>
  );
}

interface TranscriptInputProps {
  onSubmit: (transcript: string) => void;
  loading: boolean;
}

export function TranscriptInput({ onSubmit, loading }: TranscriptInputProps) {
  const [transcript, setTranscript] = useState('');

  return (
    <div className="space-y-3">
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={8}
        placeholder="Paste your call transcript here, or type out what was said during the call. Include both your lines and the prospect's responses for the best analysis.

Example:
Me: Hi, is this John? My name is Alex, I help plumbers in Miami get found online...
John: Yeah, what's this about?
Me: I noticed your business doesn't have a website yet..."
        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:border-accent-blue focus:outline-none resize-y font-mono"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {transcript.length > 0
            ? `${transcript.split(/\s+/).filter(Boolean).length} words`
            : 'Paste or type your call transcript for AI analysis'}
        </p>
        <button
          onClick={() => onSubmit(transcript)}
          disabled={!transcript.trim() || loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Analyze Call
            </>
          )}
        </button>
      </div>
    </div>
  );
}
