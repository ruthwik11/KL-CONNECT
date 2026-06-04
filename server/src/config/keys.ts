import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const privateKeyPath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || "./keys/private.pem");
const publicKeyPath = path.resolve(process.env.JWT_PUBLIC_KEY_PATH || "./keys/public.pem");

export interface JWTKeys {
  privateKey: string;
  publicKey: string;
}

export function getJWTKeys(): JWTKeys {
  // Read keys from environment variables directly if available (standard for cloud hosting)
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    return {
      privateKey: process.env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n"),
      publicKey: process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),
    };
  }

  const keysDir = path.dirname(privateKeyPath);

  // Auto-generate keys if they do not exist
  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log("🔑 JWT asymmetric keys not found. Auto-generating RSA 4096-bit key pair...");
    
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log(`🔑 Keys generated successfully at:\n  - Private: ${privateKeyPath}\n  - Public: ${publicKeyPath}`);
  }

  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const publicKey = fs.readFileSync(publicKeyPath, "utf8");

  return { privateKey, publicKey };
}
