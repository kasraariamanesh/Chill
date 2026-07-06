import React from "react";
import { SubtitleSettings } from "../types";
import { Move, Type, Droplet, Minus, Plus, AlignCenter, AlertCircle, X, AlignLeft, AlignRight, GripHorizontal } from "lucide-react";
import { motion } from "motion/react";

interface SubtitleControlsProps {
  settings: SubtitleSettings;
  onSettingsChange: (settings: SubtitleSettings) => void;
  onClose: () => void;
}

export default function SubtitleControls({
  settings,
  onSettingsChange,
  onClose
}: SubtitleControlsProps) {
  
  const updateSetting = <K extends keyof SubtitleSettings>(key: K, value: SubtitleSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handlePositionPreset = (preset: SubtitleSettings["position"]) => {
    onSettingsChange({ ...settings, position: preset, customOffset: { x: 0, y: 0 } });
  };

  const fonts = [
    { label: "Sans (Modern)", value: "ui-sans-serif, system-ui, sans-serif" },
    { label: "Serif (Cinema)", value: "ui-serif, Georgia, serif" },
    { label: "Mono (Tech)", value: "ui-monospace, SFMono-Regular, monospace" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-6 top-24 z-50 w-80 bg-[#0a0a0c]/90 border border-white/10 p-5 rounded-2xl backdrop-blur-2xl shadow-2xl flex flex-col gap-6"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h4 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
          <Type className="w-4 h-4 text-[#e8e3d5]" />
          Subtitle Configuration
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/5 text-[#706e68] hover:text-[#f5f2eb] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
        {/* Visibility */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#e8e3d5] font-medium">Show Subtitles</span>
          <button
            onClick={() => updateSetting("isVisible", !settings.isVisible)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
              settings.isVisible ? 'bg-emerald-500/80' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#f5f2eb] transition-transform ${
                settings.isVisible ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Font Family */}
        <div className="space-y-2">
          <label className="text-xs text-[#706e68] font-medium uppercase tracking-wider flex items-center gap-2">
            <Type className="w-3.5 h-3.5" />
            Typography
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {fonts.map((f) => (
              <button
                key={f.value}
                onClick={() => updateSetting("fontFamily", f.value)}
                className={`px-3 py-2 rounded-xl text-xs text-left transition-all ${
                  settings.fontFamily === f.value
                    ? "bg-[#f5f2eb] text-[#0a0a0c] font-semibold"
                    : "bg-white/5 text-[#e8e3d5] hover:bg-white/10"
                }`}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <label className="text-xs text-[#706e68] font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Size</span>
            <span className="text-[#f5f2eb] font-mono">{settings.fontSize}px</span>
          </label>
          <input
            type="range"
            min={14}
            max={48}
            step={1}
            value={settings.fontSize}
            onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#f5f2eb]"
          />
        </div>

        {/* Background Opacity */}
        <div className="space-y-2">
          <label className="text-xs text-[#706e68] font-medium uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5"/> Backdrop Opacity</span>
            <span className="text-[#f5f2eb] font-mono">{Math.round(settings.bgOpacity * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.bgOpacity}
            onChange={(e) => updateSetting("bgOpacity", parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#f5f2eb]"
          />
        </div>

        {/* Alignment Grid */}
        <div className="space-y-2">
          <label className="text-xs text-[#706e68] font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" /> Placement
          </label>
          <div className="grid grid-cols-3 gap-1">
            {["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"].map((pos) => (
              <button
                key={pos}
                onClick={() => handlePositionPreset(pos as any)}
                className={`p-2 border rounded-lg transition-all flex items-center justify-center ${
                  settings.position === pos 
                    ? "bg-[#f5f2eb]/10 border-[#f5f2eb]/30 text-[#f5f2eb]" 
                    : "bg-white/5 border-transparent text-[#706e68] hover:bg-white/10 hover:text-[#e8e3d5]"
                }`}
              >
                {pos.includes("left") ? <AlignLeft className="w-4 h-4"/> : pos.includes("right") ? <AlignRight className="w-4 h-4"/> : <AlignCenter className="w-4 h-4"/>}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePositionPreset("custom")}
            className={`w-full py-2 rounded-lg text-xs font-medium border transition-all mt-1 flex items-center justify-center gap-2 ${
              settings.position === "custom"
                ? "bg-[#f5f2eb]/10 border-[#f5f2eb]/30 text-[#f5f2eb]"
                : "bg-white/5 border-transparent text-[#706e68] hover:bg-white/10 hover:text-[#e8e3d5]"
            }`}
          >
            <GripHorizontal className="w-4 h-4" />
            Drag & Drop (Custom)
          </button>
        </div>

        {/* Sync Offset */}
        <div className="space-y-2">
          <label className="text-xs text-[#706e68] font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Sync Offset</span>
            <span className={`font-mono ${settings.delay === 0 ? "text-[#706e68]" : settings.delay > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {settings.delay > 0 ? `+${settings.delay.toFixed(1)}` : settings.delay.toFixed(1)}s
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSetting("delay", parseFloat((settings.delay - 0.1).toFixed(1)))}
              className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/10 text-rose-400/80 hover:text-rose-400 transition-all flex-1 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Minus className="w-3 h-3"/> 0.1s
            </button>
            <button
              onClick={() => updateSetting("delay", 0)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#706e68] hover:text-[#e8e3d5] transition-all text-[10px] uppercase tracking-wider cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={() => updateSetting("delay", parseFloat((settings.delay + 0.1).toFixed(1)))}
              className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-emerald-400/80 hover:text-emerald-400 transition-all flex-1 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3"/> 0.1s
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
