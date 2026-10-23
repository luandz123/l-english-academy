import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Room, RoomEvent, Track, RemoteParticipant, LocalParticipant } from "livekit-client";
import { getVoiceToken } from "@/services/speakingService";
import { ParticipantConnectionStatus, SpeakingMember } from "@/types/speaking";

export interface UseVoiceRoomProps {
  roomId: string;
  passcode?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isHost: boolean;
  onParticipantEvent?: (message: string) => void;
}

export type MicPermissionStatus = "prompt" | "granted" | "denied" | "unsupported";

export function useVoiceRoom({
  roomId,
  passcode,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isHost,
  onParticipantEvent,
}: UseVoiceRoomProps) {
  const [connectionStatus, setConnectionStatus] = useState<ParticipantConnectionStatus>("connecting");
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("prompt");
  const [isMuted, setIsMuted] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0); // 0 to 1
  const [audioError, setAudioError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<"livekit" | "webrtc-mesh">("webrtc-mesh");

  // Track map of remote participants in voice call: userId -> audio metadata
  const [remoteSpeakers, setRemoteSpeakers] = useState<
    Record<
      string,
      {
        userId: string;
        name: string;
        avatarUrl?: string;
        isMuted: boolean;
        isSpeaking: boolean;
        audioLevel: number;
        connectionStatus: ParticipantConnectionStatus;
      }
    >
  >({});

  // Audio & media refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // LiveKit refs
  const livekitRoomRef = useRef<Room | null>(null);

  // WebRTC Mesh refs
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});
  const channelRef = useRef<any>(null);

  // Check microphone permissions
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermission("unsupported");
      setAudioError("Trình duyệt của bạn không hỗ trợ ghi âm WebRTC.");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === "granted") {
            setMicPermission("granted");
          } else if (permissionStatus.state === "denied") {
            setMicPermission("denied");
          } else {
            setMicPermission("prompt");
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") setMicPermission("granted");
            else if (permissionStatus.state === "denied") setMicPermission("denied");
            else setMicPermission("prompt");
          };
        })
        .catch(() => {
          // Permissions API query not supported for mic on some browsers, leave prompt
        });
    }
  }, []);

  // Setup local audio analyser for speaking indicator
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(1, average / 60);

        setLocalAudioLevel(normalized);

        const speakingNow = normalized > 0.15;
        setIsLocalSpeaking(speakingNow);

        // Broadcast speaking state if in mesh mode
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "speaking-status",
            payload: {
              userId: currentUserId,
              isSpeaking: speakingNow,
              audioLevel: normalized,
            },
          });
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (err) {
      console.warn("[useVoiceRoom] Could not start audio level analyser:", err);
    }
  }, [currentUserId]);

  // Request mic stream
  const acquireMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setMicPermission("granted");
      setupAudioAnalyser(stream);
      return stream;
    } catch (err: any) {
      console.error("[useVoiceRoom] getUserMedia failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setAudioError("Vui lòng cấp quyền truy cập microphone trong trình duyệt để bắt đầu nói.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setMicPermission("unsupported");
        setAudioError("Không tìm thấy thiết bị microphone nào được kết nối với thiết bị.");
      } else {
        setAudioError(err.message || "Lỗi truy cập microphone");
      }
      return null;
    }
  }, [setupAudioAnalyser]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMuted = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsMuted(nextMuted);

      // LiveKit update
      if (livekitRoomRef.current?.localParticipant) {
        livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
      }

      // Mesh signaling update
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "mute-status",
          payload: {
            userId: currentUserId,
            isMuted: nextMuted,
          },
        });
      }
    }
  }, [isMuted, currentUserId]);

  // Connect to voice room (orchestrator)
  useEffect(() => {
    let isCancelled = false;

    async function initializeVoiceConnection() {
      setConnectionStatus("connecting");
      setAudioError(null);

      // 1. Acquire mic stream
      const stream = await acquireMicrophone();
      if (isCancelled) return;

      // 2. Fetch voice token from backend
      try {
        const tokenRes = await getVoiceToken(roomId, passcode);
        if (isCancelled) return;

        if (tokenRes.mode === "livekit" && tokenRes.token && tokenRes.url) {
          // ==========================
          // LIVEKIT SFU ARCHITECTURE
          // ==========================
          setConnectionMode("livekit");
          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
          });
          livekitRoomRef.current = room;

          room
            .on(RoomEvent.Connected, () => {
              if (isCancelled) return;
              setConnectionStatus("connected");
              if (onParticipantEvent) onParticipantEvent("Đã kết nối vào phòng âm thanh LiveKit");
            })
            .on(RoomEvent.Reconnecting, () => {
              setConnectionStatus("reconnecting");
            })
            .on(RoomEvent.Reconnected, () => {
              setConnectionStatus("connected");
            })
            .on(RoomEvent.Disconnected, () => {
              setConnectionStatus("disconnected");
            })
            .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
              if (onParticipantEvent) {
                onParticipantEvent(`${participant.name || "Một học viên"} đã tham gia phòng`);
              }
            })
            .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
              if (onParticipantEvent) {
                onParticipantEvent(`${participant.name || "Một học viên"} đã rời phòng`);
              }
              setRemoteSpeakers((prev) => {
                const updated = { ...prev };
                delete updated[participant.identity];
                return updated;
              });
            })
            .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
              const activeIds = new Set(speakers.map((s) => s.identity));
              setRemoteSpeakers((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((id) => {
                  if (next[id]) {
                    next[id].isSpeaking = activeIds.has(id);
                  }
                });
                return next;
              });
            })
            .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
              if (track.kind === Track.Kind.Audio) {
                const audioEl = track.attach();
                document.body.appendChild(audioEl);
                remoteAudiosRef.current[participant.identity] = audioEl;

                setRemoteSpeakers((prev) => ({
                  ...prev,
                  [participant.identity]: {
                    userId: participant.identity,
                    name: participant.name || "Học viên",
                    avatarUrl: undefined,
                    isMuted: !publication.isMuted,
                    isSpeaking: false,
                    audioLevel: 0,
                    connectionStatus: "connected",
                  },
                }));
              }
            })
            .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
              track.detach();
              const el = remoteAudiosRef.current[participant.identity];
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
                delete remoteAudiosRef.current[participant.identity];
              }
            });

          await room.connect(tokenRes.url, tokenRes.token);

          // Publish microphone track
          if (stream) {
            const micTrack = stream.getAudioTracks()[0];
            if (micTrack) {
              await room.localParticipant.publishTrack(micTrack);
            }
          }
        } else {
          // ======================================
          // WEBRTC MESH OVER SUPABASE SIGNALING
          // ======================================
          setConnectionMode("webrtc-mesh");
          const iceServers = tokenRes.iceServers || [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ];

          const channel = supabase.channel(`speaking-room:${roomId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: currentUserId },
            },
          });
          channelRef.current = channel;

          // Helper to create PeerConnection
          const getOrCreatePeerConnection = (targetUserId: string): RTCPeerConnection => {
            if (peerConnectionsRef.current[targetUserId]) {
              return peerConnectionsRef.current[targetUserId];
            }

            const pc = new RTCPeerConnection({ iceServers });

            // Add local stream tracks
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
              });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                channel.send({
                  type: "broadcast",
                  event: "ice-candidate",
                  payload: {
                    from: currentUserId,
                    to: targetUserId,
                    candidate: event.candidate,
                  },
                });
              }
            };

            // Handle remote track
            pc.ontrack = (event) => {
              const remoteStream = event.streams[0];
              if (!remoteAudiosRef.current[targetUserId]) {
                const audio = document.createElement("audio");
                audio.srcObject = remoteStream;
                audio.autoplay = true;
                (audio as any).playsInline = true;
                document.body.appendChild(audio);
                remoteAudiosRef.current[targetUserId] = audio;
              } else {
                remoteAudiosRef.current[targetUserId].srcObject = remoteStream;
              }
            };

            pc.onconnectionstatechange = () => {
              const state = pc.connectionState;
              setRemoteSpeakers((prev) => {
                if (!prev[targetUserId]) return prev;
                return {
                  ...prev,
                  [targetUserId]: {
                    ...prev[targetUserId],
                    connectionStatus:
                      state === "connected"
                        ? "connected"
                        : state === "connecting"
                        ? "connecting"
                        : state === "failed" || state === "closed"
                        ? "disconnected"
                        : "reconnecting",
                  },
                };
              });
            };

            peerConnectionsRef.current[targetUserId] = pc;
            return pc;
          };

          // Setup signaling listeners
          channel
            .on("broadcast", { event: "user-joined" }, async ({ payload }) => {
              const { userId, name, avatarUrl } = payload;
              if (userId === currentUserId) return;

              if (onParticipantEvent) onParticipantEvent(`${name || "Một học viên"} đã tham gia phòng`);

              setRemoteSpeakers((prev) => ({
                ...prev,
                [userId]: {
                  userId,
                  name: name || "Học viên",
                  avatarUrl,
                  isMuted: false,
                  isSpeaking: false,
                  audioLevel: 0,
                  connectionStatus: "connecting",
                },
              }));

              // As existing peer, initiate WebRTC offer to new joiner
              const pc = getOrCreatePeerConnection(userId);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({
                  type: "broadcast",
                  event: "webrtc-offer",
                  payload: {
                    from: currentUserId,
                    fromName: currentUserName,
                    fromAvatar: currentUserAvatar,
                    to: userId,
                    offer,
                  },
                });
              } catch (offerErr) {
                console.error("[useVoiceRoom] Error creating offer:", offerErr);
              }
            })
            .on("broadcast", { event: "webrtc-offer" }, async ({ payload }) => {
              const { from, fromName, fromAvatar, to, offer } = payload;
              if (to !== currentUserId) return;

              setRemoteSpeakers((prev) => ({
                ...prev,
                [from]: {
                  userId: from,
                  name: fromName || "Học viên",
                  avatarUrl: fromAvatar,
                  isMuted: false,
                  isSpeaking: false,
                  audioLevel: 0,
                  connectionStatus: "connecting",
                },
              }));

              const pc = getOrCreatePeerConnection(from);
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                channel.send({
                  type: "broadcast",
                  event: "webrtc-answer",
                  payload: {
                    from: currentUserId,
                    to: from,
                    answer,
                  },
                });
              } catch (ansErr) {
                console.error("[useVoiceRoom] Error creating answer:", ansErr);
              }
            })
            .on("broadcast", { event: "webrtc-answer" }, async ({ payload }) => {
              const { from, to, answer } = payload;
              if (to !== currentUserId) return;
              const pc = peerConnectionsRef.current[from];
              if (pc && pc.signalingState !== "stable") {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {
                  console.warn("[useVoiceRoom] setRemoteDescription error:", e);
                }
              }
            })
            .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
              const { from, to, candidate } = payload;
              if (to !== currentUserId) return;
              const pc = peerConnectionsRef.current[from];
              if (pc && candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn("[useVoiceRoom] addIceCandidate error:", e);
                }
              }
            })
            .on("broadcast", { event: "mute-status" }, ({ payload }) => {
              const { userId, isMuted: peerMuted } = payload;
              setRemoteSpeakers((prev) => {
                if (!prev[userId]) return prev;
                return {
                  ...prev,
                  [userId]: { ...prev[userId], isMuted: peerMuted },
                };
              });
            })
            .on("broadcast", { event: "speaking-status" }, ({ payload }) => {
              const { userId, isSpeaking: peerSpeaking, audioLevel } = payload;
              setRemoteSpeakers((prev) => {
                if (!prev[userId]) return prev;
                return {
                  ...prev,
                  [userId]: {
                    ...prev[userId],
                    isSpeaking: peerSpeaking,
                    audioLevel: audioLevel || 0,
                  },
                };
              });
            })
            .on("broadcast", { event: "user-left" }, ({ payload }) => {
              const { userId, name } = payload;
              if (onParticipantEvent) onParticipantEvent(`${name || "Một học viên"} đã rời phòng`);

              if (peerConnectionsRef.current[userId]) {
                peerConnectionsRef.current[userId].close();
                delete peerConnectionsRef.current[userId];
              }

              if (remoteAudiosRef.current[userId]) {
                const el = remoteAudiosRef.current[userId];
                if (el.parentNode) el.parentNode.removeChild(el);
                delete remoteAudiosRef.current[userId];
              }

              setRemoteSpeakers((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
              });
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                setConnectionStatus("connected");
                // Broadcast presence to announce arrival
                channel.send({
                  type: "broadcast",
                  event: "user-joined",
                  payload: {
                    userId: currentUserId,
                    name: currentUserName,
                    avatarUrl: currentUserAvatar,
                  },
                });
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                setConnectionStatus("reconnecting");
              } else if (status === "CLOSED") {
                setConnectionStatus("disconnected");
              }
            });
        }
      } catch (err: any) {
        console.error("[useVoiceRoom] Voice token error:", err);
        setAudioError(err.message || "Không thể kết nối phòng thoại");
        setConnectionStatus("disconnected");
      }
    }

    initializeVoiceConnection();

    // Complete cleanup on unmount or room leave
    return () => {
      isCancelled = true;

      // Stop animation frame
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      // Stop microphone stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        localStreamRef.current = null;
      }

      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }

      // Broadcast user left in mesh
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "user-left",
          payload: {
            userId: currentUserId,
            name: currentUserName,
          },
        });
        channelRef.current.unsubscribe();
      }

      // Close all peer connections
      Object.keys(peerConnectionsRef.current).forEach((id) => {
        peerConnectionsRef.current[id].close();
      });
      peerConnectionsRef.current = {};

      // Remove audio elements
      Object.keys(remoteAudiosRef.current).forEach((id) => {
        const el = remoteAudiosRef.current[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      remoteAudiosRef.current = {};

      // Disconnect LiveKit if active
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
    };
  }, [roomId, passcode, currentUserId, currentUserName, currentUserAvatar, acquireMicrophone, onParticipantEvent]);

  return {
    connectionStatus,
    connectionMode,
    micPermission,
    isMuted,
    toggleMute,
    isLocalSpeaking,
    localAudioLevel,
    remoteSpeakers,
    audioError,
    acquireMicrophone,
  };
}
