import { CONFIG } from '../config';

export interface ReplicateGpt5Response {
  status: 'success' | 'error';
  model?: string;
  response?: string;
  message?: string;
}

export interface ReplicateGeminiTtsResponse {
  status: 'success' | 'error';
  model?: string;
  audioUrl?: string;
  message?: string;
}

export class ReplicateService {
  /**
   * Queries openai/gpt-5-pro model on Replicate API.
   */
  static async queryGpt5Pro(
    prompt: string,
    systemPrompt: string = ''
  ): Promise<ReplicateGpt5Response> {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/replicate/gpt5-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          system_prompt: systemPrompt || 'You are Vazhi AI, an intelligent driving co-pilot.',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (e: any) {
      console.warn('[ReplicateService] GPT-5 Pro query failed:', e.message);
      return {
        status: 'error',
        message: e.message || 'Failed to query GPT-5 Pro model.',
      };
    }
  }

  /**
   * Generates expressive text-to-speech audio via google/gemini-3.1-flash-tts model on Replicate API.
   */
  static async generateGeminiTts(
    text: string,
    voice: string = 'Algenib'
  ): Promise<ReplicateGeminiTtsResponse> {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/replicate/gemini-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (e: any) {
      console.warn('[ReplicateService] Gemini TTS generation failed:', e.message);
      return {
        status: 'error',
        message: e.message || 'Failed to generate Gemini TTS audio.',
      };
    }
  }
}

export default ReplicateService;
