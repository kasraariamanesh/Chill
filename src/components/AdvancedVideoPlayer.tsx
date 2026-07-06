import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  ArrowLeft,
  Settings,
  Activity,
  Rewind,
  FastForward,
  Film,
} from "lucide-react";
import { RoomDetails, VideoState, SubtitleSettings } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { shiftWebVttTimestamps } from "../utils/subtitleUtils";
import SubtitleCanvas from "./SubtitleCanvas";
import SubtitleControls from "./SubtitleControls";

interface VideoPlayerProps {
  roomId: string;
  selectedFile: File | null;
  remoteVideoStream?: MediaStream | null;
  startVideoStream?: (stream: MediaStream) => void;
  isHost: boolean;
  socket: any;
  roomDetails: RoomDetails;
  currentUserId: string;
  onBackToLobby: () => void;
  // Subtitle states passed from parent
  subtitleFile: { url: string; name: string; content: string } | null;
  onSubtitleSelected: (subtitle: { url: string; name: string; content: string } | null) => void;
  onControlActionStatus: (status: string) => void;
  // Buffering partner states
  isPartnerBuffering: boolean;
  onFileSelected?: (file: File) => void;
}

export default function AdvancedVideoPlayer({
  roomId,
  selectedFile,
  remoteVideoStream,
  startVideoStream,
  isHost,
  socket,
  roomDetails,
  currentUserId,
  onBackToLobby,
  subtitleFile,
  onSubtitleSelected,
  onControlActionStatus,
  isPartnerBuffering,
  onFileSelected,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [actionOverlay, setActionOverlay] = useState<{ icon: React.ReactNode, id: number } | null>(null);

  const triggerActionOverlay = (icon: React.ReactNode) => {
    setActionOverlay({ icon, id: Date.now() });
    setTimeout(() => setActionOverlay(null), 800);
  };

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "lagging">("synced");

  // Local buffering state
  const [isLocalBuffering, setIsLocalBuffering] = useState(false);

  // Subtitle Settings Menu & State
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [activeTrackBlobUrl, setActiveTrackBlobUrl] = useState<string>("");
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    fontSize: 24,
    bgOpacity: 0.85,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    position: "bottom-center",
    customOffset: { x: 0, y: 0 },
    delay: 0,
    isVisible: true,
  });

  // Guard flags to prevent infinite socket broadcast feedback loops
  const isRemoteChange = useRef(false);
  const lastReceivedSync = useRef<{ isPlaying: boolean; currentTime: number; timestamp: number } | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ambient lighting color (starts as dark luxury)
  const [ambientColor, setAmbientColor] = useState("rgba(245, 242, 235, 0.03)");

  // Internal file input handler
  const innerFileInputRef = useRef<HTMLInputElement>(null);
  const handleInnerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileSelected) {
      onFileSelected(e.target.files[0]);
    }
  };

  // 1. Manage Video Source (Local File vs WebRTC Stream)
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
      
      // Attempt to capture stream once video is ready (for host to guest fallback)
      const handleCanPlay = () => {
        if (isHost && videoRef.current && startVideoStream) {
          const videoAny = videoRef.current as any;
          const stream = videoAny.captureStream ? videoAny.captureStream() : videoAny.mozCaptureStream ? videoAny.mozCaptureStream() : null;
          if (stream) {
            startVideoStream(stream);
          }
        }
      };

      videoRef.current?.addEventListener('canplay', handleCanPlay, { once: true });

      return () => {
        URL.revokeObjectURL(url);
        videoRef.current?.removeEventListener('canplay', handleCanPlay);
      };
    } else {
      setVideoUrl("");
      if (!isHost && remoteVideoStream && videoRef.current) {
        videoRef.current.srcObject = remoteVideoStream;
      }
    }
  }, [selectedFile, remoteVideoStream, isHost, startVideoStream]);

  // 2. Manage Subtitle Blob URL with delay offset adjustment
  useEffect(() => {
    if (!subtitleFile) {
      setActiveTrackBlobUrl("");
      return;
    }

    try {
      // Shift timestamps based on delay
      const shiftedContent = shiftWebVttTimestamps(subtitleFile.content, subtitleSettings.delay);
      const blob = new Blob([shiftedContent], { type: "text/vtt;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      // Clean up previous blob URL
      if (activeTrackBlobUrl) {
        URL.revokeObjectURL(activeTrackBlobUrl);
      }

      setActiveTrackBlobUrl(blobUrl);

      // Inform parent / partner about subtitle changes
      if (socket && roomId) {
        socket.emit("subtitle-status", { roomId, filename: subtitleFile.name });
      }
    } catch (err) {
      console.error("Failed to parse subtitle delay:", err);
    }
  }, [subtitleFile, subtitleSettings.delay]);

  // Cleanup active subtitle blob URL on unmount
  useEffect(() => {
    return () => {
      if (activeTrackBlobUrl) URL.revokeObjectURL(activeTrackBlobUrl);
    };
  }, [activeTrackBlobUrl]);


  // 3. Dynamic Ambilight/Ambient Glow calculations (Sampled at 1.5s interval)
  useEffect(() => {
    if (!videoRef.current || !isPlaying) return;

    const sampleDominantColor = () => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 16, 16);
          const imgData = ctx.getImageData(0, 0, 16, 16).data;

          let r = 0, g = 0, b = 0;
          const pixelCount = 16 * 16;
          for (let i = 0; i < imgData.length; i += 4) {
            r += imgData[i];
            g += imgData[i + 1];
            b += imgData[i + 2];
          }

          r = Math.floor(r / pixelCount);
          g = Math.floor(g / pixelCount);
          b = Math.floor(b / pixelCount);

          // Boost color brightness slightly for better visual feedback
          const maxColor = Math.max(r, g, b, 40);
          const boost = 130 / maxColor;
          const glowR = Math.min(255, Math.floor(r * (boost > 1 ? boost : 1)));
          const glowG = Math.min(255, Math.floor(g * (boost > 1 ? boost : 1)));
          const glowB = Math.min(255, Math.floor(b * (boost > 1 ? boost : 1)));

          setAmbientColor(`rgba(${glowR}, ${glowG}, ${glowB}, 0.22)`);
        }
      } catch (err) {
        // Safe check for external or protected content (local files have no issues)
      }
    };

    const intervalId = setInterval(sampleDominantColor, 1500);
    return () => clearInterval(intervalId);
  }, [isPlaying]);

  // 4. Force Partner's player to pause if current user starts buffering
  useEffect(() => {
    if (socket && roomId) {
      socket.emit("buffering-status", { roomId, isBuffering: isLocalBuffering });
    }
  }, [isLocalBuffering, socket, roomId]);

  // 5. Force video play state in response to partner's buffering state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPartnerBuffering) {
      // Store current state and pause
      video.pause();
    } else {
      // If we were playing before, we can resume
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [isPartnerBuffering]);

  // 6. Socket Synchronization Signal Handlers
  useEffect(() => {
    if (!socket) return;

    const handleSyncReceive = ({ state, senderId }: { state: VideoState; senderId: string }) => {
      const video = videoRef.current;
      if (!video || senderId === socket.id) return;

      console.log("📥 Remote sync event received: ", state);
      
      // Store the received state in our lock ref
      lastReceivedSync.current = {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        timestamp: Date.now()
      };

      isRemoteChange.current = true;
      setIsSyncing(true);
      setSyncStatus("syncing");

      // Check if drift is significant
      const timeDiff = Math.abs(video.currentTime - state.currentTime);
      if (timeDiff > 1.2) {
        video.currentTime = state.currentTime;
      }

      // Handle play / pause action
      if (state.isPlaying && video.paused) {
        video.play()
          .then(() => {
            const partnerName = roomDetails.users.find(u => u.id === senderId)?.username || "Partner";
            onControlActionStatus(`${partnerName} started playback`);
          })
          .catch((e) => console.log("Play failed:", e));
      } else if (!state.isPlaying && !video.paused) {
        video.pause();
        const partnerName = roomDetails.users.find(u => u.id === senderId)?.username || "Partner";
        onControlActionStatus(`${partnerName} paused playback`);
      }

      setTimeout(() => {
        isRemoteChange.current = false;
        setIsSyncing(false);
        setSyncStatus("synced");
      }, 500);
    };

    socket.on("video-sync-receive", handleSyncReceive);

    // Host continuously broadcasts its time and duration to the guest
    let hostBroadcastInterval: NodeJS.Timeout;
    if (isHost) {
      hostBroadcastInterval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          socket.emit("host-time-update", {
            roomId,
            currentTime: videoRef.current.currentTime,
            duration: videoRef.current.duration
          });
        }
      }, 1000);
    } else {
      // Guest receives time updates to update the UI slider
      socket.on("host-time-update-receive", ({ currentTime: hostTime, duration: hostDuration }: any) => {
        if (!selectedFile) {
          setCurrentTime(hostTime);
        }
        if (hostDuration && duration !== hostDuration) {
          setDuration(hostDuration);
        }
      });
    }

    // Dynamic latency check query responses
    const handlePartnerQuery = ({ requesterId }: { requesterId: string }) => {
      const video = videoRef.current;
      if (video && isHost) {
        socket.emit("respond-partner-time", {
          roomId,
          requesterId,
          currentTime: video.currentTime,
          isPlaying: !video.paused,
        });
      }
    };

    const handlePartnerQueryResult = ({ currentTime: partnerTime, isPlaying: partnerPlaying }: any) => {
      const video = videoRef.current;
      if (!video) return;

      // Guest aligns to host
      if (!isHost) {
        const diff = Math.abs(video.currentTime - partnerTime);
        if (diff > 1.2) {
          console.log(`⏱ Drift detected on guest: ${diff * 1000}ms. Re-aligning with host.`);
          
          lastReceivedSync.current = {
            isPlaying: partnerPlaying,
            currentTime: partnerTime,
            timestamp: Date.now()
          };

          isRemoteChange.current = true;
          video.currentTime = partnerTime;
          
          if (partnerPlaying && video.paused) {
            video.play().catch(() => {});
          } else if (!partnerPlaying && !video.paused) {
            video.pause();
          }

          setTimeout(() => {
            isRemoteChange.current = false;
          }, 500);
        }
      }
    };

    socket.on("request-partner-time-query", handlePartnerQuery);
    socket.on("respond-partner-time-result", handlePartnerQueryResult);

    // Drift / Sync Heartbeat every 2 seconds
    const syncCheckInterval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && roomDetails.users.length > 1 && !isHost) {
        socket.emit("request-partner-time", { roomId });
      }
    }, 2000);

    return () => {
      socket.off("video-sync-receive", handleSyncReceive);
      socket.off("host-time-update-receive");
      socket.off("request-partner-time-query", handlePartnerQuery);
      socket.off("respond-partner-time-result", handlePartnerQueryResult);
      clearInterval(syncCheckInterval);
      if (hostBroadcastInterval) clearInterval(hostBroadcastInterval);
    };
  }, [socket, roomId, roomDetails, isPlaying, duration, isHost]);

  // 7. Video Action Signal Emitters
  const emitSyncState = (isPlayingState: boolean, timeState: number) => {
    if (isRemoteChange.current || !socket) return;

    // Check if this matches our last received sync event to prevent feedback loops
    if (lastReceivedSync.current) {
      const received = lastReceivedSync.current;
      const timeDiff = Math.abs(received.currentTime - timeState);
      const isPlayStateMatch = received.isPlaying === isPlayingState;
      const timeElapsed = Date.now() - received.timestamp;
      
      if (isPlayStateMatch && (timeDiff < 1.5 || timeElapsed < 1200)) {
        console.log("🚫 Blocking feedback loop emission", { isPlayingState, timeState, timeDiff, timeElapsed });
        return;
      }
    }

    console.log("📤 Emitting sync event to partner:", { isPlaying: isPlayingState, currentTime: timeState });
    socket.emit("video-sync", {
      roomId,
      state: {
        isPlaying: isPlayingState,
        currentTime: timeState,
        timestamp: Date.now(),
      },
    });
  };

  const onPlay = () => {
    setIsPlaying(true);
    emitSyncState(true, videoRef.current?.currentTime || 0);
    onControlActionStatus("You started playback");
  };

  const onPause = () => {
    if (isLocalBuffering || isPartnerBuffering) {
      console.log("⏸ Programmatic pause due to buffering. Retaining play intent.");
      return;
    }
    setIsPlaying(false);
    emitSyncState(false, videoRef.current?.currentTime || 0);
    onControlActionStatus("You paused playback");
  };

  const onSeeked = () => {
    const time = videoRef.current?.currentTime || 0;
    setCurrentTime(time);
    emitSyncState(isPlaying, time);
    onControlActionStatus(`You jumped to ${formatTime(time)}`);
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const onWaiting = () => {
    setIsLocalBuffering(true);
  };

  const onPlaying = () => {
    setIsLocalBuffering(false);
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // 8. Manual Control Trigger Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || isPartnerBuffering) return;

    if (isHost || selectedFile) {
      if (video.paused) {
        video.play().catch((e) => console.log(e));
        triggerActionOverlay(<Play className="w-12 h-12 text-white fill-white ml-2" />);
      } else {
        video.pause();
        triggerActionOverlay(<Pause className="w-12 h-12 text-white fill-white" />);
      }
    } else {
      // Guest toggling play without local file sends sync event to host
      emitSyncState(!isPlaying, currentTime);
      onControlActionStatus(`You requested to ${isPlaying ? "pause" : "play"}`);
      triggerActionOverlay(isPlaying ? <Pause className="w-12 h-12 text-white fill-white" /> : <Play className="w-12 h-12 text-white fill-white ml-2" />);
    }
  };

  const skipBackward15 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, currentTime - 15);
    if (isHost || selectedFile) video.currentTime = newTime;
    setCurrentTime(newTime);
    emitSyncState(isPlaying, newTime);
    onControlActionStatus("Seeked backward 15s");
    triggerActionOverlay(<Rewind className="w-12 h-12 text-white fill-white" />);
  };

  const skipForward15 = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.min(duration, currentTime + 15);
    if (isHost || selectedFile) video.currentTime = newTime;
    setCurrentTime(newTime);
    emitSyncState(isPlaying, newTime);
    onControlActionStatus("Seeked forward 15s");
    triggerActionOverlay(<FastForward className="w-12 h-12 text-white fill-white" />);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    if (isHost || selectedFile) {
      video.currentTime = newTime;
    }
    setCurrentTime(newTime);
    emitSyncState(isPlaying, newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMute = !isMuted;
    setIsMuted(nextMute);
    video.muted = nextMute;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.log(err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.log(err));
    }
  };

  const forceManualRealign = () => {
    if (!socket) return;
    setSyncStatus("syncing");
    socket.emit("request-partner-time", { roomId });
  };

  // Keyboard support (Space, Arrows, F, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          e.preventDefault();
          skipBackward15();
          break;
        case "arrowright":
          e.preventDefault();
          skipForward15();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, isMuted, isPartnerBuffering]);

  // Auto-hide Control Bar
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isSubtitleMenuOpen) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isSubtitleMenuOpen]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${mins}:${pad(secs)}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full bg-[#050507] overflow-hidden flex items-center justify-center select-none rounded-3xl border border-white/5 shadow-2xl transition-all ${
        !showControls && isFullscreen ? "cursor-none" : ""
      }`}
      style={{
        boxShadow: `0 25px 70px -10px ${ambientColor}, 0 0 100px -20px ${ambientColor}`,
      }}
    >
      {/* Background ambient lighting element */}
      <div
        className="absolute inset-[-10px] blur-[110px] opacity-40 pointer-events-none rounded-full transition-all duration-[1500ms]"
        style={{
          background: `radial-gradient(circle, ${ambientColor} 0%, transparent 70%)`,
        }}
      />

      {/* Hidden file input for internal changer */}
      <input
        ref={innerFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleInnerFileChange}
      />

      {/* Video element */}
      {videoUrl || (!isHost && remoteVideoStream) ? (
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          autoPlay={!isHost}
          onClick={togglePlay}
          onPlay={onPlay}
          onPause={onPause}
          onSeeked={onSeeked}
          onTimeUpdate={onTimeUpdate}
          onWaiting={onWaiting}
          onPlaying={onPlaying}
          onLoadedMetadata={onLoadedMetadata}
          controls={false}
          crossOrigin="anonymous"
          className="w-full h-full object-contain cursor-pointer relative z-10"
        />
      ) : (
        /* Cinematic elegant placeholder when no movie has been loaded on this device yet */
        <div 
          onClick={() => innerFileInputRef.current?.click()}
          className="absolute inset-0 z-15 flex flex-col items-center justify-center p-8 text-center cursor-pointer bg-gradient-to-b from-[#09090c] to-[#040407] hover:from-[#0d0d12] hover:to-[#060609] transition-all group border border-white/5 rounded-3xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#D2B48C]/5 border border-[#D2B48C]/10 flex items-center justify-center text-[#D2B48C] mb-4 group-hover:scale-105 transition-all shadow-lg shadow-[#D2B48C]/5 duration-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-medium text-[#F4E9D8]">فیلمی انتخاب نشده است</h3>
          <p className="text-xs text-[#A39E93] mt-2 max-w-xs leading-relaxed">
            برای پخش باکیفیت بالا و بدون قطعی، لطفاً فایل فیلم خود را انتخاب کنید. دکمه‌های کنترل و ثانیه‌ها کاملاً هماهنگ می‌شوند.
          </p>
          <button className="mt-5 px-5 py-2.5 rounded-xl bg-[#D2B48C] hover:bg-white text-[#111111] text-xs font-medium transition-all active:scale-95 shadow-md shadow-[#D2B48C]/10">
            انتخاب فایل ویدیو / Select Video
          </button>
        </div>
      )}

      {/* Advanced Custom Subtitle Overlay Engine */}
      <SubtitleCanvas
        videoRef={videoRef}
        activeTrackBlobUrl={activeTrackBlobUrl}
        settings={subtitleSettings}
        onPositionChange={(offset, position) => {
          setSubtitleSettings((prev) => ({ ...prev, customOffset: offset, position }));
        }}
      />

      {/* Buffering/Loading Indicator Overlays */}
      <AnimatePresence>
        {isLocalBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 z-20 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none"
          >
            <div className="p-4 rounded-full bg-black/60 border border-white/10 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <span className="text-xs text-[#D2B48C] font-medium font-sans mt-3 px-3 py-1 bg-[#D2B48C]/10 border border-[#D2B48C]/20 rounded-full">
              Buffering stream...
            </span>
          </motion.div>
        )}

        {isPartnerBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#060608]/80 z-20 flex flex-col items-center justify-center backdrop-blur-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#F4E9D8]">Partner is buffering...</h3>
            <p className="text-xs text-[#A39E93] mt-1.5 max-w-xs text-center leading-relaxed">
              Playback paused while your partner catches up. It will resume automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Overlay controls bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-30"
          >
            <button
              onClick={onBackToLobby}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-[#F4E9D8] transition-all backdrop-blur-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Leave Room</span>
            </button>

            {/* Sync Control Indicators */}
            <div className="flex items-center gap-3">
              <button
                onClick={forceManualRealign}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#F4E9D8] transition-all backdrop-blur-md cursor-pointer"
                title="Force Sync"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#D2B48C]" : ""}`} />
                <span className="text-[10px] font-medium">Re-sync</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Overlay (Play/Pause/Skip animations) */}
      <AnimatePresence>
        {actionOverlay && (
          <motion.div
            key={actionOverlay.id}
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute z-20 flex items-center justify-center p-6 bg-black/40 rounded-full backdrop-blur-md pointer-events-none"
          >
            {actionOverlay.icon}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Play/Pause Button overlay */}
      <AnimatePresence>
        {!isPlaying && showControls && !isPartnerBuffering && !actionOverlay && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            className="absolute p-6 bg-[#D2B48C]/90 text-[#111111] rounded-full hover:bg-[#D2B48C] transition-all z-20 cursor-pointer shadow-lg shadow-[#D2B48C]/20 backdrop-blur-sm"
          >
            <Play className="w-8 h-8 fill-current ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Subtitles Overlay Panel Menu */}
      <AnimatePresence>
        {isSubtitleMenuOpen && (
          <SubtitleControls
            settings={subtitleSettings}
            onSettingsChange={setSubtitleSettings}
            onClose={() => setIsSubtitleMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom control overlay bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30"
          >
            <div className="space-y-4">
              {/* Timeline Progress Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-300 font-mono w-12 text-right">
                  {formatTime(currentTime)}
                </span>

                <div className="flex-1 relative group h-1.5 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#D2B48C] group-hover:h-1.5 transition-all"
                    style={{
                      background: `linear-gradient(to right, #D2B48C 0%, #D2B48C ${
                        (currentTime / (duration || 100)) * 100
                      }%, rgba(255, 255, 255, 0.2) ${
                        (currentTime / (duration || 100)) * 100
                      }%, rgba(255, 255, 255, 0.2) 100%)`,
                    }}
                  />
                </div>

                <span className="text-xs text-gray-300 font-mono w-12">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between">
                {/* Volume & Sync Status */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3 group/volume">
                    <button
                      onClick={toggleMute}
                      className="text-gray-300 hover:text-white transition-all cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-red-400" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-20 md:w-24 transition-all duration-300 h-1 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#D2B48C]"
                      style={{
                        background: `linear-gradient(to right, #D2B48C 0%, #D2B48C ${
                          (isMuted ? 0 : volume) * 100
                        }%, rgba(255, 255, 255, 0.2) ${
                          (isMuted ? 0 : volume) * 100
                        }%, rgba(255, 255, 255, 0.2) 100%)`,
                      }}
                    />
                  </div>

                  {/* Sync status Indicator pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        syncStatus === "synced"
                          ? "bg-emerald-400"
                          : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    <span className="text-[9px] text-gray-300 font-mono uppercase tracking-wider hidden sm:inline-block">
                      {syncStatus === "synced" ? "Synced" : "Syncing"}
                    </span>
                  </div>
                </div>

                {/* Primary Play Pause button and Skips */}
                <div className="flex items-center justify-center gap-4 flex-1">
                  <button
                    onClick={skipBackward15}
                    disabled={isPartnerBuffering}
                    className={`p-2 rounded-full transition-all cursor-pointer hover:bg-white/10 ${
                      isPartnerBuffering ? "text-[#A39E93] opacity-50" : "text-white hover:text-[#D2B48C]"
                    }`}
                  >
                    <Rewind className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={isPartnerBuffering}
                    className={`p-3 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                      isPartnerBuffering ? "bg-[#111111] text-[#A39E93]" : "bg-[#D2B48C] hover:bg-white text-[#111111]"
                    }`}
                  >
                    {isPlaying && !isPartnerBuffering ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={skipForward15}
                    disabled={isPartnerBuffering}
                    className={`p-2 rounded-full transition-all cursor-pointer hover:bg-white/10 ${
                      isPartnerBuffering ? "text-[#A39E93] opacity-50" : "text-white hover:text-[#D2B48C]"
                    }`}
                  >
                    <FastForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Subtitles advanced control, Fullscreen */}
                <div className="flex items-center justify-end gap-3 flex-1">
                  {onFileSelected && (
                    <button
                      onClick={() => innerFileInputRef.current?.click()}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="انتخاب یا تغییر فایل ویدیو / Choose Video File"
                    >
                      <Film className="w-4 h-4" />
                    </button>
                  )}

                  {subtitleFile && (
                    <button
                      onClick={() => setIsSubtitleMenuOpen(!isSubtitleMenuOpen)}
                      className={`p-2 rounded-xl transition-all border ${
                        isSubtitleMenuOpen
                          ? "bg-[#D2B48C]/20 border-[#D2B48C]/40 text-[#D2B48C]"
                          : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                      }`}
                      title="Advanced Subtitle Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
