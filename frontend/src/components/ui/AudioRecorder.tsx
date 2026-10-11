import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';

interface AudioRecorderProps {
  onAudioChange: (file: File | Blob | null, duration: number) => void;
  maxDurationSeconds?: number;
  className?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioChange,
  maxDurationSeconds = 120,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine best browser supported audio mime type
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setMicError(null);
    chunksRef.current = [];
    setRecordDuration(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(t('media.recordingPermissionError') || 'Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setSelectedFileName(`voice_complaint_${Date.now()}.${recordedMime.includes('mp4') ? 'mp4' : 'webm'}`);
        onAudioChange(blob, recordDuration);

        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      setMicError(t('media.recordingPermissionError') || 'Microphone permission denied. You can select an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const resetRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setSelectedFileName(null);
    setIsRecording(false);
    setRecordDuration(0);
    setMicError(null);
    onAudioChange(null, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMicError(t('media.fileSizeExceeded') || 'Audio file exceeds 10MB limit.');
      return;
    }

    resetRecording();
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioBlob(file);
    setSelectedFileName(file.name);
    setMicError(null);
    onAudioChange(file, 0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`p-4 rounded-xl border border-gray-700/60 bg-[#111726]/70 backdrop-blur-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Icon name="mic" size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wide">
              {t('submit.audioTitle')}
            </h4>
            <p className="text-[11px] text-gray-400">
              {t('submit.audioHelp')}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs font-mono font-bold text-red-400">
              {formatTime(recordDuration)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
        )}
      </div>

      {micError && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <Icon name="warning" size={16} className="shrink-0 mt-0.5" />
          <span>{micError}</span>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording ? (
        <div className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95"
          >
            <Icon name="stop" size={18} />
            <span>{t('submit.stopRecordBtn')}</span>
          </button>
          <button
            type="button"
            onClick={resetRecording}
            className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl border border-gray-700 transition-all"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : audioUrl ? (
        /* Audio Preview State */
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="font-medium truncate max-w-[240px]">
              {selectedFileName || t('media.audioPlayback')}
            </span>
            {recordDuration > 0 && (
              <span className="text-gray-400 font-mono text-[11px]">
                {formatTime(recordDuration)}
              </span>
            )}
          </div>
          <audio
            controls
            src={audioUrl}
            className="w-full h-10 rounded-lg filter invert-[0.85] hue-rotate-180"
          />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs rounded-lg transition-all"
            >
              <Icon name="replay" size={15} />
              <span>{t('submit.retakeAudioBtn')}</span>
            </button>
            <button
              type="button"
              onClick={resetRecording}
              className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs rounded-lg transition-all"
            >
              <Icon name="delete" size={15} />
              <span>{t('submit.deleteAudioBtn')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Idle state: Record or Select File */
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Icon name="mic" size={16} />
            <span>{t('submit.recordVoiceBtn')}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition-all"
          >
            <Icon name="upload_file" size={16} />
            <span>{t('submit.uploadAudioAlt')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
