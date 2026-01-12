/**
 * video-segmenter.js
 *
 * AI-powered video segmentation service.
 * Takes transcription and video metadata (clicks, page changes)
 * and creates categorized feedback points.
 */

import { openRouterClient } from './openrouter-client.js';
import { AI_MODELS } from '../config/ai-models.js';

// Time tolerance for correlating clicks to transcript (ms)
const CLICK_CORRELATION_TOLERANCE = 2000;

/**
 * Segment video into feedback points
 * @param {Object} params - Segmentation parameters
 * @param {Object} params.transcription - Parsed transcription with segments
 * @param {Array} params.clicks - Click events from recording
 * @param {Array} params.pageChanges - Page change events from recording
 * @param {Function} [params.onProgress] - Progress callback
 * @returns {Promise<Array>} Array of feedback points
 */
export async function segmentVideo({ transcription, clicks, pageChanges, onProgress }) {
  console.log('[VideoSegmenter] Starting segmentation...');

  if (onProgress) {
    onProgress({ status: 'analyzing', message: 'Analyzing feedback...' });
  }

  // Build segments based on page changes and transcript pauses
  const segments = buildSegments({
    transcriptSegments: transcription.segments || [],
    pageChanges: pageChanges || [],
    clicks: clicks || []
  });

  console.log('[VideoSegmenter] Built', segments.length, 'initial segments');

  if (segments.length === 0) {
    return [];
  }

  if (onProgress) {
    onProgress({ status: 'categorizing', message: 'Categorizing items...' });
  }

  // Categorize each segment using AI
  const feedbackPoints = await categorizeSegments(segments);

  console.log('[VideoSegmenter] Categorized', feedbackPoints.length, 'feedback points');

  return feedbackPoints;
}

/**
 * Build initial segments from transcript, page changes, and clicks
 * @param {Object} params - Build parameters
 * @returns {Array} Array of raw segments
 */
function buildSegments({ transcriptSegments, pageChanges, clicks }) {
  const segments = [];

  // Create time-ordered events list
  const events = [
    ...pageChanges.map(pc => ({
      type: 'page_change',
      timestamp: pc.timestamp,
      data: pc
    })),
    ...clicks.map(c => ({
      type: 'click',
      timestamp: c.timestamp,
      data: c
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Process each transcript segment
  for (const tseg of transcriptSegments) {
    const startMs = tseg.start * 1000;
    const endMs = tseg.end * 1000;

    // Find page URL for this segment (most recent page change before segment start)
    const pageChange = findPageAtTime(pageChanges, startMs);
    const pageUrl = pageChange?.url || pageChanges[0]?.url || 'unknown';

    // Find clicks within this segment (with tolerance)
    const relatedClicks = clicks.filter(c => {
      const clickTime = c.timestamp;
      return clickTime >= (startMs - CLICK_CORRELATION_TOLERANCE) &&
             clickTime <= (endMs + CLICK_CORRELATION_TOLERANCE);
    });

    // Get element context from related clicks
    const elementContext = relatedClicks.length > 0 ? relatedClicks[0].element : null;

    segments.push({
      time_range: { start: startMs, end: endMs },
      transcript: tseg.text.trim(),
      page_url: pageUrl,
      element_context: elementContext,
      clicks: relatedClicks
    });
  }

  return segments;
}

/**
 * Find the active page at a given timestamp
 * @param {Array} pageChanges - Page change events
 * @param {number} timestamp - Time in milliseconds
 * @returns {Object|null} Page change event
 */
function findPageAtTime(pageChanges, timestamp) {
  let activePage = null;

  for (const pc of pageChanges) {
    if (pc.timestamp <= timestamp) {
      activePage = pc;
    } else {
      break;
    }
  }

  return activePage;
}

/**
 * Categorize segments using AI
 * @param {Array} segments - Raw segments to categorize
 * @returns {Promise<Array>} Categorized feedback points
 */
async function categorizeSegments(segments) {
  // Batch segments for efficiency
  const BATCH_SIZE = 10;
  const feedbackPoints = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const categorized = await categorizeSegmentBatch(batch);
    feedbackPoints.push(...categorized);
  }

  return feedbackPoints;
}

/**
 * Categorize a batch of segments using AI
 * @param {Array} segments - Batch of segments
 * @returns {Promise<Array>} Categorized feedback points
 */
async function categorizeSegmentBatch(segments) {
  const prompt = buildCategorizationPrompt(segments);

  try {
    const response = await openRouterClient.chatCompletion({
      model: AI_MODELS.segmentation,
      messages: [
        {
          role: 'system',
          content: `You are an AI that categorizes user feedback from video recordings.
Each feedback point should be categorized as one of:
- "annotation": Design changes, UI improvements, visual feedback (keywords: "change", "make it", "should be", "want", "like", "prefer", "update", "adjust")
- "bug_report": Bugs, errors, broken functionality (keywords: "broken", "doesn't work", "error", "wrong", "bug", "issue", "problem", "crash")
- "performance_report": Performance issues, slowness (keywords: "slow", "loading", "takes forever", "laggy", "frozen", "hangs", "performance")

Respond with a JSON array of objects with "index" (0-based) and "type" fields.
If a segment doesn't clearly fit any category or is just filler speech, set type to null.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      maxTokens: 1024
    });

    const content = response.choices?.[0]?.message?.content || '[]';

    // Parse AI response
    let categories;
    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      categories = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      console.warn('[VideoSegmenter] Failed to parse AI response:', e.message);
      // Fallback: apply heuristic categorization
      categories = segments.map((seg, idx) => ({
        index: idx,
        type: heuristicCategorize(seg.transcript)
      }));
    }

    // Build feedback points from categorized segments
    const feedbackPoints = [];
    for (const cat of categories) {
      if (cat.type && segments[cat.index]) {
        const seg = segments[cat.index];
        feedbackPoints.push({
          id: `fp_${Date.now()}_${cat.index}`,
          type: cat.type,
          time_range: seg.time_range,
          transcript: seg.transcript,
          page_url: seg.page_url,
          element_context: seg.element_context,
          clicks: seg.clicks
        });
      }
    }

    return feedbackPoints;
  } catch (error) {
    console.error('[VideoSegmenter] AI categorization error:', error);
    // Fallback to heuristic categorization
    return segments
      .map((seg, idx) => {
        const type = heuristicCategorize(seg.transcript);
        if (!type) return null;
        return {
          id: `fp_${Date.now()}_${idx}`,
          type,
          time_range: seg.time_range,
          transcript: seg.transcript,
          page_url: seg.page_url,
          element_context: seg.element_context,
          clicks: seg.clicks
        };
      })
      .filter(Boolean);
  }
}

/**
 * Build prompt for categorization
 * @param {Array} segments - Segments to categorize
 * @returns {string} Prompt text
 */
function buildCategorizationPrompt(segments) {
  const lines = segments.map((seg, idx) => {
    return `[${idx}] "${seg.transcript}"`;
  });

  return `Categorize these user feedback segments:\n\n${lines.join('\n')}\n\nRespond with JSON array:`;
}

/**
 * Heuristic categorization fallback
 * @param {string} transcript - Transcript text
 * @returns {string|null} Category or null
 */
function heuristicCategorize(transcript) {
  const text = transcript.toLowerCase();

  // Bug indicators
  if (/\b(broken|doesn't work|error|wrong|bug|issue|problem|crash|fail|not working)\b/.test(text)) {
    return 'bug_report';
  }

  // Performance indicators
  if (/\b(slow|loading|takes forever|laggy|frozen|hangs|performance|waiting)\b/.test(text)) {
    return 'performance_report';
  }

  // Annotation indicators
  if (/\b(change|make it|should be|want|like|prefer|update|adjust|move|add|remove|color|font|size|style)\b/.test(text)) {
    return 'annotation';
  }

  // Not clearly categorizable
  return null;
}

/**
 * Format time in milliseconds to MM:SS
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
