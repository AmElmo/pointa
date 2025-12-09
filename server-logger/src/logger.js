/**
 * PointaServerLogger
 * 
 * Captures console.log/warn/error and streams them to Pointa server
 * when a recording session is active.
 */

import WebSocket from 'ws';

export class PointaServerLogger {
  constructor(options = {}) {
    this.port = options.port || 4242;
    this.host = options.host || '127.0.0.1';
    this.captureErrors = options.captureErrors !== false;
    this.captureRejections = options.captureRejections !== false;
    
    this.ws = null;
    this.isConnected = false;
    this.isRecording = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };
    
    // Buffer for logs while connecting
    this.buffer = [];
    this.maxBufferSize = 100;
    
    // Bind handlers
    this.handleUncaughtException = this.handleUncaughtException.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }
  
  /**
   * Connect to Pointa server via WebSocket
   */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    
    const wsUrl = `ws://${this.host}:${this.port}/backend-logs`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.originalConsole.log('[Pointa] Connected to server for backend logging');
        
        // Send any buffered logs
        this.flushBuffer();
        
        // Setup console interception
        this.interceptConsole();
        
        // Setup error handlers
        if (this.captureErrors) {
          process.on('uncaughtException', this.handleUncaughtException);
        }
        if (this.captureRejections) {
          process.on('unhandledRejection', this.handleUnhandledRejection);
        }
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      this.ws.on('close', () => {
        this.isConnected = false;
        this.isRecording = false;
        this.originalConsole.log('[Pointa] Disconnected from server');
        this.restoreConsole();
        this.scheduleReconnect();
      });
      
      this.ws.on('error', (error) => {
        // Silent fail - don't spam console if Pointa server isn't running
        if (error.code === 'ECONNREFUSED') {
          // Server not running, will retry
          this.scheduleReconnect();
        }
      });
      
    } catch (error) {
      // Silent fail on connection error
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.originalConsole.warn('[Pointa] Max reconnection attempts reached. Backend logging disabled.');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Handle messages from the Pointa server
   */
  handleServerMessage(message) {
    switch (message.type) {
      case 'start_recording':
        this.isRecording = true;
        this.originalConsole.log('[Pointa] Backend log recording started');
        break;
        
      case 'stop_recording':
        this.isRecording = false;
        this.originalConsole.log('[Pointa] Backend log recording stopped');
        break;
        
      case 'ping':
        this.send({ type: 'pong' });
        break;
    }
  }
  
  /**
   * Intercept console methods to capture logs
   */
  interceptConsole() {
    const self = this;
    
    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
      console[level] = function(...args) {
        // Always call original
        self.originalConsole[level](...args);
        
        // Only send to Pointa if recording
        if (self.isRecording && self.isConnected) {
          self.sendLog(level, args);
        }
      };
    });
  }
  
  /**
   * Restore original console methods
   */
  restoreConsole() {
    Object.keys(this.originalConsole).forEach(level => {
      console[level] = this.originalConsole[level];
    });
  }
  
  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    if (this.isRecording && this.isConnected) {
      this.sendLog('error', [error.message], error.stack);
    }
    // Re-throw to let Node handle it normally
    throw error;
  }
  
  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason) {
    if (this.isRecording && this.isConnected) {
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.sendLog('error', [`Unhandled Promise Rejection: ${message}`], stack);
    }
  }
  
  /**
   * Send a log entry to the server
   */
  sendLog(level, args, stack = null) {
    const logEntry = {
      type: 'log',
      timestamp: new Date().toISOString(),
      level: this.normalizeLevel(level),
      message: this.formatArgs(args),
      stack: stack
    };
    
    this.send(logEntry);
  }
  
  /**
   * Normalize log level to standard levels
   */
  normalizeLevel(level) {
    switch (level) {
      case 'debug':
      case 'info':
      case 'log':
        return 'log';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      default:
        return 'log';
    }
  }
  
  /**
   * Format console arguments to a string
   */
  formatArgs(args) {
    return args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      
      try {
        return JSON.stringify(arg, this.getCircularReplacer(), 2);
      } catch (e) {
        return '[Object]';
      }
    }).join(' ');
  }
  
  /**
   * Handle circular references in JSON.stringify
   */
  getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }
  
  /**
   * Send data to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (e) {
        // Silent fail
      }
    } else {
      // Buffer if not connected
      if (this.buffer.length < this.maxBufferSize) {
        this.buffer.push(data);
      }
    }
  }
  
  /**
   * Flush buffered logs
   */
  flushBuffer() {
    while (this.buffer.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = this.buffer.shift();
      this.send(data);
    }
  }
  
  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.restoreConsole();
    
    if (this.captureErrors) {
      process.removeListener('uncaughtException', this.handleUncaughtException);
    }
    if (this.captureRejections) {
      process.removeListener('unhandledRejection', this.handleUnhandledRejection);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isRecording = false;
  }
}

