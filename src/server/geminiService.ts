import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Obtém a API Key estritamente no ambiente do servidor
const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

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

/**
 * Executa recomendação de locais públicos seguros com Gemini Maps Grounding no servidor.
 * Protege a chave de API no backend e envia apenas os dados higienizados para o cliente.
 */
export async function getSafeMeetupRecommendationsServer(
  params: SafeMeetupRecommendationParams
): Promise<SafeMeetupRecommendationResult> {
  if (!ai || !apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      summaryText: `Locais públicos em ${params.neighborhoodName}, ${params.cityName}: selecione estabelecimentos movimentados e bem iluminados para encontros seguros.`,
      citations: [],
      source: 'curated_public_landmarks',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Recomende 3 lugares públicos seguros, bem iluminados e conceituados (restaurantes, cafés ou centros culturais) na região de ${params.neighborhoodName}, em ${params.cityName}, ideais para um primeiro encontro seguro entre adultos. Seja conciso em português.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: params.centroid.lat,
              longitude: params.centroid.lng,
            },
          },
        },
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundedCitations: SafeMeetupPlaceCitation[] = [];

    for (const chunk of chunks) {
      const mapsChunk = (chunk as Record<string, unknown>)?.maps as
        | { uri?: string; title?: string }
        | undefined;
      if (mapsChunk?.uri && mapsChunk?.title) {
        groundedCitations.push({
          title: String(mapsChunk.title),
          uri: String(mapsChunk.uri),
          category: 'Google Maps Verificado',
        });
      }
    }

    return {
      summaryText:
        response.text ||
        `Sugestões públicas verificadas em ${params.neighborhoodName}, ${params.cityName}.`,
      citations: groundedCitations,
      source: groundedCitations.length > 0 ? 'gemini_maps_grounding' : 'curated_public_landmarks',
    };
  } catch (err) {
    console.warn('[Gemini Server] Falha ao consultar Gemini Maps Grounding:', err);
    return {
      summaryText: `Sugestões para ${params.neighborhoodName}, ${params.cityName}: prefira locais com boa movimentação pública e transporte acessível.`,
      citations: [],
      source: 'curated_public_landmarks',
    };
  }
}

/**
 * Geração de conteúdo no servidor (texto geral)
 */
export async function generateContentServer(params: {
  contents: string;
  systemInstruction?: string;
  model?: string;
}) {
  if (!ai || !apiKey) {
    throw new Error('Servidor sem GEMINI_API_KEY configurada.');
  }

  const modelToUse = params.model || 'gemini-3.8-flash';
  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: params.contents,
    config: params.systemInstruction
      ? { systemInstruction: params.systemInstruction }
      : undefined,
  });

  return {
    text: response.text,
    groundingMetadata: response.candidates?.[0]?.groundingMetadata,
  };
}

/**
 * Inicializa a ponte WebSocket para Gemini Live API no servidor.
 * O cliente transmite áudio PCM 16kHz e recebe áudio PCM 24kHz do modelo em tempo real.
 */
export function setupGeminiLiveWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/gemini/live' || url.pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    if (!ai || !apiKey) {
      clientWs.send(
        JSON.stringify({
          error: 'GEMINI_API_KEY não configurada no servidor para Live API.',
        })
      );
      clientWs.close();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction:
            'Você é o assistente oficial do Jhobs 18+. Seja simpático, prestativo e converse em português brasileiro.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
          onerror: (err) => {
            console.error('[Gemini Live Session Error]', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: 'Erro na sessão Live API' }));
            }
          },
        },
      });

      clientWs.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (err) {
          console.warn('[Gemini Live Parse Error]', err);
        }
      });

      clientWs.on('close', () => {
        session.close();
      });
    } catch (err) {
      console.error('[Gemini Live Setup Error]', err);
      clientWs.send(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Falha ao conectar Gemini Live API.',
        })
      );
      clientWs.close();
    }
  });

  return wss;
}
