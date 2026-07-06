import React, { useRef, useState } from "react";
import { Subtitles, FileText, X, AlertCircle, Sparkles } from "lucide-react";
import { convertSrtToVtt } from "../utils/subtitleUtils";

interface SubtitleSelectorProps {
  onSubtitleSelected: (subtitle: { url: string; name: string; content: string } | null) => void;
  selectedSubtitle: { url: string; name: string } | null;
}

export default function SubtitleSelector({
  onSubtitleSelected,
  selectedSubtitle,
}: SubtitleSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "srt" && extension !== "vtt") {
      setErrorMsg("Only .srt and .vtt subtitle formats are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let vttContent = text;

        if (extension === "srt") {
          // Convert on the fly
          vttContent = convertSrtToVtt(text);
        }

        // Create a Blob URL
        const blob = new Blob([vttContent], { type: "text/vtt;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        onSubtitleSelected({
          url,
          name: file.name,
          content: vttContent,
        });
      } catch (err) {
        setErrorMsg("Failed to parse or convert the subtitle file.");
        console.error(err);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read the file.");
    };

    reader.readAsText(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSubtitle) {
      URL.revokeObjectURL(selectedSubtitle.url);
    }
    onSubtitleSelected(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedSubtitle
            ? "bg-[#D2B48C]/5 border-[#D2B48C]/30 hover:border-[#D2B48C]/50"
            : "bg-white/[0.01] border-white/10 hover:border-[#D2B48C]/30 hover:bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              selectedSubtitle
                ? "bg-[#D2B48C]/20 text-[#D2B48C]"
                : "bg-white/5 text-[#A39E93] group-hover:text-[#D2B48C] group-hover:bg-[#D2B48C]/10"
            }`}
          >
            <Subtitles className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-medium text-[#F4E9D8]">
              {selectedSubtitle ? "Subtitle Track Synced" : "Load Local Subtitles"}
            </h4>
            <p className="text-[10px] text-[#A39E93] mt-0.5 max-w-[180px] truncate">
              {selectedSubtitle ? selectedSubtitle.name : "Supports .SRT and .VTT files"}
            </p>
          </div>
        </div>

        {selectedSubtitle ? (
          <button
            onClick={handleRemove}
            className="p-1.5 rounded-lg bg-[#111111] hover:bg-red-500/20 text-[#A39E93] hover:text-red-400 transition-all cursor-pointer border border-[#F4E9D8]/10 hover:border-red-500/30"
            title="Remove subtitle"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-[10px] text-[#D2B48C] font-mono font-medium group-hover:translate-x-[-2px] transition-all">
            + BROWSE
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
