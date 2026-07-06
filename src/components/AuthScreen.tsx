import React, { useState } from "react";
import { Film, LogIn, Lock, User, Sparkles, Tv, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface AuthScreenProps {
  onJoin: (roomId: string, username: string, password?: string) => void;
  isLoading: boolean;
  errorMsg: string | null;
}

export default function AuthScreen({ onJoin, isLoading, errorMsg }: AuthScreenProps) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    onJoin(roomId.trim().toUpperCase(), username.trim(), password ? password : undefined);
  };

  const generateRandomRoomId = () => {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(code);
    setIsCreating(true);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#F4E9D8] flex flex-col justify-between p-4 relative overflow-hidden font-sans selection:bg-[#F4E9D8]/20">
      {/* Decorative premium ambient glow */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-[#F4E9D8]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-[#D2B48C]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-md mx-auto w-full pt-10 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4E9D8] flex items-center justify-center shadow-lg shadow-[#F4E9D8]/10">
            <Film className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F4E9D8]">
              Chill
            </h1>
            <p className="text-[10px] text-[#A39E93] font-mono tracking-widest uppercase">
              Couples Watch Party
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4E9D8]/5 border border-[#F4E9D8]/10 text-[10px] text-[#F4E9D8] font-mono uppercase tracking-wider backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-[#D2B48C] rounded-full animate-pulse" />
          <span>Sync Active</span>
        </div>
      </header>

      {/* Main card */}
      <main className="max-w-md mx-auto w-full my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-[#1A1A1A]/80 border border-[#F4E9D8]/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        >
          {/* Inner ambient shine */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F4E9D8]/20 to-transparent" />

          <div className="mb-8">
            <h2 className="text-2xl font-medium text-[#F4E9D8] tracking-tight">
              {isCreating ? "Create a Room" : "Join your Partner"}
            </h2>
            <p className="text-sm text-[#A39E93] mt-2 leading-relaxed">
              Watch movies together in perfect sync. A private cinema designed just for the two of you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#A39E93] flex items-center justify-between">
                <span>Your Name</span>
              </label>
              <input
                type="text"
                required
                placeholder="E.g. Emma"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#111111] border border-[#F4E9D8]/10 hover:border-[#F4E9D8]/20 focus:border-[#F4E9D8]/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#F4E9D8]/5 text-sm transition-all placeholder:text-[#555] text-[#F4E9D8]"
              />
            </div>

            {/* Room ID */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#A39E93] flex items-center justify-between">
                <span>Room Code</span>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={generateRandomRoomId}
                    className="text-[11px] text-[#D2B48C] hover:text-[#F4E9D8] flex items-center gap-1 transition-colors font-medium cursor-pointer"
                  >
                    + Create New Room
                  </button>
                )}
              </label>
              <input
                type="text"
                required
                placeholder="Enter invite code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 bg-[#111111] border border-[#F4E9D8]/10 hover:border-[#F4E9D8]/20 focus:border-[#F4E9D8]/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#F4E9D8]/5 text-sm font-mono tracking-widest text-[#F4E9D8] transition-all uppercase placeholder:text-[#555]"
              />
            </div>

            {/* Room Password */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#A39E93] flex items-center gap-2">
                Room Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Keep it private"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#111111] border border-[#F4E9D8]/10 hover:border-[#F4E9D8]/20 focus:border-[#F4E9D8]/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#F4E9D8]/5 text-sm transition-all placeholder:text-[#555] text-[#F4E9D8]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-900/20 border border-red-500/20 text-red-200 rounded-xl text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-[#F4E9D8] text-[#111111] hover:bg-white disabled:opacity-50 text-sm font-medium rounded-2xl shadow-lg shadow-[#F4E9D8]/5 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#111111]/30 border-t-[#111111] rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isCreating ? "Create & Enter" : "Enter Cinema"}</span>
                </>
              )}
            </button>
          </form>

          {isCreating && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setRoomId("");
                }}
                className="text-xs text-[#A39E93] hover:text-[#F4E9D8] transition-all underline decoration-[#A39E93]/50 cursor-pointer"
              >
                Back to joining an existing room
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Info Notice */}
      <div className="max-w-md mx-auto w-full pb-4 px-4 z-10">
        <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#F4E9D8]/5 flex items-start gap-3">
          <Lock className="w-4 h-4 text-[#A39E93] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#A39E93] leading-relaxed">
            <span className="font-medium text-[#F4E9D8] block mb-0.5">End-to-End Privacy</span>
            Chill establishes a direct peer-to-peer connection for streaming. Your video files are never uploaded to any server.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full pb-6 text-center text-[#555] text-[10px] z-10 font-mono">
        <p>CHILL © 2026 • DESIGNED FOR COUPLES</p>
      </footer>
    </div>
  );
}
