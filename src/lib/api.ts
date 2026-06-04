import { useAuthStore } from "@/stores/auth.store";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_BASE = `${BACKEND_URL}/api`;

export async function fetchApi(path: string, options: RequestInit = {}): Promise<any> {
  const store = useAuthStore.getState();
  const headers = new Headers(options.headers || {});

  if (store.accessToken) {
    headers.set("Authorization", `Bearer ${store.accessToken}`);
  }
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle unauthorized / expired access token (attempt token rotation)
  if (response.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
    const rt = localStorage.getItem("klc_rt");
    if (rt) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Update store with new tokens
          if (store.user) {
            store.setAuth(store.user, data.accessToken, data.refreshToken);
          }

          // Retry the original request
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          const retryResponse = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
          });

          if (!retryResponse.ok) {
            const errData = await retryResponse.json().catch(() => ({}));
            throw new Error(errData.message || "Request retry failed");
          }

          return retryResponse.json();
        }
      } catch (err) {
        console.error("🔒 Token refresh rotation failed:", err);
      }
    }

    // Force logout on session invalidation
    store.clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "An unexpected API error occurred");
  }

  // Handle potential empty responses (e.g. 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
