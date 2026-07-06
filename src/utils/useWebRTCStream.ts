import { useState, useEffect, useRef } from "react";
import Peer from "simple-peer";

export function useWebRTCStream(socket: any, roomId: string, isHost: boolean) {
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [remoteVoiceStream, setRemoteVoiceStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localVoiceStream, setLocalVoiceStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    let newPeer: Peer.Instance | null = null;

    const initPeer = () => {
      if (newPeer) {
        newPeer.destroy();
      }
      
      newPeer = new Peer({
        initiator: isHost,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }
          ]
        }
      });

      newPeer.on("signal", (data) => {
        socket.emit("webrtc-signal", { roomId, signal: data });
      });

      newPeer.on("connect", () => {
        setIsConnected(true);
        console.log("WebRTC Peer Connected");
      });

      newPeer.on("stream", (incomingStream) => {
        console.log("Received stream with tracks:", incomingStream.getTracks());
        
        // We can differentiate streams by looking at the tracks
        // If it has video tracks, it's the movie stream
        if (incomingStream.getVideoTracks().length > 0) {
           setRemoteVideoStream(incomingStream);
        } else {
           // Otherwise it's voice chat
           setRemoteVoiceStream(incomingStream);
        }
      });

      newPeer.on("error", (err) => {
        console.error("WebRTC Error:", err);
      });

      setPeer(newPeer);
    };

    socket.on("webrtc-signal", ({ signal, from }: { signal: any, from: string }) => {
      if (newPeer && !newPeer.destroyed) {
        newPeer.signal(signal);
      } else {
        initPeer();
        setTimeout(() => {
          if (newPeer && !newPeer.destroyed) newPeer.signal(signal);
        }, 100);
      }
    });

    socket.on("guest-ready-for-webrtc", () => {
      if (isHost) {
        console.log("Guest is ready, initiating WebRTC offer...");
        initPeer();
      }
    });

    initPeer();

    if (!isHost) {
      socket.emit("guest-ready-for-webrtc-send", { roomId });
    }

    return () => {
      socket.off("webrtc-signal");
      socket.off("guest-ready-for-webrtc");
      if (newPeer) newPeer.destroy();
    };
  }, [socket, roomId, isHost]);

  const startVideoStream = (stream: MediaStream) => {
    if (isHost && peer && !peer.destroyed) {
      peer.addStream(stream);
    }
  };

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true } });
      setLocalVoiceStream(stream);
      if (peer && !peer.destroyed) {
        peer.addStream(stream);
      }
      return true;
    } catch (err) {
      console.error("Mic error:", err);
      return false;
    }
  };

  const stopVoiceChat = () => {
    if (localVoiceStream) {
      localVoiceStream.getTracks().forEach(track => track.stop());
      if (peer && !peer.destroyed) {
         peer.removeStream(localVoiceStream);
      }
      setLocalVoiceStream(null);
    }
  };

  const toggleMic = (muted: boolean) => {
     if (localVoiceStream) {
         localVoiceStream.getAudioTracks().forEach(track => {
             track.enabled = !muted;
         });
     }
  };

  return { 
    remoteVideoStream, 
    remoteVoiceStream, 
    isConnected, 
    startVideoStream, 
    startVoiceChat, 
    stopVoiceChat,
    toggleMic,
    localVoiceStream
  };
}
