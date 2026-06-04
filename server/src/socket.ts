import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyAccessToken } from "./utils/token.utils";
import prisma from "./config/db";

// Extend Socket type to store authenticated user details
interface AuthenticatedSocket extends Socket {
  user?: {
    user_id: string;
    username: string;
    email: string;
    role: string;
  };
}

// In-memory session tracking for active connections (user_id -> Set of socket_ids)
const activeConnections = new Map<string, Set<string>>();
let ioInstance: SocketIOServer | null = null;

export function isUserOnline(userId: string): boolean {
  const connections = activeConnections.get(userId);
  return connections ? connections.size > 0 : false;
}

export function disconnectUser(userId: string) {
  const socketIds = activeConnections.get(userId);
  if (socketIds && ioInstance) {
    socketIds.forEach((socketId) => {
      const socket = ioInstance!.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("user:suspended", { reason: "Account suspended by administrator" });
        socket.disconnect(true);
      }
    });
  }
}

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  ioInstance = io;

  // JWT Verification Middleware Handshake
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error("Authentication handshake failed: Token missing"));
    }

    try {
      const decoded = verifyAccessToken(token);
      
      const user = await prisma.user.findUnique({
        where: { user_id: decoded.sub },
      });

      if (!user) {
        return next(new Error("Authentication handshake failed: User not found"));
      }

      if (user.is_suspended) {
        return next(new Error("Authentication handshake failed: Account suspended"));
      }

      socket.user = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (err) {
      return next(new Error("Authentication handshake failed: Invalid or expired token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    const userId = user.user_id;

    console.log(`🔌 Player connected: ${user.username} (Socket: ${socket.id})`);

    // 1. Join user to their private channel room
    await socket.join(userId);

    // 2. Track connection state
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(socket.id);

    // 3. Broadcast "presence:online" to mutual friends
    const friends = await getAcceptedFriendsList(userId);
    friends.forEach((friendId) => {
      if (isUserOnline(friendId)) {
        // Emit to friend's private room
        io.to(friendId).emit("presence:online", { userId });
      }
    });

    // 4. Handle DM sends
    socket.on("dm:send", async (payload: { targetId: string; content: string }, callback) => {
      try {
        const { targetId, content } = payload;
        
        if (!targetId || !content) {
          throw new Error("Target ID and content are required");
        }

        // Verify mutual friendship
        const [user_a_id, user_b_id] = [userId, targetId].sort();
        const friendship = await prisma.friendship.findUnique({
          where: {
            user_a_id_user_b_id: { user_a_id, user_b_id },
            status: "ACCEPTED",
          },
        });

        if (!friendship) {
          throw new Error("You must be mutual friends to send direct messages");
        }

        // Persist message in PostgreSQL
        const message = await prisma.message.create({
          data: {
            sender_id: userId,
            target_id: targetId,
            target_type: "DM",
            content,
          },
        });

        // Broadcast to recipient
        io.to(targetId).emit("dm:receive", message);

        // Send acknowledgment to sender
        if (callback) callback({ status: "ok", message });
      } catch (err: any) {
        if (callback) callback({ status: "error", message: err.message });
      }
    });

    // 4.5. Handle Group Channel Room Operations
    socket.on("group:join", async (payload: { groupId: string }) => {
      try {
        const { groupId } = payload;
        const membership = await prisma.groupMember.findUnique({
          where: {
            group_id_user_id: {
              group_id: groupId,
              user_id: userId,
            },
          },
        });

        if (!membership) {
          throw new Error("You must join this group channel to receive its stream");
        }

        await socket.join(groupId);
      } catch (err: any) {
        console.error(`Group join socket error for user ${userId}:`, err.message);
      }
    });

    socket.on("group:leave", async (payload: { groupId: string }) => {
      await socket.leave(payload.groupId);
    });

    socket.on("group:send", async (payload: { groupId: string; content: string }, callback) => {
      try {
        const { groupId, content } = payload;

        if (!groupId || !content) {
          throw new Error("Group target and content are required");
        }

        // Verify membership
        const membership = await prisma.groupMember.findUnique({
          where: {
            group_id_user_id: {
              group_id: groupId,
              user_id: userId,
            },
          },
        });

        if (!membership) {
          throw new Error("Access Denied: You are not a member of this group");
        }

        // Persist message
        const message = await prisma.message.create({
          data: {
            sender_id: userId,
            target_id: groupId,
            target_type: "GROUP",
            content,
          },
        });

        // Broadcast to group room
        io.to(groupId).emit("group:receive", message);

        if (callback) callback({ status: "ok", message });
      } catch (err: any) {
        if (callback) callback({ status: "error", message: err.message });
      }
    });

    // 5. Handle user status bubble updates
    socket.on("status:update", async (payload: { statusText: string }) => {
      try {
        const { statusText } = payload;
        const truncatedStatus = statusText.slice(0, 140);

        await prisma.user.update({
          where: { user_id: userId },
          data: { status_text: truncatedStatus },
        });

        // Broadcast to friends
        friends.forEach((friendId) => {
          if (isUserOnline(friendId)) {
            io.to(friendId).emit("status:changed", {
              userId,
              statusText: truncatedStatus,
            });
          }
        });
      } catch (err) {
        console.error("Failed to update status bubble via Socket:", err);
      }
    });

    // 6. Handle Spotify now-playing broadcast
    socket.on("spotify:broadcast", (payload: { track: string; artist: string; albumArt?: string } | null) => {
      friends.forEach((friendId) => {
        if (isUserOnline(friendId)) {
          io.to(friendId).emit("spotify:nowplaying", {
            userId,
            playing: payload,
          });
        }
      });
    });

    // 7. Request list of online friends
    socket.on("presence:get_online_friends", (callback) => {
      if (callback) {
        const onlineFriends = friends.filter((friendId) => isUserOnline(friendId));
        callback(onlineFriends);
      }
    });

    // 8. Handle disconnection
    socket.on("disconnect", () => {
      const connections = activeConnections.get(userId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          activeConnections.delete(userId);
          console.log(`🔌 Player disconnected (Session closed): ${user.username}`);

          // Broadcast offline event to friends
          friends.forEach((friendId) => {
            if (isUserOnline(friendId)) {
              io.to(friendId).emit("presence:offline", { userId });
            }
          });
        } else {
          console.log(`🔌 Player disconnected (Tab closed): ${user.username}`);
        }
      }
    });
  });

  return io;
}

// Utility: Fetch list of accepted friend user IDs for a user
async function getAcceptedFriendsList(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ user_a_id: userId }, { user_b_id: userId }],
    },
  });

  return friendships.map((f) => (f.user_a_id === userId ? f.user_b_id : f.user_a_id));
}
