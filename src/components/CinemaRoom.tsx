import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  MessageSquare,
  Send,
  ArrowLeft,
  Tv,
  Subtitles,
  HelpCircle,
  Activity,
  Heart,
  Mic,
  MicOff
} from "lucide-react";
import { RoomDetails, ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import AdvancedVideoPlayer from "./AdvancedVideoPlayer";
import SubtitleSelector from "./SubtitleSelector";
import { useWebRTCStream } from "../utils/useWebRTCStream";

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

interface CinemaRoomProps {
  roomId: string;
  selectedFile: File | null;
  socket: any;
  roomDetails: RoomDetails;
  currentUserId: string;
  onBackToLobby: () => void;
  onFileSelected?: (file: File) => void;
}

export default function CinemaRoom({
  roomId,
  selectedFile,
  socket,
  roomDetails,
  currentUserId,
  onBackToLobby,
  onFileSelected,
}: CinemaRoomProps) {
  const [controlStatus, setControlStatus] = useState<string>("Waiting for movie to start...");
  const [chatMessageText, setChatMessageText] = useState("");
  const [partnerSubtitleFile, setPartnerSubtitleFile] = useState<string | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // Subtitle states
  const [localSubtitle, setLocalSubtitle] = useState<{ url: string; name: string; content: string } | null>(null);

  // Buffering partner states
  const [isPartnerBuffering, setIsPartnerBuffering] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const me = roomDetails.users.find((u) => u.id === currentUserId);
  const partner = roomDetails.users.find((u) => u.id !== currentUserId);
  const isHost = me?.isHost || false;

  const {
    remoteVideoStream,
    remoteVoiceStream,
    isConnected,
    startVideoStream,
    startVoiceChat,
    stopVoiceChat,
    toggleMic,
    localVoiceStream
  } = useWebRTCStream(socket, roomId, isHost);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);

  const handleToggleVoiceChat = async () => {
    if (isVoiceChatActive) {
      stopVoiceChat();
      setIsVoiceChatActive(false);
      setControlStatus("Voice chat disconnected");
    } else {
      const success = await startVoiceChat();
      if (success) {
        setIsVoiceChatActive(true);
        setIsMicMuted(false);
        setControlStatus("Voice chat connected");
      } else {
        setControlStatus("Microphone access denied");
      }
    }
  };

  const handleToggleMic = () => {
    const nextMuted = !isMicMuted;
    toggleMic(nextMuted);
    setIsMicMuted(nextMuted);
  };

  // Play remote voice audio
  useEffect(() => {
    if (remoteVoiceStream) {
      const audio = new Audio();
      audio.srcObject = remoteVoiceStream;
      audio.play().catch(e => console.log("Audio play error:", e));
    }
  }, [remoteVoiceStream]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomDetails.messages]);

  // Sync listener for partner's specific extra signals
  useEffect(() => {
    if (!socket) return;

    const handlePartnerBuffering = ({ userId, isBuffering }: { userId: string; isBuffering: boolean }) => {
      if (userId !== socket.id) {
        setIsPartnerBuffering(isBuffering);
        if (isBuffering) {
          setControlStatus("Partner is buffering...");
        } else {
          setControlStatus("Partner ready. Playback resumed.");
        }
      }
    };

    const handlePartnerSubtitle = ({ userId, filename }: { userId: string; filename: string }) => {
      if (userId !== socket.id) {
        setPartnerSubtitleFile(filename);
        setControlStatus(`Partner loaded subtitle: "${filename}"`);
      }
    };

    const handleReactionReceive = ({ reaction, senderId }: { reaction: string; senderId: string }) => {
      if (senderId !== socket.id) {
        const id = Math.random().toString(36).substring(2, 9);
        const newReaction: FloatingReaction = {
          id,
          emoji: reaction,
          x: Math.random() * 80 + 10,
        };
        setReactions((prev) => [...prev, newReaction]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 3200);
      }
    };

    socket.on("partner-buffering-update", handlePartnerBuffering);
    socket.on("partner-subtitle-update", handlePartnerSubtitle);
    socket.on("reaction-receive", handleReactionReceive);

    return () => {
      socket.off("partner-buffering-update", handlePartnerBuffering);
      socket.off("partner-subtitle-update", handlePartnerSubtitle);
      socket.off("reaction-receive", handleReactionReceive);
    };
  }, [socket]);

  const handleSendReaction = (emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newReaction: FloatingReaction = {
      id,
      emoji,
      x: Math.random() * 80 + 10,
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3200);

    if (socket && roomId) {
      socket.emit("send-reaction", { roomId, reaction: emoji });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim()) return;

    if (socket && roomId) {
      socket.emit("send-message", { roomId, text: chatMessageText.trim() }, (res: any) => {
        if (!res.error) {
          setChatMessageText("");
        }
      });
    }
  };

  const formatChatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleControlActionStatus = (statusText: string) => {
    setControlStatus(statusText);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#F4E9D8] flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-[#F4E9D8]/20">
      {/* Main Row Shell */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10 my-auto">
        
        {/* Left / Center: Center Stage Video Player (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Title Bar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#F4E9D8]/10 flex items-center justify-center text-[#F4E9D8]">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#F4E9D8] max-w-[280px] sm:max-w-md truncate tracking-tight">
                  {selectedFile ? selectedFile.name : (roomDetails.currentVideo?.name || "Shared Stream")}
                </h2>
                <p className="text-[10px] text-[#A39E93] font-mono tracking-widest uppercase">
                  {selectedFile ? `${((selectedFile.size) / (1024 * 1024 * 1024)).toFixed(2)} GB • LOCAL FILE` : 'REMOTE WEBRTC STREAM'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#A39E93] flex items-center gap-1.5 font-mono tracking-widest uppercase">
                <Activity className="w-3 h-3 text-[#D2B48C] animate-pulse" />
                {isConnected ? "WEBRTC CONNECTED" : "CONNECTING..."}
              </span>
            </div>
          </div>

          {/* Core Custom Player Container */}
          <div className="aspect-video w-full relative">
            <AdvancedVideoPlayer
              roomId={roomId}
              selectedFile={selectedFile}
              remoteVideoStream={remoteVideoStream}
              startVideoStream={startVideoStream}
              isHost={isHost}
              socket={socket}
              roomDetails={roomDetails}
              currentUserId={currentUserId}
              onBackToLobby={onBackToLobby}
              subtitleFile={localSubtitle}
              onSubtitleSelected={setLocalSubtitle}
              onControlActionStatus={handleControlActionStatus}
              isPartnerBuffering={isPartnerBuffering}
              onFileSelected={onFileSelected}
            />

            {/* Floating Reactions Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <AnimatePresence>
                {reactions.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ y: "110%", opacity: 0, scale: 0.8, x: 0 }}
                    animate={{
                      y: ["110%", "-20%"],
                      opacity: [0, 1, 1, 0],
                      scale: [0.8, 1.3, 1.3, 0.8],
                      x: [0, (Math.random() > 0.5 ? 30 : -30), (Math.random() > 0.5 ? -20 : 20), 0]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 3,
                      ease: "easeOut"
                    }}
                    style={{
                      position: "absolute",
                      left: `${r.x}%`,
                      bottom: "10px",
                    }}
                    className="text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                  >
                    {r.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Subtitle uploader panel underneath video player */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#1A1A1A] border border-[#F4E9D8]/10 rounded-2xl p-4 backdrop-blur-xl">
            <SubtitleSelector
              selectedSubtitle={localSubtitle}
              onSubtitleSelected={setLocalSubtitle}
            />
            
            <div className="text-left p-1">
              <span className="text-xs font-medium text-[#F4E9D8] block mb-1">Subtitle Guide:</span>
              <p className="text-[11px] text-[#A39E93] leading-relaxed">
                Drag and drop a .srt or .vtt file directly onto the player, or select it here. Subtitles are rendered locally and securely in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: The Glass Sidebar Container (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 rounded-3xl bg-[#1A1A1A]/80 border border-[#F4E9D8]/10 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between h-full overflow-hidden"
          >
            {/* Header section with Avatars */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#F4E9D8]/10 pb-4">
                <h3 className="text-xs font-medium tracking-wider text-[#F4E9D8] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D2B48C]" />
                  Chill Room
                </h3>
                
                {/* Voice Chat Controls */}
                <div className="flex items-center gap-2">
                  {isVoiceChatActive && (
                    <button
                      onClick={handleToggleMic}
                      className={`p-1.5 rounded-lg border transition-all ${isMicMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#D2B48C]/10 border-[#D2B48C]/30 text-[#D2B48C]'}`}
                    >
                      {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={handleToggleVoiceChat}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      isVoiceChatActive 
                        ? 'bg-[#111111] border-[#F4E9D8]/20 text-[#A39E93] hover:text-red-400 hover:border-red-500/30' 
                        : 'bg-[#D2B48C] border-[#D2B48C] text-[#111111] hover:bg-white'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isVoiceChatActive ? 'End Call' : 'Join Voice Call'}
                  </button>
                </div>
              </div>

              {/* Participant Avatars & Pulse indicators */}
              <div className="grid grid-cols-2 gap-3">
                {/* Me */}
                <div className="p-3 bg-[#111111] border border-[#F4E9D8]/5 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center font-medium text-xs text-[#F4E9D8] border border-[#F4E9D8]/10 relative">
                      {me?.username.slice(0, 2).toUpperCase()}
                      {/* Active green ring */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#111111] rounded-full" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-[#F4E9D8] truncate">{me?.username}</h4>
                      <p className="text-[10px] text-[#A39E93] font-mono mt-0.5">You</p>
                    </div>
                  </div>
                </div>

                {/* Partner */}
                <div className="p-3 bg-[#111111] border border-[#F4E9D8]/5 rounded-2xl relative overflow-hidden">
                  {partner ? (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F4E9D8] flex items-center justify-center font-medium text-xs text-[#111111] relative">
                        {partner.username.slice(0, 2).toUpperCase()}
                        {/* Pulser ring */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-[#111111] rounded-full ${
                          isPartnerBuffering ? "bg-[#D2B48C] animate-ping" : "bg-green-500"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-medium text-[#F4E9D8] truncate">{partner.username}</h4>
                        <p className={`text-[10px] font-mono mt-0.5 ${isPartnerBuffering ? "text-[#D2B48C] animate-pulse" : "text-[#A39E93]"}`}>
                          {isPartnerBuffering ? "Buffering..." : "Connected"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-8">
                      <span className="text-[10px] text-[#A39E93]">Waiting for partner...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Action Banner - Highly visual */}
              <div className="p-3 bg-[#111111] border border-[#D2B48C]/20 rounded-2xl flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#D2B48C] animate-pulse shrink-0" />
                <div className="text-[10px] text-[#D2B48C] font-mono truncate">
                  {controlStatus}
                </div>
              </div>
            </div>

            {/* Minimalist Sync Chat panel */}
            <div className="flex-1 flex flex-col justify-between mt-4 overflow-hidden h-[300px] min-h-[220px]">
              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {roomDetails.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#A39E93]">
                    <MessageSquare className="w-6 h-6 opacity-30 mb-2" />
                    <p className="text-[10px]">Chat securely with your partner while watching.</p>
                  </div>
                ) : (
                  roomDetails.messages.map((msg) => {
                    const isSystem = msg.username === "System";
                    const isMe = msg.username === me?.username;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="text-center">
                          <span className="inline-block px-3 py-1 bg-[#111111] border border-[#F4E9D8]/10 text-[9px] text-[#A39E93] rounded-full">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-medium text-[#A39E93]">
                            {isMe ? "You" : msg.username}
                          </span>
                          <span className="text-[9px] text-[#A39E93]/50 font-mono">
                            {formatChatTime(msg.timestamp)}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                            isMe
                              ? "bg-[#D2B48C] text-[#111111] rounded-tr-none"
                              : "bg-[#111111] border border-[#F4E9D8]/10 text-[#F4E9D8] rounded-tl-none"
                          }`}
                          style={{ wordBreak: "break-word" }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reactions Bar */}
              <div className="flex items-center gap-2.5 justify-center py-2.5 border-t border-[#F4E9D8]/5 mt-3">
                {['❤️', '😂', '👏', '😮', '🍿', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111111] hover:bg-[#D2B48C]/20 border border-[#F4E9D8]/5 hover:border-[#D2B48C]/30 text-base transition-all active:scale-90 hover:scale-110 cursor-pointer"
                    title={`Send ${emoji} reaction`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#F4E9D8]/10 bg-transparent">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatMessageText}
                    onChange={(e) => setChatMessageText(e.target.value)}
                    className="w-full bg-[#111111] border border-[#F4E9D8]/10 rounded-xl pr-10 pl-4 py-2 text-xs text-[#F4E9D8] placeholder:text-[#A39E93] focus:outline-none focus:border-[#D2B48C] focus:ring-1 focus:ring-[#D2B48C]/30 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 p-1.5 bg-[#D2B48C] hover:bg-white text-[#111111] rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
