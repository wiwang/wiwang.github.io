"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AmbientAudio, soundscapeFor } from "@/lib/ambient-audio";

export function MusicPlayer() {
  const pathname = usePathname();
  const mood = soundscapeFor(pathname ?? "/");
  const engine = useRef<AmbientAudio | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    engine.current?.setMood(soundscapeFor(pathname ?? "/"));
  }, [pathname]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        void engine.current?.pause().catch(() => {});
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);
  async function toggle() {
    setBusy(true);
    try {
      if (!engine.current) engine.current = new AmbientAudio(mood, volume);
      if (playing) await engine.current.pause();
      else await engine.current.play();
      setPlaying(!playing);
      setError("");
    } catch {
      setError("Audio is unavailable in this browser.");
      setPlaying(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="music-player wrap"
      aria-label="Optional background music"
    >
      <div className="music-description">
        <span className="eyebrow">READING SOUNDS</span>
        <span>{mood.name}</span>
      </div>
      <div className="music-controls">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={playing}
          aria-label={
            playing ? "Pause background music" : "Play background music"
          }
        >
          {playing ? "Pause" : "Play"}{" "}
          <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
        </button>
        <label>
          Volume
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              setVolume(value);
              engine.current?.setVolume(value);
            }}
          />
        </label>
      </div>
      {error && <span role="status">{error}</span>}
    </section>
  );
}
