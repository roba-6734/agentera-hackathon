function normalizeApiBaseUrl(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function buildApiUrl(path: string, baseUrl: string): string {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getApiRequestCandidates(path: string): string[] {
  const candidates = [path];
  const configuredBaseUrl = normalizeApiBaseUrl((import.meta as any).env?.VITE_API_BASE_URL);
  if (configuredBaseUrl) {
    candidates.push(buildApiUrl(path, configuredBaseUrl));
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
    if (localHostnames.has(hostname) && port !== "3000") {
      candidates.push(buildApiUrl(path, `${protocol}//${hostname}:3000`));
      if (hostname !== "localhost") {
        candidates.push(buildApiUrl(path, `${protocol}//localhost:3000`));
      }
    }
  }

  return Array.from(new Set(candidates));
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input !== "string" || !input.startsWith("/api")) {
    return fetch(input, init);
  }

  let lastError: unknown;
  for (const candidate of getApiRequestCandidates(input)) {
    try {
      const response = await fetch(candidate, init);
      const contentType = response.headers.get("content-type") || "";

      if (response.ok && !contentType.includes("application/json")) {
        lastError = new Error(`API endpoint returned ${contentType || "non-JSON"} content from ${candidate}.`);
        continue;
      }

      return response;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  throw new Error(
    `Advisor API is not reachable. Open the app through npm run dev on port 3000, or set VITE_API_BASE_URL to the running backend. ${lastError instanceof Error ? lastError.message : ""}`.trim()
  );
}
