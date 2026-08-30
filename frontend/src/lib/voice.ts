// Voice in, voice out — Web Speech API, zero keys, zero servers.
//
// - useSpeechInput: press the mic, speak in Hindi/Hinglish/English, get text.
//   Uses the browser's built-in SpeechRecognition (hi-IN handles code-switched
//   Hindi + English well). Falls back gracefully where unsupported.
// - useSpeaker: read an answer aloud with speechSynthesis, picking a Hindi
//   voice for Devanagari answers and an Indian-English voice otherwise.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech typings — not in TS lib.dom, and Chrome only exposes
// the webkit-prefixed constructor.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  /** live transcript while the farmer is still speaking */
  interim: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechInput(onFinal: (text: string) => void): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return;

    const rec = new Ctor();
    // hi-IN recognizes Hindi and code-switched Hinglish; plain English
    // still comes through fine for most Indian accents.
    rec.lang = "hi-IN";
    rec.continuous = false;
    rec.interimResults = true;
    finalRef.current = "";

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(finalRef.current + interimText);
    };
    rec.onerror = () => {
      // mic denied / no speech / no service — just reset quietly
      recRef.current = null;
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onFinalRef.current(text);
    };

    recRef.current = rec;
    setListening(true);
    setInterim("");
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, []);

  return { supported, listening, interim, start, stop };
}

// ---------- text-to-speech ----------

const DEVANAGARI = /[ऀ-ॿ]/;

/** Strip the markdown-ish bits we render so TTS reads clean sentences. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*([-*•]|\d+[.)])\s*/gm, "")
    .replace(/[#_`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ??
    voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()),
    ) ??
    null
  );
}

export interface Speaker {
  supported: boolean;
  /** index of the exchange currently being read aloud, or null */
  speakingIndex: number | null;
  speak: (index: number, text: string) => void;
  stopSpeaking: () => void;
}

export function useSpeaker(): Speaker {
  const [supported, setSupported] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    // Chrome loads voices asynchronously; poke the list once.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  }, []);

  const speak = useCallback((index: number, text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const clean = cleanForSpeech(text);
    if (!clean) return;
    const lang = DEVANAGARI.test(clean) ? "hi-IN" : "en-IN";
    const voice = pickVoice(lang);

    // Chunk by sentence: very long utterances get cut off on some engines.
    const sentences = clean.match(/[^.。!?।]+[.。!?।]?/g) ?? [clean];
    const chunks: string[] = [];
    let cur = "";
    for (const s of sentences) {
      if ((cur + s).length > 180 && cur) {
        chunks.push(cur);
        cur = s;
      } else cur += s;
    }
    if (cur.trim()) chunks.push(cur);

    setSpeakingIndex(index);
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk.trim());
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = 1;
      if (i === chunks.length - 1) {
        u.onend = () => setSpeakingIndex(null);
        u.onerror = () => setSpeakingIndex(null);
      }
      synth.speak(u);
    });
  }, []);

  return { supported, speakingIndex, speak, stopSpeaking };
}
