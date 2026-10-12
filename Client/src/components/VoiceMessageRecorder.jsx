import { useEffect, useRef, useState } from "react";

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export function VoiceMessageRecorder({ onSend }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
  };

  useEffect(() => () => cleanup(), []);
  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch (err) {
      cleanup();
      setError(err?.name === "NotAllowedError" ? "Microphone permission is required to record a voice message." : "Unable to record voice message. Please try again.");
    }
  };

  const stop = (send) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const duration = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
      cleanup();
      if (!send || !blob.size) return;
      try {
        await onSend({ audioData: await blobToDataUrl(blob), audioMimeType: blob.type, audioDuration: duration });
      } catch {
        setError("Voice message could not be sent. Please try again.");
      }
    };
    recorder.stop();
  };

  if (recording) return <div className="voice-recording-controls">
    <button type="button" className="voice-cancel-button" onClick={() => stop(false)}>Cancel</button>
    <span className="voice-recording-status" role="status"><span className="recording-dot" /> Recording {formatTime(elapsed)}</span>
    <button type="button" className="voice-send-button" onClick={() => stop(true)}>Send</button>
  </div>;

  return <>
    <button type="button" className="voice-button" onClick={start} title="Record voice message" aria-label="Record voice message">🎙️</button>
    {error && <span className="voice-error" role="alert">{error}</span>}
  </>;
}

export function AudioMessage({ message }) {
  const url = message.audioUrl?.startsWith("http") ? message.audioUrl : `http://localhost:5000${message.audioUrl || ""}`;
  return <div className="audio-message"><span aria-hidden="true">🎙️</span><audio controls preload="metadata" src={url} aria-label="Voice message" /></div>;
}
