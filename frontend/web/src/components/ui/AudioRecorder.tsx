import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import s from './AudioRecorder.module.css';

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
  // Real recording length (the state value is stale inside the recorder callbacks)
  const durationRef = useRef(0);

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
    durationRef.current = 0;

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
        onAudioChange(blob, durationRef.current);

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
          durationRef.current = next;
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
    <div
      className={`${s.tile} ${audioUrl ? s.tileOn : ''} ${isRecording ? s.tileRec : ''} ${className}`}
    >
      {isRecording ? (
        <>
          <span className={s.recPulse} aria-hidden="true">
            <span />
          </span>
          <span className={s.label}>{t('submit.wizard.recording')}</span>
          <span className={s.timer} aria-live="polite">
            {formatTime(recordDuration)} / {formatTime(maxDurationSeconds)}
          </span>
          <div className={s.actions}>
            <button type="button" onClick={stopRecording} className={s.stopBtn}>
              <Icon name="stop" size={16} />
              <span>{t('submit.wizard.stop')}</span>
            </button>
            <button type="button" onClick={resetRecording} className={s.linkBtn}>
              {t('common.cancel')}
            </button>
          </div>
        </>
      ) : audioUrl ? (
        <>
          <span className={s.icon} aria-hidden="true">
            <Icon name="mic" size={22} />
          </span>
          <span className={s.label}>
            {t('submit.wizard.voiceLabel')}
            {recordDuration > 0 ? ` · ${formatTime(recordDuration)}` : ''}
          </span>
          <span className={s.fileName} title={selectedFileName || undefined}>
            {selectedFileName || t('media.audioPlayback')}
          </span>
          <audio controls src={audioUrl} className={s.player} />
          <div className={s.actions}>
            <button type="button" onClick={startRecording} className={s.linkBtn}>
              <Icon name="replay" size={15} />
              <span>{t('submit.wizard.recordAgain')}</span>
            </button>
            <button type="button" onClick={resetRecording} className={`${s.linkBtn} ${s.linkBtnDanger}`}>
              <Icon name="delete" size={15} />
              <span>{t('submit.wizard.remove')}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={s.icon} aria-hidden="true">
            <Icon name="mic" size={22} />
          </span>
          <span className={s.label}>{t('submit.wizard.voiceLabel')}</span>
          <span className={s.sub}>{t('submit.wizard.voiceSub')}</span>
          <div className={s.actions}>
            <button type="button" onClick={startRecording} className={s.recordBtn}>
              <Icon name="mic" size={16} />
              <span>{t('submit.wizard.record')}</span>
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={s.linkBtn}>
              <Icon name="upload_file" size={15} />
              <span>{t('submit.wizard.uploadFile')}</span>
            </button>
          </div>
        </>
      )}

      {micError && (
        <p className={s.error} role="alert">
          <Icon name="info" size={15} />
          <span>{t('submit.wizard.micBlocked')}</span>
        </p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
        onChange={handleFileSelect}
        hidden
      />
    </div>
  );
};

export default AudioRecorder;
