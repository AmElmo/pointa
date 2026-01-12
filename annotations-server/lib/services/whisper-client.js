/**
 * whisper-client.js
 *
 * Audio transcription service using Whisper via OpenRouter.
 * Extracts audio from video and returns word-level timestamps.
 */

import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { openRouterClient } from './openrouter-client.js';
import { AI_MODELS } from '../config/ai-models.js';

const TEMP_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.pointa', 'temp');

/**
 * Extract audio from video using ffmpeg
 * @param {Buffer} videoBuffer - Video file buffer
 * @returns {Promise<Buffer>} Extracted audio buffer
 */
async function extractAudioFromVideo(videoBuffer) {
  // Ensure temp directory exists
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }

  const tempId = randomUUID();
  const inputPath = path.join(TEMP_DIR, `video-${tempId}.webm`);
  const outputPath = path.join(TEMP_DIR, `audio-${tempId}.mp3`);

  try {
    // Write video to temp file
    await writeFile(inputPath, videoBuffer);

    // Extract audio using ffmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-vn',  // No video
        '-acodec', 'libmp3lame',
        '-ar', '16000',  // Sample rate optimal for speech
        '-ac', '1',  // Mono
        '-b:a', '64k',  // Bitrate
        '-y',  // Overwrite output
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
      });
    });

    // Read extracted audio
    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(outputPath);

    return audioBuffer;
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(inputPath)) await unlink(inputPath);
      if (existsSync(outputPath)) await unlink(outputPath);
    } catch (e) {
      console.warn('[WhisperClient] Error cleaning up temp files:', e.message);
    }
  }
}

/**
 * Transcribe video to text with word-level timestamps
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Object>} Transcription result
 */
export async function transcribeVideo(videoBuffer, onProgress) {
  console.log('[WhisperClient] Starting transcription...');

  if (onProgress) {
    onProgress({ status: 'extracting_audio', message: 'Extracting audio from video...' });
  }

  // Extract audio from video
  const audioBuffer = await extractAudioFromVideo(videoBuffer);
  console.log('[WhisperClient] Audio extracted, size:', audioBuffer.length);

  if (onProgress) {
    onProgress({ status: 'transcribing', message: 'Transcribing audio...' });
  }

  // Send to Whisper via OpenRouter
  const transcription = await openRouterClient.transcribeAudio(
    audioBuffer,
    AI_MODELS.transcription
  );

  console.log('[WhisperClient] Transcription complete');

  // Format result
  return {
    text: transcription.text,
    segments: transcription.segments || [],
    words: transcription.words || [],
    language: transcription.language,
    duration: transcription.duration
  };
}

/**
 * Parse transcription into timed segments
 * Segments are grouped by natural pauses (>1.5s) or explicit segment breaks
 * @param {Object} transcription - Raw transcription from Whisper
 * @returns {Array} Array of transcript segments
 */
export function parseTranscriptSegments(transcription) {
  const segments = [];

  // Use word-level timestamps if available
  if (transcription.words && transcription.words.length > 0) {
    let currentSegment = {
      start: transcription.words[0].start,
      end: transcription.words[0].end,
      text: transcription.words[0].word,
      words: [transcription.words[0]]
    };

    for (let i = 1; i < transcription.words.length; i++) {
      const word = transcription.words[i];
      const gap = word.start - currentSegment.end;

      // Start new segment if gap > 1.5 seconds
      if (gap > 1.5) {
        segments.push(currentSegment);
        currentSegment = {
          start: word.start,
          end: word.end,
          text: word.word,
          words: [word]
        };
      } else {
        currentSegment.end = word.end;
        currentSegment.text += ' ' + word.word;
        currentSegment.words.push(word);
      }
    }

    // Push final segment
    if (currentSegment.words.length > 0) {
      segments.push(currentSegment);
    }
  } else if (transcription.segments && transcription.segments.length > 0) {
    // Fall back to segment-level timestamps
    return transcription.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: []
    }));
  }

  return segments;
}
