import React, { useEffect, useState, useRef } from "react";
import { motion, useDragControls } from "motion/react";
import { SubtitleSettings } from "../types";

interface SubtitleCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeTrackBlobUrl: string;
  settings: SubtitleSettings;
  onPositionChange: (offset: { x: number; y: number }, position: "custom") => void;
}

export default function SubtitleCanvas({
  videoRef,
  activeTrackBlobUrl,
  settings,
  onPositionChange,
}: SubtitleCanvasProps) {
  const [activeCues, setActiveCues] = useState<VTTCue[]>([]);
  const trackElementRef = useRef<HTMLTrackElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-inject the track when Blob URL changes, and listen to cue changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeTrackBlobUrl) {
      setActiveCues([]);
      return;
    }

    // Clean up old tracks
    const existingTracks = video.querySelectorAll("track");
    existingTracks.forEach((t) => t.remove());

    const trackEl = document.createElement("track");
    trackEl.kind = "subtitles";
    trackEl.src = activeTrackBlobUrl;
    trackEl.default = true;
    
    // Crucial: Mode must be "hidden" so the browser doesn't render its own default subtitles,
    // but still fires "cuechange" events.
    video.appendChild(trackEl);
    
    const textTrack = trackEl.track;
    if (textTrack) {
      textTrack.mode = "hidden";
      const handleCueChange = () => {
        if (textTrack.activeCues) {
          const cues = Array.from(textTrack.activeCues) as VTTCue[];
          setActiveCues(cues);
        } else {
          setActiveCues([]);
        }
      };
      textTrack.addEventListener("cuechange", handleCueChange);
      
      return () => {
        textTrack.removeEventListener("cuechange", handleCueChange);
        if (video.contains(trackEl)) {
          video.removeChild(trackEl);
        }
      };
    }
  }, [videoRef, activeTrackBlobUrl]);

  if (!settings.isVisible || activeCues.length === 0) return null;

  // Compute CSS grid positioning classes
  const getGridPositionClasses = () => {
    if (settings.position === "custom") return "";
    switch (settings.position) {
      case "top-left": return "items-start justify-start p-8";
      case "top-center": return "items-start justify-center p-8";
      case "top-right": return "items-start justify-end p-8";
      case "center-left": return "items-center justify-start p-8";
      case "center": return "items-center justify-center p-8";
      case "center-right": return "items-center justify-end p-8";
      case "bottom-left": return "items-end justify-start p-8";
      case "bottom-center": return "items-end justify-center p-8 pb-24"; // offset for controls
      case "bottom-right": return "items-end justify-end p-8 pb-24";
      default: return "items-end justify-center p-8 pb-24";
    }
  };

  const isCustom = settings.position === "custom";

  return (
    <div 
      className={`absolute inset-0 pointer-events-none z-20 overflow-hidden flex ${isCustom ? "" : getGridPositionClasses()}`}
      ref={containerRef}
    >
      <motion.div
        drag={isCustom}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={containerRef}
        onDragEnd={(e, info) => {
          if (isCustom) {
            onPositionChange(
              { x: settings.customOffset.x + info.offset.x, y: settings.customOffset.y + info.offset.y },
              "custom"
            );
          }
        }}
        initial={false}
        animate={
          isCustom 
            ? { x: settings.customOffset.x, y: settings.customOffset.y } 
            : { x: 0, y: 0 }
        }
        transition={{ type: "tween", duration: 0.1 }}
        style={{
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
        }}
        className={`pointer-events-auto flex flex-col items-center gap-1.5 ${isCustom ? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing" : ""}`}
      >
        {activeCues.map((cue, idx) => (
          <div
            key={cue.id || idx}
            className="px-4 py-1.5 rounded-lg text-center backdrop-blur-sm transition-all"
            style={{
              backgroundColor: `rgba(10, 10, 12, ${settings.bgOpacity})`,
              color: "#f5f2eb",
              textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
              border: "1px solid rgba(245, 242, 235, 0.06)",
              lineHeight: "1.4",
              direction: cue.text.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr",
            }}
            dangerouslySetInnerHTML={{ __html: cue.text.replace(/\n/g, "<br />") }}
          />
        ))}
      </motion.div>
    </div>
  );
}
