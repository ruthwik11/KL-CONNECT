import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { encrypt } from "../utils/crypto.utils";
import { AppError } from "../utils/errors";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "mock";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "mock";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:5000/api/spotify/callback";
const FRONTEND_SETTINGS_URL = "http://localhost:3000/settings";

const isMockMode = CLIENT_ID === "mock" || CLIENT_SECRET === "mock";

export async function authorize(req: Request, res: Response, next: NextFunction) {
  try {
    // If user is authenticated, we should know who is linking
    // Note: since this is a redirect redirecting from a browser link, we can let the frontend pass the userId
    // in the state parameter, or use standard OAuth state query parsing.
    const userId = req.query.userId as string;
    if (!userId) {
      throw new AppError(400, "User identification state is required for Spotify linking");
    }

    if (isMockMode) {
      // Mock redirection directly to our callback
      const mockUrl = `${REDIRECT_URI}?code=mock_auth_code&state=${userId}`;
      return res.status(200).json({ url: mockUrl });
    }

    const scopes = "user-read-currently-playing user-read-playback-state";
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${encodeURIComponent(userId)}`;

    res.status(200).json({ url: spotifyAuthUrl });
  } catch (error) {
    next(error);
  }
}

export async function callback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_SETTINGS_URL}?spotify=error&message=${encodeURIComponent(error as string)}`);
    }

    if (!code || !userId) {
      return res.redirect(`${FRONTEND_SETTINGS_URL}?spotify=error&message=missing_parameters`);
    }

    let tokenPayloadString = "";

    if (isMockMode) {
      // Create mock token session payload
      const mockToken = {
        accessToken: "mock_access_token_12345",
        refreshToken: "mock_refresh_token_12345",
        expiresAt: Date.now() + 3600 * 1000,
        isMock: true,
      };
      tokenPayloadString = JSON.stringify(mockToken);
    } else {
      // Live Spotify exchange
      const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
      
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        const errorDetails = (await response.json().catch(() => ({}))) as any;
        return res.redirect(`${FRONTEND_SETTINGS_URL}?spotify=error&message=${encodeURIComponent(errorDetails.error_description || "exchange_failed")}`);
      }

      const data = (await response.json()) as any;
      
      const tokenPayload = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        isMock: false,
      };
      tokenPayloadString = JSON.stringify(tokenPayload);
    }

    // Encrypt the credentials payload
    const encryptedToken = encrypt(tokenPayloadString);

    // Save encrypted credentials to database
    await prisma.user.update({
      where: { user_id: userId as string },
      data: { spotify_token: encryptedToken },
    });

    // Redirect user back to settings with success tag
    res.redirect(`${FRONTEND_SETTINGS_URL}?spotify=success`);
  } catch (err: any) {
    console.error("🔴 Spotify OAuth callback handler failed:", err);
    res.redirect(`${FRONTEND_SETTINGS_URL}?spotify=error&message=internal_server_error`);
  }
}
