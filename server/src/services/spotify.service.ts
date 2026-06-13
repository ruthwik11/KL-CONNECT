import prisma from "../config/db";
import { decrypt, encrypt } from "../utils/crypto.utils";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "mock";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "mock";

const isMockMode = CLIENT_ID === "mock" || CLIENT_SECRET === "mock";

interface SpotifyTokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isMock: boolean;
}

export interface TrackInfo {
  track: string;
  artist: string;
  albumArt?: string;
}

// In mock mode, rotate retro/gaming tracks to simulate background music
const MOCK_PLAYLIST: TrackInfo[] = [
  { track: "Pac-Man Fever", artist: "Buckner & Garcia", albumArt: "https://images.unsplash.com/photo-1550745165-9bc0b252726f" },
  { track: "Around the World", artist: "Daft Punk", albumArt: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17" },
  { track: "Blue Monday", artist: "New Order", albumArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4" },
  { track: "Space Invaders", artist: "Player One", albumArt: "https://images.unsplash.com/photo-1550745165-9bc0b252726f" },
  { track: "Super Mario World Theme", artist: "Koji Kondo", albumArt: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f" },
];

/**
 * Decrypt user's spotify token payload
 */
export function getDecryptedToken(encryptedToken: string): SpotifyTokenPayload | null {
  try {
    const decrypted = decrypt(encryptedToken);
    return JSON.parse(decrypted) as SpotifyTokenPayload;
  } catch (err) {
    console.error("🔴 Failed to decrypt Spotify token:", err);
    return null;
  }
}

/**
 * Refresh the Spotify access token if expired (or close to it)
 */
async function refreshSpotifyToken(userId: string, payload: SpotifyTokenPayload): Promise<string | null> {
  if (payload.isMock || isMockMode) {
    return payload.accessToken;
  }

  try {
    console.log(`🔌 [Spotify Service] Refreshing token for user: ${userId}`);
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: payload.refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔴 Spotify token refresh returned status ${response.status}:`, errorText);
      
      // If the refresh token was revoked or invalid, unlink the user's Spotify account
      if (response.status === 400 || response.status === 401) {
        console.warn(`⚠️ Revoking invalid Spotify connection for user ${userId}`);
        await prisma.user.update({
          where: { user_id: userId },
          data: { spotify_token: null },
        });
      }
      return null;
    }

    const data = await response.json() as any;
    
    // Spotify token refresh response may or may not include a new refresh token
    const updatedPayload: SpotifyTokenPayload = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || payload.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      isMock: false,
    };

    const encryptedToken = encrypt(JSON.stringify(updatedPayload));

    await prisma.user.update({
      where: { user_id: userId },
      data: { spotify_token: encryptedToken },
    });

    console.log(`🔌 [Spotify Service] Token refreshed successfully for user: ${userId}`);
    return updatedPayload.accessToken;
  } catch (error) {
    console.error(`🔴 Error refreshing Spotify token for user ${userId}:`, error);
    return null;
  }
}

/**
 * Fetch the currently playing track from Spotify API (or generate mock if mock mode)
 */
export async function fetchSpotifyCurrentlyPlaying(userId: string): Promise<TrackInfo | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { spotify_token: true },
    });

    if (!user || !user.spotify_token) {
      return null;
    }

    const tokenPayload = getDecryptedToken(user.spotify_token);
    if (!tokenPayload) {
      return null;
    }

    // Handle Mock Mode
    if (tokenPayload.isMock || isMockMode) {
      // Simulate rotating mock tracks based on current time index (cycles every 60 seconds)
      const index = Math.floor((Date.now() / 60000) % MOCK_PLAYLIST.length);
      return MOCK_PLAYLIST[index];
    }

    // Refresh token if expired or about to expire in next 60 seconds
    let accessToken = tokenPayload.accessToken;
    if (Date.now() + 60000 >= tokenPayload.expiresAt) {
      const refreshed = await refreshSpotifyToken(userId, tokenPayload);
      if (!refreshed) {
        return null; // Token refresh failed, user needs to re-auth
      }
      accessToken = refreshed;
    }

    // Fetch currently playing
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      // Nothing is playing
      return null;
    }

    if (response.status === 401) {
      // Unauthorized (token expired unexpectedly, try refreshing one more time)
      console.warn(`⚠️ 401 Unauthorized from Spotify for user ${userId}, retrying refresh...`);
      const refreshed = await refreshSpotifyToken(userId, tokenPayload);
      if (!refreshed) return null;
      
      const retryResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
          Authorization: `Bearer ${refreshed}`,
        },
      });

      if (!retryResponse.ok || retryResponse.status === 204) {
        return null;
      }
      
      return parseSpotifyResponse(await retryResponse.json());
    }

    if (!response.ok) {
      console.error(`🔴 Spotify API returned error status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return parseSpotifyResponse(data);
  } catch (error) {
    console.error(`🔴 Failed to fetch Spotify currently playing for user ${userId}:`, error);
    return null;
  }
}

function parseSpotifyResponse(data: any): TrackInfo | null {
  if (!data || !data.is_playing || !data.item) {
    return null;
  }

  const trackName = data.item.name;
  const artistNames = data.item.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist";
  const albumArt = data.item.album?.images?.[0]?.url;

  return {
    track: trackName,
    artist: artistNames,
    albumArt,
  };
}
