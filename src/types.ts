export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
  playbackRate: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  magnetURI?: string;
  isHost?: boolean;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface UserInfo {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
}

export interface RoomDetails {
  roomId: string;
  roomName?: string;
  users: UserInfo[];
  currentVideo?: FileMetadata;
  videoState?: VideoState;
  messages: ChatMessage[];
  theme?: string;
  status?: "lobby" | "theater";
}

export interface SubtitleSettings {
  fontSize: number;
  bgOpacity: number;
  fontFamily: string;
  color: string;
  position: "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | "custom";
  customOffset: { x: number; y: number };
  delay: number;
  isVisible: boolean;
}

