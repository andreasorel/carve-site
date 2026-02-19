/**
 * Shared fetch utility with timeout and error handling.
 * Returns null on failure instead of throwing.
 */
export async function safeFetch(
  url: string,
  timeout = 15000
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AgentReadinessBot/1.0; +https://carve.co)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
