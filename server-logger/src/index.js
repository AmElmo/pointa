/**
 * pointa-server-logger
 * 
 * Capture backend server logs for Pointa bug reports.
 * 
 * Usage (side-effect import - simplest):
 *   import 'pointa-server-logger';
 * 
 * Usage (with options):
 *   import { initPointaLogger } from 'pointa-server-logger';
 *   initPointaLogger({ port: 4242 });
 * 
 * The logger connects to the Pointa server via WebSocket and streams
 * console logs when a bug recording session is active.
 */

import { PointaServerLogger } from './logger.js';

// Default instance
let defaultLogger = null;

/**
 * Initialize the Pointa server logger with options
 * @param {Object} options
 * @param {number} options.port - Pointa server port (default: 4242)
 * @param {string} options.host - Pointa server host (default: '127.0.0.1')
 * @param {boolean} options.captureErrors - Capture uncaught exceptions (default: true)
 * @param {boolean} options.captureRejections - Capture unhandled promise rejections (default: true)
 * @returns {PointaServerLogger}
 */
export function initPointaLogger(options = {}) {
  if (defaultLogger) {
    console.warn('[Pointa] Logger already initialized');
    return defaultLogger;
  }
  
  defaultLogger = new PointaServerLogger(options);
  defaultLogger.connect();
  
  return defaultLogger;
}

/**
 * Get the current logger instance
 * @returns {PointaServerLogger|null}
 */
export function getLogger() {
  return defaultLogger;
}

/**
 * Disconnect and cleanup the logger
 */
export function disconnectLogger() {
  if (defaultLogger) {
    defaultLogger.disconnect();
    defaultLogger = null;
  }
}

// Auto-initialize with defaults when imported as side-effect
// This allows: import 'pointa-server-logger';
initPointaLogger();

export { PointaServerLogger };

