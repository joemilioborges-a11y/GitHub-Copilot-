/**
 * JOBS 1.0 — CLIENTE GEMINI PROXIED (SERVER-SIDE MEDIATED)
 *
 * Todas as chamadas para a API Gemini (incluindo Maps Grounding, Streaming e Live API)
 * trafegam exclusivamente através das rotas de backend Express (/api/gemini/*).
 * A chave GEMINI_API_KEY nunca é exposta nem exigida no navegador.
 */

export interface SafeMeetupPlaceCitation {
  title: string;
  uri: string;
  category: string;
}

export interface SafeMeetupRecommendationParams {
  zoneId: string;
  neighborhoodName: string;
  cityName: string;
  centroid: {
    lat: number;
    lng: number;
  };
}

export interface SafeMeetupRecommendationResult {
  summaryText: string;
  citations: SafeMeetupPlaceCitation[];
  source: 'gemini_maps_grounding' | 'curated_public_landmarks';
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return '';
  }
  const port = (typeof process !== 'undefined' && process.env?.PORT) || 3000;
  return `http://127.0.0.1:${port}`;
}

/**
 * Consulta recomendações de locais públicos seguros através do proxy Express no servidor.
 */
export async function getSafeMeetupRecommendationsClient(
  params: SafeMeetupRecommendationParams
): Promise<SafeMeetupRecommendationResult> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/gemini/safe-meetup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Servidor retornou status ${res.status}`);
    }

    const data = await res.json();
    return data as SafeMeetupRecommendationResult;
  } catch (err) {
    console.warn('[Gemini Client] Erro ao consultar backend de recomendações:', err);
    return {
      summaryText: `Locais públicos recomendados em ${params.neighborhoodName}, ${params.cityName}: selecione estabelecimentos movimentados e com boa iluminação.`,
      citations: [],
      source: 'curated_public_landmarks',
    };
  }
}

/**
 * Geração de conteúdo no servidor (proxy)
 */
export async function generateContentClient(params: {
  contents: string;
  systemInstruction?: string;
  model?: string;
}): Promise<{ text?: string; error?: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha na requisição Gemini',
    };
  }
}

/**
 * Geração de conteúdo em modo streaming (SSE) através do servidor
 */
export async function generateContentStreamClient(
  params: {
    contents: string;
    systemInstruction?: string;
    model?: string;
  },
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/gemini/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Erro ao iniciar stream: HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const rawText = decoder.decode(value, { stream: true });
      const lines = rawText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              onChunk(data.text);
            }
          } catch {
            // Continua leitura
          }
        }
      }
    }
  }
}

/**
 * Abre conexão WebSocket para a Live API gerenciada pelo servidor.
 */
export function connectGeminiLiveClient(callbacks: {
  onAudioChunk?: (base64Audio: string) => void;
  onInterrupted?: () => void;
  onError?: (err: string) => void;
  onClose?: () => void;
}) {
  if (typeof window === 'undefined') {
    return {
      sendAudioPcm16k: () => {},
      sendText: () => {},
      close: () => {},
    };
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/gemini/live`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.audio && callbacks.onAudioChunk) {
        callbacks.onAudioChunk(data.audio);
      }
      if (data.interrupted && callbacks.onInterrupted) {
        callbacks.onInterrupted();
      }
      if (data.error && callbacks.onError) {
        callbacks.onError(data.error);
      }
    } catch {
      // Ignora frames não JSON
    }
  };

  ws.onerror = () => {
    if (callbacks.onError) callbacks.onError('Erro na conexão com Gemini Live no servidor.');
  };

  ws.onclose = () => {
    if (callbacks.onClose) callbacks.onClose();
  };

  return {
    sendAudioPcm16k: (base64Audio: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: base64Audio }));
      }
    },
    sendText: (text: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text }));
      }
    },
    close: () => {
      ws.close();
    },
  };
}
