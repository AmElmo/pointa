/**
 * AI model configuration for video processing
 * Easy to switch models without code changes via OpenRouter
 */

export const AI_MODELS = {
  // Whisper for transcription (~$0.006/min)
  transcription: 'openai/whisper-large-v3',

  // LLM for segmentation and categorization
  // Options: 'anthropic/claude-3-haiku', 'openai/gpt-4o-mini', 'meta-llama/llama-3-70b'
  segmentation: 'anthropic/claude-3-haiku'
};

export const OPENROUTER_CONFIG = {
  baseUrl: 'https://openrouter.ai/api/v1',
  // API key should be set via OPENROUTER_API_KEY environment variable
  getApiKey: () => process.env.OPENROUTER_API_KEY
};
