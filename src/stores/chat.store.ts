import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./auth.store";

export interface Message {
  msg_id: string;
  sender_id: string;
  target_id: string;
  target_type: "DM" | "GROUP";
  content: string;
  timestamp: string;
}

export interface ConversationFriend {
  user_id: string;
  username: string;
  email: string;
  role?: "USER" | "ADMIN";
  status_text: string | null;
  is_suspended: boolean;
  spotify_token: string | null;
  online: boolean;
  spotifyPlaying?: {
    track: string;
    artist: string;
    albumArt?: string;
  } | null;
}

interface ChatState {
  activeFriendId: string | null;
  friends: ConversationFriend[];
  messages: Record<string, Message[]>; // friendUserId -> message list
  socket: Socket | null;
  isConnecting: boolean;

  setFriends: (friends: ConversationFriend[]) => void;
  setActiveFriendId: (id: string | null) => void;
  loadMessagesForFriend: (friendId: string, messageList: Message[]) => void;
  addMessage: (friendId: string, msg: Message) => void;
  initSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeFriendId: null,
  friends: [],
  messages: {},
  socket: null,
  isConnecting: false,

  setFriends: (friends) => set({ friends }),

  setActiveFriendId: (id) => set({ activeFriendId: id }),

  loadMessagesForFriend: (friendId, messageList) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [friendId]: messageList,
      },
    }));
  },

  addMessage: (friendId, msg) => {
    set((state) => {
      const list = state.messages[friendId] || [];
      // Prevent duplicates
      if (list.some((m) => m.msg_id === msg.msg_id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [friendId]: [...list, msg],
        },
      };
    });
  },

  initSocket: (token) => {
    const currentSocket = get().socket;
    if (currentSocket?.connected) return;

    set({ isConnecting: true });

    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("🎮 Connected to KL Connect real-time game server");
      set({ socket, isConnecting: false });

      // Retrieve and update currently online friends list
      socket.emit("presence:get_online_friends", (onlineFriendIds: string[]) => {
        set((state) => ({
          friends: state.friends.map((f) => ({
            ...f,
            online: onlineFriendIds.includes(f.user_id),
          })),
        }));
      });
    });

    socket.on("connect_error", (err) => {
      console.error("🎮 Connection error:", err.message);
      set({ isConnecting: false });
    });

    // Handle real-time incoming messages
    socket.on("dm:receive", (msg: Message) => {
      const friendId = msg.sender_id;
      get().addMessage(friendId, msg);
    });

    // Handle friend coming online
    socket.on("presence:online", (payload: { userId: string }) => {
      set((state) => ({
        friends: state.friends.map((f) =>
          f.user_id === payload.userId ? { ...f, online: true } : f
        ),
      }));
    });

    // Handle friend going offline
    socket.on("presence:offline", (payload: { userId: string }) => {
      set((state) => ({
        friends: state.friends.map((f) =>
          f.user_id === payload.userId ? { ...f, online: false } : f
        ),
      }));
    });

    // Handle friend status bubble updates
    socket.on("status:changed", (payload: { userId: string; statusText: string }) => {
      set((state) => ({
        friends: state.friends.map((f) =>
          f.user_id === payload.userId ? { ...f, status_text: payload.statusText } : f
        ),
      }));
    });

    // Handle Spotify now playing updates from friends
    socket.on("spotify:nowplaying", (payload: { userId: string; playing: any }) => {
      set((state) => ({
        friends: state.friends.map((f) =>
          f.user_id === payload.userId ? { ...f, spotifyPlaying: payload.playing } : f
        ),
      }));
    });

    socket.on("disconnect", () => {
      console.log("🎮 Disconnected from KL Connect game server");
      set({ socket: null });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
