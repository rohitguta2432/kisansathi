// Streaming client for POST /api/ask (Server-Sent Events over fetch).

const API_BASE =
  process.env.NEXT_PUBLIC_KISANSATHI_API ?? "http://localhost:8000";

export interface RoutedInfo {
  agent: string;
  agent_name: string;
  agent_name_hi: string;
  emoji: string;
  language: string;
}

export interface AskCallbacks {
  onRouting: () => void;
  onRouted: (info: RoutedInfo) => void;
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function ask(question: string, cb: AskCallbacks): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!resp.ok || !resp.body) {
    cb.onError(`Backend error (HTTP ${resp.status}). Is the API running on ${API_BASE}?`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      const payload = JSON.parse(data);
      switch (event) {
        case "routing":
          cb.onRouting();
          break;
        case "routed":
          cb.onRouted(payload as RoutedInfo);
          break;
        case "token":
          cb.onToken(payload.text as string);
          break;
        case "done":
          cb.onDone();
          break;
        case "error":
          cb.onError(payload.message as string);
          break;
      }
    }
  }
}
