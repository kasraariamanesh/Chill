import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { RoomDetails, ChatMessage, FileMetadata } from "./types";
import AuthScreen from "./components/AuthScreen";
import LobbyScreen from "./components/LobbyScreen";
import CinemaRoom from "./components/CinemaRoom";

export default function App() {
  const [screen, setScreen] = useState<"login" | "lobby" | "theater">("login");
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleJoinRoom = (id: string, name: string, password?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    // Initialize socket pointing to current server origin
    const socket = io(window.location.origin, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected to server.");

      socket.emit(
        "join-room",
        { roomId: id, username: name, password },
        (response: { error?: string; room?: RoomDetails }) => {
          setIsLoading(false);
          if (response.error) {
            setErrorMsg(response.error);
            socket.disconnect();
            socketRef.current = null;
          } else if (response.room) {
            setRoomId(response.room.roomId);
            setUsername(name);
            setRoomDetails(response.room);
            setScreen(response.room.status === "theater" ? "theater" : "lobby");
          }
        }
      );
    });

    socket.on("connect_error", () => {
      setIsLoading(false);
      setErrorMsg("اتصال به سرور برقرار نشد. لطفاً اینترنت خود را چک کنید.");
    });

    // Real-time Event Listeners
    socket.on("user-joined", ({ user, systemMessage }) => {
      setRoomDetails((prev) => {
        if (!prev) return null;
        const exists = prev.users.some((u) => u.id === user.id);
        const updatedUsers = exists ? prev.users : [...prev.users, user];
        
        const systemMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          username: "System",
          text: systemMessage,
          timestamp: Date.now(),
        };

        return {
          ...prev,
          users: updatedUsers,
          messages: [...prev.messages, systemMsg],
        };
      });
    });

    socket.on("user-left", ({ userId, username: leftUsername, systemMessage, roomUsers }) => {
      setRoomDetails((prev) => {
        if (!prev) return null;
        
        const systemMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          username: "System",
          text: systemMessage,
          timestamp: Date.now(),
        };

        // If partner left and we are in theater, let's gracefully go back to lobby or show waiting
        return {
          ...prev,
          users: roomUsers,
          messages: [...prev.messages, systemMsg],
        };
      });
    });

    socket.on("file-selected-update", ({ userId, username: readyUser, fileMetadata, roomUsers }) => {
      setRoomDetails((prev) => {
        if (!prev) return null;
        
        // Push a small helpful chat log
        const systemMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          username: "System",
          text: `📁 ${readyUser} فایل را انتخاب کرد: ${fileMetadata.name}`,
          timestamp: Date.now(),
        };

        return {
          ...prev,
          users: roomUsers,
          currentVideo: fileMetadata,
          messages: [...prev.messages, systemMsg],
        };
      });
    });

    socket.on("message-receive", (newMessage: ChatMessage) => {
      setRoomDetails((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
        };
      });
    });

    socket.on("start-cinema-broadcast", () => {
      setScreen("theater");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected.");
      setScreen("login");
      setRoomDetails(null);
      setErrorMsg("اتصال شما از اتاق قطع شد.");
    });
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    
    if (socketRef.current && roomId) {
      const fileMetadata: FileMetadata = {
        name: file.name,
        size: file.size,
      };

      socketRef.current.emit("file-selected", {
        roomId,
        fileMetadata,
      });
    }
  };

  const handleSendMessage = (text: string) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("send-message", { roomId, text }, (res: any) => {
        if (res.error) {
          console.error(res.error);
        }
      });
    }
  };

  const handleStartWatch = () => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("start-cinema", { roomId });
    }
    setScreen("theater");
  };

  const handleBackToLobby = () => {
    setScreen("lobby");
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setScreen("login");
    setRoomDetails(null);
    setSelectedFile(null);
    setRoomId("");
  };

  return (
    <div className="bg-[#0a0a0f] min-h-screen text-gray-100 font-sans selection:bg-purple-600/30 selection:text-white">
      {screen === "login" && (
        <AuthScreen
          onJoin={handleJoinRoom}
          isLoading={isLoading}
          errorMsg={errorMsg}
        />
      )}

      {screen === "lobby" && roomDetails && (
        <LobbyScreen
          room={roomDetails}
          currentUserId={socketRef.current?.id || ""}
          onFileSelected={handleFileSelected}
          selectedFile={selectedFile}
          onStartWatch={handleStartWatch}
          onLeave={handleLeaveRoom}
        />
      )}

      {screen === "theater" && roomDetails && (
        <CinemaRoom
          roomId={roomId}
          selectedFile={selectedFile}
          socket={socketRef.current}
          roomDetails={roomDetails}
          currentUserId={socketRef.current?.id || ""}
          onBackToLobby={handleBackToLobby}
          onFileSelected={handleFileSelected}
        />
      )}
    </div>
  );
}
