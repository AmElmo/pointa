/**
 * openrouter-client.js
 *
 * Unified client for OpenRouter API calls.
 * Supports both chat completions (LLM) and audio transcription (Whisper).
 */

import { OPENROUTER_CONFIG } from '../config/ai-models.js';

export class OpenRouterClient {
  constructor() {
    this.baseUrl = OPENROUTER_CONFIG.baseUrl;
  }

  /**
   * Get API key from environment
   * @returns {string} API key
   * @throws {Error} If API key not configured
   */
  getApiKey() {
    const apiKey = OPENROUTER_CONFIG.getApiKey();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  /**
   * Make a chat completion request
   * @param {Object} params - Request parameters
   * @param {string} params.model - Model to use (e.g., 'anthropic/claude-3-haiku')
   * @param {Array} params.messages - Messages array
   * @param {number} [params.temperature=0.3] - Temperature for sampling
   * @param {number} [params.maxTokens=2048] - Max tokens in response
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion({ model, messages, temperature = 0.3, maxTokens = 2048 }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`,
        'HTTP-Referer': 'https://pointa.dev',
        'X-Title': 'Pointa Video Annotation'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Transcribe audio using Whisper via OpenRouter
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {string} [model='openai/whisper-large-v3'] - Whisper model to use
   * @returns {Promise<Object>} Transcription result with word-level timestamps
   */
  async transcribeAudio(audioBuffer, model = 'openai/whisper-large-v3') {
    // OpenRouter uses OpenAI-compatible endpoint for audio
    // We need to use multipart/form-data for audio uploads
    const FormData = (await import('form-data')).default;
    const formData = new FormData();

    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'HTTP-Referer': 'https://pointa.dev',
        'X-Title': 'Pointa Video Annotation',
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter Whisper API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// Singleton instance
export const openRouterClient = new OpenRouterClient();
