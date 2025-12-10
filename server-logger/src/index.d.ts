/**
 * pointa-server-logger
 * 
 * Capture backend server logs for Pointa bug reports.
 */

export interface PointaServerLoggerOptions {
  /** Pointa server port (default: 4242) */
  port?: number;
  /** Pointa server host (default: '127.0.0.1') */
  host?: string;
  /** Capture uncaught exceptions (default: true) */
  captureErrors?: boolean;
  /** Capture unhandled promise rejections (default: true) */
  captureRejections?: boolean;
  /** Enable verbose logging for debugging (default: false) */
  verbose?: boolean;
}

export class PointaServerLogger {
  constructor(options?: PointaServerLoggerOptions);
  
  /** Connect to Pointa server via WebSocket */
  connect(): void;
  
  /** Disconnect from server and cleanup */
  disconnect(): void;
  
  /** Whether the logger is currently connected */
  readonly isConnected: boolean;
  
  /** Whether a recording session is active */
  readonly isRecording: boolean;
}

/**
 * Initialize the Pointa server logger with options
 * @param options - Configuration options
 * @returns The logger instance
 */
export function initPointaLogger(options?: PointaServerLoggerOptions): PointaServerLogger;

/**
 * Get the current logger instance
 * @returns The logger instance or null if not initialized
 */
export function getLogger(): PointaServerLogger | null;

/**
 * Disconnect and cleanup the logger
 */
export function disconnectLogger(): void;

