import React, { useRef, useState } from "react";
import { Film, Upload, CheckCircle2, AlertTriangle, Users, Play, LogOut, Info, Download } from "lucide-react";
import { RoomDetails, UserInfo } from "../types";
import { motion } from "motion/react";

interface LobbyScreenProps {
  room: RoomDetails;
  currentUserId: string;
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onStartWatch: () => void;
  onLeave: () => void;
  webtorrentProgress?: number;
  isDownloading?: boolean;
}

export default function LobbyScreen({
  room,
  currentUserId,
  onFileSelected,
  selectedFile,
  onStartWatch,
  onLeave,
  webtorrentProgress = 0,
  isDownloading = false
}: LobbyScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const me = room.users.find((u) => u.id === currentUserId);
  const partner = room.users.find((u) => u.id !== currentUserId);
  const isHost = me?.isHost || false;

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const partnerFile = room.currentVideo;

  return (
    <div className="min-h-screen bg-[#111111] text-[#F4E9D8] flex flex-col justify-between p-4 relative overflow-hidden font-sans selection:bg-[#F4E9D8]/20">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F4E9D8]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#D2B48C]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-4xl mx-auto w-full pt-6 flex items-center justify-between z-10 border-b border-[#F4E9D8]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4E9D8] flex items-center justify-center shadow-md">
            <Film className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">Chill Lobby</h1>
            <p className="text-xs text-[#A39E93]">Room: <span className="font-mono font-medium text-[#D2B48C]">{room.roomId}</span></p>
          </div>
        </div>

        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-red-900/20 border border-[#F4E9D8]/10 hover:border-red-500/30 text-xs text-[#A39E93] hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>
      </header>

      {/* Main Grid */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8 z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: File Picker */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 rounded-3xl bg-[#1A1A1A]/80 border border-[#F4E9D8]/10 p-6 backdrop-blur-xl flex flex-col justify-center items-center relative"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="w-full text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shadow-lg shadow-green-500/5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-medium text-[#F4E9D8] max-w-sm mx-auto truncate text-sm">
                    {selectedFile.name}
                  </h3>
                  <p className="text-xs text-[#A39E93] font-mono mt-1">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>

                {/* Info block comparing files */}
                {!isHost && partnerFile && (
                  <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-[#111111] border border-[#F4E9D8]/5 text-right space-y-1.5">
                    {selectedFile.name !== partnerFile.name ? (
                      <>
                        <div className="flex items-center gap-2 justify-end text-amber-400 text-xs font-medium">
                          <span>نام فایل شما با میزبان متفاوت است</span>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] text-[#A39E93] leading-relaxed">
                          مشکلی نیست و دکمه‌های کنترل و ثانیه‌ها همچنان همگام خواهند بود؛ اما جهت داشتن تجربه همسان، پیشنهاد می‌کنیم نسخه یکسانی از فیلم را انتخاب کنید.
                        </p>
                        <p className="text-[10px] text-[#D2B48C] font-mono mt-1 truncate text-left">
                          فایل میزبان: {partnerFile.name}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 justify-end text-green-400 text-xs font-medium">
                        <span>فایل شما با فایل میزبان کاملاً منطبق است! آماده پخش هماهنگ</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#A39E93] hover:text-[#F4E9D8] transition-all py-1.5 px-4 bg-[#111111] rounded-lg border border-[#F4E9D8]/10 cursor-pointer hover:border-[#D2B48C]/40"
                  >
                    تغییر فیلم / Change Movie
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {/* Partner chose a file notice */}
                {!isHost && partnerFile && (
                  <div className="p-3.5 rounded-2xl bg-[#D2B48C]/10 border border-[#D2B48C]/20 text-right flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-medium text-[#D2B48C]">همراه شما فیلم را انتخاب کرده است</h4>
                      <p className="text-[11px] text-[#A39E93] leading-relaxed">
                        میزبان فیلم <span className="text-[#F4E9D8] font-mono font-medium">{partnerFile.name}</span> را آماده کرده است. لطفاً فایل این فیلم را در دستگاه خود انتخاب کنید تا هماهنگ تماشا کنید.
                      </p>
                    </div>
                    <Film className="w-5 h-5 text-[#D2B48C] shrink-0 mt-0.5" />
                  </div>
                )}

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-[#D2B48C] bg-[#D2B48C]/5"
                      : "border-[#F4E9D8]/10 bg-[#F4E9D8]/[0.01] hover:border-[#D2B48C]/50 hover:bg-[#F4E9D8]/[0.03]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#F4E9D8]/5 flex items-center justify-center text-[#A39E93] mb-4 border border-[#F4E9D8]/10 group-hover:text-[#D2B48C] transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-[#F4E9D8]">انتخاب فیلم / Select Movie</h3>
                  <p className="text-xs text-[#A39E93] mt-2 max-w-[240px] leading-relaxed">
                    فایل فیلم خود را به اینجا بکشید یا کلیک کنید تا انتخاب شود.
                  </p>
                  <span className="text-[10px] text-[#A39E93]/60 font-mono mt-3">
                    MP4, WebM, MKV • پخش کاملاً محلی و باکیفیت
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Lobby Sync Status */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 rounded-3xl bg-[#1A1A1A]/80 border border-[#F4E9D8]/10 p-6 backdrop-blur-xl space-y-6"
          >
            <div>
              <h2 className="text-sm font-medium text-[#F4E9D8] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D2B48C]" />
                Room Status
              </h2>
              <p className="text-xs text-[#A39E93] mt-1">
                Waiting for both partners to be ready.
              </p>
            </div>

            <div className="space-y-3">
              {/* Me Status */}
              <div className="flex items-center justify-between p-3.5 bg-[#111111] border border-[#F4E9D8]/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#D2B48C]/10 flex items-center justify-center text-xs text-[#D2B48C] font-medium">
                    You
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-[#F4E9D8]">{me?.username}</h4>
                    <p className="text-[10px] text-[#A39E93] mt-0.5">
                      {selectedFile ? "Ready" : "Selecting..."}
                    </p>
                  </div>
                </div>
                <div>
                  {selectedFile ? (
                    <span className="px-2.5 py-1 text-[10px] bg-green-900/20 border border-green-500/20 text-green-300 rounded-full font-medium">
                      Ready
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] bg-[#F4E9D8]/5 text-[#A39E93] rounded-full font-medium animate-pulse">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Partner Status */}
              <div className="flex items-center justify-between p-3.5 bg-[#111111] border border-[#F4E9D8]/5 rounded-2xl">
                {partner ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F4E9D8]/10 flex items-center justify-center text-xs text-[#F4E9D8] font-medium">
                        {partner.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-[#F4E9D8]">{partner.username}</h4>
                        <p className="text-[10px] text-[#A39E93] mt-0.5">
                          {partner.isHost ? "Host" : "Connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {partner.isHost ? (
                        <span className="px-2.5 py-1 text-[10px] bg-[#D2B48C]/10 border border-[#D2B48C]/20 text-[#D2B48C] rounded-full font-medium">
                          Host
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] bg-green-900/20 border border-green-500/20 text-green-300 rounded-full font-medium">
                          Connected
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center py-3">
                    <p className="text-xs text-[#A39E93]">Share the room code with your partner...</p>
                    <span className="inline-block mt-2 font-mono font-medium bg-[#D2B48C]/10 text-[#D2B48C] border border-[#D2B48C]/20 text-xs px-3 py-1 rounded-lg">
                      {room.roomId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Large Launch Button (Host Only) */}
            {isHost && (
              <button
                onClick={onStartWatch}
                disabled={!selectedFile}
                className={`w-full py-4 px-4 font-medium text-sm rounded-2xl flex items-center justify-center gap-2 transition-all ${
                  selectedFile
                    ? "bg-[#F4E9D8] text-[#111111] hover:bg-white cursor-pointer active:scale-[0.98]"
                    : "bg-[#F4E9D8]/5 text-[#A39E93] cursor-not-allowed"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Go to Cinema</span>
              </button>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pb-4 text-center text-[#A39E93] text-[11px] z-10 border-t border-[#F4E9D8]/5 pt-3">
        <p>No video data is uploaded. Streamed directly between you and your partner.</p>
      </footer>
    </div>
  );
}
