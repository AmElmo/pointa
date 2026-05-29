/**
 * bug-recorder.js
 * 
 * Handles recording bug sessions including console logs, network requests,
 * user interactions, and generates comprehensive timeline data for debugging.
 * 
 * IMPORTANT: Network and console capture now uses Chrome DevTools Protocol (CDP)
 * via the background script. This ensures we capture ALL network requests and
 * console messages from the page's MAIN world, not just the isolated content script world.
 */

const BugRecorder = {
  isRecording: false,
  recordingData: null,
  startTime: null,
  // Note: consoleBackup, originalFetch, originalXHROpen, originalXHRSend are no longer needed
  // as we now use CDP for network/console capture
  errorHandler: null,  // Window error handler reference
  rejectionHandler: null,  // Unhandled rejection handler reference
  performanceObserver: null,
  interactionHandlers: new Map(),
  maxRecordingDuration: 30000, // 30 seconds (handled by sidebar UI)
  
  // Backend logging integration
  includeBackendLogs: false,  // Whether to capture backend logs
  captureStdout: false,       // Whether to capture full terminal output (stdout/stderr)
  backendLogStatus: null,     // Current backend log connection status

  // Page-level network fallback used when CDP/debugger data is unavailable.
  cdpRecordingActive: false,
  networkInstrumentationActive: false,
  networkInstrumentationId: null,
  networkInstrumentationEventName: null,
  networkInstrumentationStopEventName: null,
  networkInstrumentationMessageHandler: null,
  networkInstrumentationEvents: [],
  consoleInstrumentationActive: false,
  consoleInstrumentationId: null,
  consoleInstrumentationEventName: null,
  consoleInstrumentationStopEventName: null,
  consoleInstrumentationMessageHandler: null,
  consoleInstrumentationEvents: [],

  // ========== TOKEN OPTIMIZATION HELPERS ==========
  
  /**
   * Parse userAgent into simplified browser/OS info
   * e.g., "Chrome 142 / macOS" instead of full UA string
   */
  simplifyUserAgent(ua) {
    if (!ua) return 'Unknown';
    
    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('Chrome/')) {
      const match = ua.match(/Chrome\/(\d+)/);
      browser = match ? `Chrome ${match[1]}` : 'Chrome';
    } else if (ua.includes('Firefox/')) {
      const match = ua.match(/Firefox\/(\d+)/);
      browser = match ? `Firefox ${match[1]}` : 'Firefox';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      browser = match ? `Safari ${match[1]}` : 'Safari';
    } else if (ua.includes('Edge/')) {
      const match = ua.match(/Edge\/(\d+)/);
      browser = match ? `Edge ${match[1]}` : 'Edge';
    }
    
    // Detect OS
    let os = 'Unknown';
    if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return `${browser} / ${os}`;
  },

  /**
   * Strip %c CSS styling from console messages
   * Chrome's styled console.log uses %c markers with CSS
   */
  stripConsoleStyling(message) {
    if (!message || typeof message !== 'string') return message;
    
    // Remove %c markers and their corresponding CSS values
    // Pattern: %c followed by text, then CSS styling in subsequent args (which appear inline)
    let cleaned = message
      .replace(/%c/g, '')  // Remove %c markers
      .replace(/color:\s*#[0-9a-fA-F]{3,6};?/gi, '')  // Remove color: #xxx
      .replace(/font-weight:\s*\w+;?/gi, '')  // Remove font-weight
      .replace(/font-size:\s*[\d.]+px;?/gi, '')  // Remove font-size
      .replace(/font-family:\s*[^;]+;?/gi, '')  // Remove font-family
      .replace(/background:\s*[^;]+;?/gi, '')  // Remove background
      .replace(/\s{2,}/g, ' ')  // Collapse multiple spaces
      .trim();
    
    return cleaned || message;
  },

  /**
   * Check if a console event should be filtered out
   */
  shouldFilterConsoleEvent(event) {
    const source = event.data?.source || '';
    const message = event.data?.message || '';
    
    // Filter out chrome extension errors (including Pointa itself)
    if (source.startsWith('chrome-extension://')) return true;
    
    // Filter out some common noisy third-party plugin logs
    if (message.includes('[code-inspector-plugin]')) return true;
    if (message.includes('[HMR]') && event.type === 'console-log') return true;  // Hot module reload noise
    
    return false;
  },

  /**
   * Check if a network event should be filtered out
   */
  shouldFilterNetworkEvent(event) {
    const url = event.data?.url || '';
    const method = event.data?.method || '';
    
    // Filter out Pointa's own health check requests
    if (window.PointaBrowser.isLocalServerHealthUrl(url)) return true;
    
    // Filter out OPTIONS/preflight requests (CORS preflight)
    if (method === 'OPTIONS') return true;
    
    // Filter out Pointa backend recording API calls
    if (window.PointaBrowser.isLocalServerBackendUrl(url)) return true;
    
    return false;
  },

  /**
   * Truncate message to max length with ellipsis
   */
  truncateMessage(message, maxLength = 200) {
    if (!message || typeof message !== 'string') return message;
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  },

  /**
   * Start reversible page-level fetch/XHR instrumentation.
   * Events are buffered separately and merged only when CDP has no network data.
   */
  async startNetworkInstrumentation() {
    await this.stopNetworkInstrumentation();

    this.networkInstrumentationEvents = [];
    this.networkInstrumentationId = `pointa_network_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const instrumentationId = this.networkInstrumentationId;
    const eventName = `pointa-network-recorder-event-${instrumentationId}`;
    const stopEventName = `pointa-network-recorder-stop-${instrumentationId}`;
    this.networkInstrumentationEventName = eventName;
    this.networkInstrumentationStopEventName = stopEventName;
    this.networkInstrumentationActive = false;

    this.networkInstrumentationMessageHandler = (event) => {
      let message = null;

      try {
        message = JSON.parse(event.detail);
      } catch (_) {
        return;
      }

      if (!message || message.id !== instrumentationId) return;
      if (message.ready) {
        this.networkInstrumentationActive = true;
        return;
      }
      if (message.error) {
        console.warn('[BugRecorder] Page network instrumentation failed:', message.error);
        return;
      }
      if (!this.isRecording || !message.event) return;

      this.captureNetworkInstrumentationEvent(message.event);
    };

    window.addEventListener(eventName, this.networkInstrumentationMessageHandler);

    const config = {
      id: instrumentationId,
      eventName,
      stopEventName
    };

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startPageNetworkInstrumentation',
        config
      });

      if (response?.success) {
        return true;
      }

      console.warn('[BugRecorder] MAIN-world network instrumentation failed:', response?.error);
    } catch (error) {
      console.warn('[BugRecorder] Could not start MAIN-world network instrumentation:', error.message);
    }

    window.removeEventListener(eventName, this.networkInstrumentationMessageHandler);
    this.networkInstrumentationMessageHandler = null;
    this.networkInstrumentationActive = false;
    this.networkInstrumentationId = null;
    this.networkInstrumentationEventName = null;
    this.networkInstrumentationStopEventName = null;
    this.networkInstrumentationEvents = [];
    return false;
  },

  /**
   * Stop page-level network instrumentation and return buffered events.
   */
  async stopNetworkInstrumentation() {
    const events = this.networkInstrumentationEvents || [];

    if (this.networkInstrumentationId) {
      const config = {
        id: this.networkInstrumentationId,
        stopEventName: this.networkInstrumentationStopEventName || `pointa-network-recorder-stop-${this.networkInstrumentationId}`
      };

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'stopPageNetworkInstrumentation',
          config
        });

        if (!response?.success) {
          window.dispatchEvent(new Event(config.stopEventName));
        }
      } catch (_) {
        window.dispatchEvent(new Event(config.stopEventName));
      }
    }

    if (this.networkInstrumentationMessageHandler && this.networkInstrumentationEventName) {
      window.removeEventListener(this.networkInstrumentationEventName, this.networkInstrumentationMessageHandler);
    }

    this.networkInstrumentationActive = false;
    this.networkInstrumentationId = null;
    this.networkInstrumentationEventName = null;
    this.networkInstrumentationStopEventName = null;
    this.networkInstrumentationMessageHandler = null;
    this.networkInstrumentationEvents = [];

    return events;
  },

  /**
   * Normalize a page-instrumented network event into the existing timeline shape.
   */
  captureNetworkInstrumentationEvent(event) {
    if (!event || event.type !== 'network') return;

    const data = event.data || {};
    const observedAt = typeof event.observedAt === 'number' ? event.observedAt : Date.now();

    this.networkInstrumentationEvents.push({
      timestamp: event.timestamp || new Date(observedAt).toISOString(),
      relativeTime: Math.max(0, observedAt - this.startTime),
      type: 'network',
      subtype: event.subtype === 'failed' ? 'failed' : 'success',
      severity: event.severity === 'error' || event.subtype === 'failed' ? 'error' : 'info',
      data: {
        url: data.url || 'unknown',
        method: String(data.method || 'GET').toUpperCase(),
        status: data.status,
        statusText: data.statusText,
        error: data.error,
        ok: data.ok,
        resourceType: data.resourceType || data.type || 'Fetch',
        type: data.type || 'content-network',
        requestId: data.requestId,
        duration: data.duration
      }
    });
  },

  normalizeNetworkUrlForComparison(url) {
    if (!url) return '';

    try {
      return new URL(url, window.location.href).href;
    } catch (_) {
      return String(url);
    }
  },

  isDuplicateNetworkEvent(existingEvent, candidateEvent) {
    const existingData = existingEvent.data || {};
    const candidateData = candidateEvent.data || {};
    const existingStatus = typeof existingData.status === 'undefined' ? '' : String(existingData.status);
    const candidateStatus = typeof candidateData.status === 'undefined' ? '' : String(candidateData.status);

    return existingEvent.subtype === candidateEvent.subtype &&
      String(existingData.method || '').toUpperCase() === String(candidateData.method || '').toUpperCase() &&
      this.normalizeNetworkUrlForComparison(existingData.url) === this.normalizeNetworkUrlForComparison(candidateData.url) &&
      existingStatus === candidateStatus &&
      Math.abs((existingEvent.relativeTime || 0) - (candidateEvent.relativeTime || 0)) < 500;
  },

  mergeNetworkEvents(cdpNetworkEvents, fallbackNetworkEvents) {
    if (!cdpNetworkEvents.length) return fallbackNetworkEvents;
    if (!fallbackNetworkEvents.length) return cdpNetworkEvents;

    const merged = [...cdpNetworkEvents];
    fallbackNetworkEvents.forEach((fallbackEvent) => {
      const isDuplicate = merged.some((existingEvent) =>
        this.isDuplicateNetworkEvent(existingEvent, fallbackEvent)
      );

      if (!isDuplicate) {
        merged.push(fallbackEvent);
      }
    });

    return merged;
  },

  async startConsoleInstrumentation() {
    await this.stopConsoleInstrumentation();

    this.consoleInstrumentationEvents = [];
    this.consoleInstrumentationId = `pointa_console_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const instrumentationId = this.consoleInstrumentationId;
    const eventName = `pointa-console-recorder-event-${instrumentationId}`;
    const stopEventName = `pointa-console-recorder-stop-${instrumentationId}`;
    this.consoleInstrumentationEventName = eventName;
    this.consoleInstrumentationStopEventName = stopEventName;
    this.consoleInstrumentationActive = false;

    this.consoleInstrumentationMessageHandler = (event) => {
      let message = null;

      try {
        message = JSON.parse(event.detail);
      } catch (_) {
        return;
      }

      if (!message || message.id !== instrumentationId) return;
      if (message.ready) {
        this.consoleInstrumentationActive = true;
        return;
      }
      if (message.error) {
        console.warn('[BugRecorder] Page console instrumentation failed:', message.error);
        return;
      }
      if (!this.isRecording || !message.event) return;

      this.captureConsoleInstrumentationEvent(message.event);
    };

    window.addEventListener(eventName, this.consoleInstrumentationMessageHandler);

    const config = {
      id: instrumentationId,
      eventName,
      stopEventName
    };

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startPageConsoleInstrumentation',
        config
      });

      if (response?.success) {
        return true;
      }

      console.warn('[BugRecorder] MAIN-world console instrumentation failed:', response?.error);
    } catch (error) {
      console.warn('[BugRecorder] Could not start MAIN-world console instrumentation:', error.message);
    }

    this.cleanupConsoleInstrumentationState();
    return false;
  },

  async stopConsoleInstrumentation() {
    const events = this.consoleInstrumentationEvents || [];

    if (this.consoleInstrumentationId) {
      const config = {
        id: this.consoleInstrumentationId,
        stopEventName: this.consoleInstrumentationStopEventName || `pointa-console-recorder-stop-${this.consoleInstrumentationId}`
      };

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'stopPageConsoleInstrumentation',
          config
        });

        if (!response?.success) {
          window.dispatchEvent(new Event(config.stopEventName));
        }
      } catch (_) {
        window.dispatchEvent(new Event(config.stopEventName));
      }
    }

    this.cleanupConsoleInstrumentationState();
    return events;
  },

  cleanupConsoleInstrumentationState() {
    if (this.consoleInstrumentationMessageHandler && this.consoleInstrumentationEventName) {
      window.removeEventListener(this.consoleInstrumentationEventName, this.consoleInstrumentationMessageHandler);
    }

    this.consoleInstrumentationActive = false;
    this.consoleInstrumentationId = null;
    this.consoleInstrumentationEventName = null;
    this.consoleInstrumentationStopEventName = null;
    this.consoleInstrumentationMessageHandler = null;
    this.consoleInstrumentationEvents = [];
  },

  captureConsoleInstrumentationEvent(event) {
    if (!event || !event.type || !event.type.startsWith('console')) return;

    const data = event.data || {};
    const observedAt = typeof event.observedAt === 'number' ? event.observedAt : Date.now();

    this.consoleInstrumentationEvents.push({
      timestamp: event.timestamp || new Date(observedAt).toISOString(),
      relativeTime: Math.max(0, observedAt - this.startTime),
      type: event.type,
      subtype: event.subtype,
      severity: event.severity || (event.type === 'console-error' ? 'error' : event.type === 'console-warning' ? 'warning' : 'info'),
      data: {
        level: data.level || (event.type === 'console-error' ? 'error' : event.type === 'console-warning' ? 'warn' : 'log'),
        message: data.message || '',
        source: data.source || window.location.href,
        url: data.url || window.location.href,
        lineNumber: data.lineNumber,
        columnNumber: data.columnNumber,
        stack: data.stack,
        reason: data.reason,
        capturedBy: data.capturedBy || 'page-console-recorder'
      }
    });
  },

  isDuplicateConsoleEvent(existingEvent, candidateEvent) {
    return existingEvent.type === candidateEvent.type &&
      (existingEvent.data?.message || '') === (candidateEvent.data?.message || '') &&
      Math.abs((existingEvent.relativeTime || 0) - (candidateEvent.relativeTime || 0)) < 500;
  },

  mergeConsoleEvents(cdpConsoleEvents, fallbackConsoleEvents) {
    if (!cdpConsoleEvents.length) return fallbackConsoleEvents;
    if (!fallbackConsoleEvents.length) return cdpConsoleEvents;

    const merged = [...cdpConsoleEvents];
    fallbackConsoleEvents.forEach((fallbackEvent) => {
      const isDuplicate = merged.some((existingEvent) =>
        this.isDuplicateConsoleEvent(existingEvent, fallbackEvent)
      );

      if (!isDuplicate) {
        merged.push(fallbackEvent);
      }
    });

    return merged;
  },

  /**
   * Clean and optimize a console event
   */
  optimizeConsoleEvent(event) {
    if (!event.data) return event;
    
    return {
      ...event,
      data: {
        ...event.data,
        message: this.truncateMessage(this.stripConsoleStyling(event.data.message), 300),
        // Remove stackTrace for info-level logs (keep for errors/warnings)
        stackTrace: event.type === 'console-log' ? undefined : event.data.stackTrace
      }
    };
  },

  /**
   * Deduplicate repeated consecutive events
   * Groups identical messages that occur within 100ms
   */
  dedupeEvents(events) {
    if (!events || events.length === 0) return events;
    
    const deduped = [];
    let lastEvent = null;
    let repeatCount = 0;
    
    for (const event of events) {
      const lastMessage = lastEvent?.data?.message;
      const eventMessage = event.data?.message;
      const isSameMessage = lastEvent && 
        lastEvent.type === event.type &&
        typeof lastMessage === 'string' &&
        lastMessage.length > 0 &&
        lastMessage === eventMessage &&
        Math.abs(event.relativeTime - lastEvent.relativeTime) < 100;
      
      if (isSameMessage) {
        repeatCount++;
      } else {
        if (lastEvent) {
          if (repeatCount > 0) {
            lastEvent.data = {
              ...lastEvent.data,
              message: `${lastEvent.data.message} (×${repeatCount + 1})`
            };
          }
          deduped.push(lastEvent);
        }
        lastEvent = { ...event };
        repeatCount = 0;
      }
    }
    
    // Don't forget the last event
    if (lastEvent) {
      if (repeatCount > 0) {
        lastEvent.data = {
          ...lastEvent.data,
          message: `${lastEvent.data.message} (×${repeatCount + 1})`
        };
      }
      deduped.push(lastEvent);
    }
    
    return deduped;
  },

  // ========== END TOKEN OPTIMIZATION HELPERS ==========

  /**
   * Check backend log connection status
   */
  async checkBackendLogStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBackendLogStatus' });
      if (response.success) {
        this.backendLogStatus = response.status;
        return response.status;
      }
    } catch (error) {
      console.warn('[BugRecorder] Could not check backend log status:', error.message);
    }
    this.backendLogStatus = { connected: false, clientCount: 0 };
    return this.backendLogStatus;
  },

  /**
   * Set whether to include backend logs in recording
   */
  setIncludeBackendLogs(include) {
    this.includeBackendLogs = include;
    // captureStdout is controlled by the dropdown - don't override user's choice
  },

  /**
   * Set whether to capture full terminal output (stdout/stderr)
   */
  setCaptureStdout(capture) {
    this.captureStdout = capture;
  },

  /**
   * Start recording a bug session
   * @param {Object} options - Recording options
   * @param {boolean} options.includeBackendLogs - Whether to capture backend server logs
   */
  async startRecording(options = {}) {
    if (this.isRecording) {
      console.warn('[BugRecorder] Already recording');
      return;
    }

    // Apply options
    if (options.includeBackendLogs !== undefined) {
      this.includeBackendLogs = options.includeBackendLogs;
    }

    this.isRecording = true;
    this.startTime = Date.now();

    // Initialize recording data structure
    this.recordingData = {
      console: [],
      network: [],
      interactions: [],
      backendLogs: [],  // Backend server logs
      metadata: {
        startTime: new Date(this.startTime).toISOString(),
        url: window.location.href,
        browser: this.simplifyUserAgent(navigator.userAgent),  // Simplified: "Chrome 142 / macOS"
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        includesBackendLogs: this.includeBackendLogs
      }
    };

    // Screenshot will be captured at the END of recording to show the bug state

    // Start the page-level network fallback up front. It is merged only if CDP
    // is unavailable, fails, or returns no network events.
    const networkInstrumentationStarted = await this.startNetworkInstrumentation();
    if (!networkInstrumentationStarted) {
      console.warn('[BugRecorder] Page network instrumentation could not be started');
    }

    // Start page-level console instrumentation for browsers without CDP.
    const consoleInstrumentationStarted = await this.startConsoleInstrumentation();
    if (!consoleInstrumentationStarted) {
      console.warn('[BugRecorder] Page console instrumentation could not be started');
    }

    // Start CDP recording via background script
    // This captures network and console via Chrome DevTools Protocol (CDP)
    // which runs in the page's MAIN world, capturing ALL requests and console messages
    const hasDebugger = Boolean(
      window.PointaBrowser &&
      typeof window.PointaBrowser.hasCapability === 'function' &&
      window.PointaBrowser.hasCapability('debugger')
    );
    this.cdpRecordingActive = false;

    if (hasDebugger) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'startCDPRecording' });
        if (response.success) {
          this.cdpRecordingActive = true;
        } else {
          console.warn('[BugRecorder] CDP recording failed to start:', response.error);
          // Continue anyway - page-level fallback will cover fetch/XHR metadata
        }
      } catch (error) {
        console.warn('[BugRecorder] Could not start CDP recording:', error.message);
      }
    }

    // Start backend log recording if enabled
    if (this.includeBackendLogs) {
      // captureStdout is controlled by the dropdown (defaults to false = console-only)
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'startBackendLogRecording',
          captureStdout: this.captureStdout
        });
        if (!response.success) {
          console.warn('[BugRecorder] Backend log recording failed to start:', response.error);
        }
      } catch (error) {
        console.warn('[BugRecorder] Could not start backend log recording:', error.message);
      }
    }

    // Start capturing window error events (backup for CDP)
    this.captureWindowErrors();

    // Start capturing interactions (DOM events work in content script)
    this.captureInteractions();

    // Add recording start event to timeline
    this.addTimelineEvent({
      type: 'recording-start',
      severity: 'info',
      data: {
        url: window.location.href,
        pageState: 'loaded',
        includesBackendLogs: this.includeBackendLogs
      }
    });

    // Note: Auto-stop is handled by the sidebar UI timer
    // which will trigger the full stopBugReporting() flow including UI updates


  },

  /**
   * Stop recording and generate timeline
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('[BugRecorder] Not currently recording');
      return null;
    }

    this.isRecording = false;
    const fallbackNetworkEvents = await this.stopNetworkInstrumentation();
    const fallbackConsoleEvents = await this.stopConsoleInstrumentation();
    let cdpNetworkEvents = [];
    let cdpConsoleEvents = [];

    // Stop CDP recording and get captured events
    if (this.cdpRecordingActive) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'stopCDPRecording' });
        if (response.success) {
          // CDP captures network and console from the page's MAIN world
          cdpNetworkEvents = response.events.network || [];
          cdpConsoleEvents = response.events.console || [];
        } else {
          console.warn('[BugRecorder] CDP recording stop failed:', response.error);
        }
      } catch (error) {
        console.warn('[BugRecorder] Could not stop CDP recording:', error.message);
      } finally {
        this.cdpRecordingActive = false;
      }
    }

    const networkEventsToMerge = this.mergeNetworkEvents(cdpNetworkEvents, fallbackNetworkEvents);
    const networkSource = cdpNetworkEvents.length > 0
      ? (networkEventsToMerge.length > cdpNetworkEvents.length ? 'cdp+content-fetch-xhr' : 'cdp')
      : 'content-fetch-xhr';
    if (networkEventsToMerge.length > 0) {
      this.recordingData.network = [
        ...this.recordingData.network,
        ...networkEventsToMerge
      ];
    }

    const consoleEventsToMerge = this.mergeConsoleEvents(cdpConsoleEvents, fallbackConsoleEvents);
    const consoleSource = cdpConsoleEvents.length > 0
      ? (consoleEventsToMerge.length > cdpConsoleEvents.length ? 'cdp+page-console' : 'cdp')
      : 'page-console';
    if (consoleEventsToMerge.length > 0) {
      this.recordingData.console = [
        ...this.recordingData.console,
        ...consoleEventsToMerge
      ];
    }

    console.log('[BugRecorder] Merged recording events:', {
      network: networkEventsToMerge.length,
      networkSource,
      fallbackNetwork: fallbackNetworkEvents.length,
      console: consoleEventsToMerge.length,
      consoleSource,
      fallbackConsole: fallbackConsoleEvents.length
    });

    // Stop backend log recording and get captured logs
    if (this.includeBackendLogs) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'stopBackendLogRecording' });
        if (response.success && response.logs) {
          // Transform backend logs to timeline event format
          this.recordingData.backendLogs = response.logs.map(log => ({
            timestamp: log.timestamp,
            relativeTime: log.relativeTime || 0,
            type: `backend-${log.level}`,  // backend-log, backend-warn, backend-error
            severity: log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info',
            source: 'backend',
            data: {
              message: log.message,
              level: log.level,
              stack: log.stack
            }
          }));
          console.log('[BugRecorder] Merged backend logs:', response.logs.length);
        } else {
          console.warn('[BugRecorder] Backend log recording stop failed:', response.error);
        }
      } catch (error) {
        console.warn('[BugRecorder] Could not stop backend log recording:', error.message);
      }
    }

    // Add recording end event
    this.addTimelineEvent({
      type: 'recording-end',
      severity: 'info',
      data: {
        method: 'user-stopped',
        totalEvents: this.recordingData.console.length + this.recordingData.network.length + this.recordingData.interactions.length
      }
    });

    // Remove window error handlers
    this.removeWindowErrorHandlers();

    // Remove interaction handlers
    this.removeInteractionHandlers();

    // Capture screenshot NOW - shows the bug state with errors visible
    await this.captureScreenshot();

    // Generate timeline
    const timeline = this.generateTimeline();

    // Analyze key issues
    const keyIssues = this.analyzeKeyIssues(timeline);

    const result = {
      ...this.recordingData,
      timeline,
      keyIssues,
      endTime: new Date().toISOString(),
      duration: Date.now() - this.startTime
    };



    return result;
  },

  /**
   * Capture screenshot using Chrome API
   * Called at END of recording to capture the bug state (with errors visible)
   * Returns screenshot ID for separate storage, not embedded in JSON
   */
  async captureScreenshot() {
    // Hide all Pointa UI elements before screenshot (we want clean page capture)
    const elementsToHide = [];

    try {
      // Find and hide sidebar (sidebar is now inside Shadow DOM, so hide the host)
      const sidebarHost = document.querySelector('#pointa-sidebar-host');
      if (sidebarHost && sidebarHost.style.display !== 'none') {
        elementsToHide.push({ element: sidebarHost, originalDisplay: sidebarHost.style.display });
        sidebarHost.style.display = 'none';
      }

      // Find and hide recording indicator
      const recordingIndicator = document.querySelector('.bug-recording-indicator');
      if (recordingIndicator && recordingIndicator.style.display !== 'none') {
        elementsToHide.push({ element: recordingIndicator, originalDisplay: recordingIndicator.style.display });
        recordingIndicator.style.display = 'none';
      }

      // Find and hide all annotation badges
      const badges = document.querySelectorAll('.pointa-badge-overlay, .pointa-badge');
      badges.forEach((badge) => {
        if (badge.style.display !== 'none') {
          elementsToHide.push({ element: badge, originalDisplay: badge.style.display });
          badge.style.display = 'none';
        }
      });

      // Small delay to ensure DOM updates are rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Request screenshot from background script (it has the right permissions)
      const response = await chrome.runtime.sendMessage({
        action: 'captureScreenshot'
      });

      if (response && response.success) {
        // Generate unique screenshot ID
        const screenshotId = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store screenshot metadata only (not the full base64)
        this.recordingData.screenshot = {
          id: screenshotId,
          captured: true,
          timestamp: new Date().toISOString(),
          // Store the dataUrl temporarily for the background script to save
          _dataUrl: response.dataUrl
        };
      } else {
        this.recordingData.screenshot = {
          captured: false,
          error: response?.error
        };
        console.warn('[BugRecorder] Failed to capture screenshot:', response?.error);
      }
    } catch (error) {
      this.recordingData.screenshot = {
        captured: false,
        error: error.message
      };
      console.error('[BugRecorder] Error capturing screenshot:', error);
    } finally {
      // Restore all hidden elements
      elementsToHide.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
      });
    }
  },

  /**
   * Capture window error events (backup for CDP)
   * These events fire in the content script world for uncaught errors
   * CDP should capture most errors, but this provides a backup
   */
  captureWindowErrors() {
    // Capture unhandled errors
    this.errorHandler = (event) => {
      if (this.isRecording) {
        this.addTimelineEvent({
          type: 'console-error',
          severity: 'error',
          data: {
            message: event.message,
            source: event.filename,
            lineNumber: event.lineno,
            columnNumber: event.colno,
            stack: event.error?.stack,
            level: 'error',
            capturedBy: 'window-error-handler'
          }
        });
      }
    };
    window.addEventListener('error', this.errorHandler);

    // Capture unhandled promise rejections
    this.rejectionHandler = (event) => {
      if (this.isRecording) {
        this.addTimelineEvent({
          type: 'console-error',
          severity: 'error',
          data: {
            message: `Unhandled Promise Rejection: ${event.reason}`,
            level: 'error',
            reason: String(event.reason),
            capturedBy: 'unhandled-rejection-handler'
          }
        });
      }
    };
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  },

  /**
   * Remove window error handlers
   */
  removeWindowErrorHandlers() {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }
  },

  /**
   * Capture user interactions
   */
  captureInteractions() {
    const clickHandler = (event) => {
      if (!this.isRecording) return;

      const target = event.target;
      const tagName = target.tagName.toLowerCase();
      const id = target.id;
      const className = target.className;
      const textContent = target.textContent?.substring(0, 50);

      // Generate selectors for replay
      const selector = this.generateSelector(target);
      const xpath = this.getXPath(target);

      this.addTimelineEvent({
        type: 'user-interaction',
        subtype: 'click',
        severity: 'info',
        data: {
          element: {
            tagName: tagName,
            id: id,
            className: className,
            textContent: textContent,
            selector: selector,
            xpath: xpath
          },
          coordinates: {
            x: event.clientX,
            y: event.clientY
          }
        }
      });
    };

    const inputHandler = (event) => {
      if (!this.isRecording) return;

      const target = event.target;
      const tagName = target.tagName.toLowerCase();
      const type = target.type;
      const id = target.id;
      const className = target.className;

      // Don't capture password values
      let value = '[REDACTED]';
      if (type !== 'password' && type !== 'email') {
        value = target.value?.substring(0, 20) || '';
      }

      // Generate selectors for replay
      const selector = this.generateSelector(target);
      const xpath = this.getXPath(target);

      this.addTimelineEvent({
        type: 'user-interaction',
        subtype: 'input',
        severity: 'info',
        data: {
          element: {
            tagName: tagName,
            type: type,
            id: id,
            className: className,
            selector: selector,
            xpath: xpath
          },
          value: value
        }
      });
    };

    const keypressHandler = (event) => {
      if (!this.isRecording) return;

      // Only capture special keys (Enter, Escape, etc.)
      if (['Enter', 'Escape', 'Tab'].includes(event.key)) {
        this.addTimelineEvent({
          type: 'user-interaction',
          subtype: 'keypress',
          severity: 'info',
          data: {
            key: event.key
          }
        });
      }
    };

    // Add handlers
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('input', inputHandler, true);
    document.addEventListener('keydown', keypressHandler, true);

    // Store handlers for cleanup
    this.interactionHandlers.set('click', clickHandler);
    this.interactionHandlers.set('input', inputHandler);
    this.interactionHandlers.set('keydown', keypressHandler);
  },

  /**
   * Remove interaction handlers
   */
  removeInteractionHandlers() {
    this.interactionHandlers.forEach((handler, eventType) => {
      document.removeEventListener(eventType, handler, true);
    });
    this.interactionHandlers.clear();
  },

  /**
   * Generate CSS selector for element replay
   */
  generateSelector(element) {
    // Try ID first
    if (element.id) return `#${element.id}`;

    // Try unique class combo
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter((c) => c);
      if (classes.length > 0) {
        const selector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        try {
          if (document.querySelectorAll(selector).length === 1) return selector;
        } catch (e) {

          // Invalid selector, continue
        }}
    }

    // Fallback to nth-child path
    let path = [];
    let current = element;
    while (current && current.parentElement) {
      const index = Array.from(current.parentElement.children).indexOf(current) + 1;
      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      current = current.parentElement;
      if (current && current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
      // Stop at body
      if (current && current.tagName.toLowerCase() === 'body') break;
    }
    return path.join(' > ');
  },

  /**
   * Generate XPath for element
   */
  getXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;

    let path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
      // Stop at body
      if (current && current.tagName.toLowerCase() === 'body') break;
    }
    return '/' + path.join('/');
  },

  /**
   * Add an event to the timeline
   */
  addTimelineEvent(event) {
    const timestamp = new Date().toISOString();
    const relativeTime = Date.now() - this.startTime;

    const timelineEvent = {
      timestamp,
      relativeTime,
      ...event
    };

    // Add to appropriate array
    if (event.type.startsWith('console')) {
      this.recordingData.console.push(timelineEvent);
    } else if (event.type === 'network') {
      this.recordingData.network.push(timelineEvent);
    } else if (event.type.startsWith('user-interaction')) {
      this.recordingData.interactions.push(timelineEvent);
    }
  },

  /**
   * Generate unified timeline from all events
   * Applies filtering and optimization to reduce token usage
   */
  generateTimeline() {
    // Filter and optimize console events
    const filteredConsole = this.recordingData.console
      .filter(e => !this.shouldFilterConsoleEvent(e))
      .map(e => this.optimizeConsoleEvent(e));
    
    // Filter network events (remove OPTIONS, health checks, etc.)
    const filteredNetwork = this.recordingData.network
      .filter(e => !this.shouldFilterNetworkEvent(e));
    
    // Backend logs (already clean, just truncate messages)
    const backendLogs = (this.recordingData.backendLogs || []).map(e => ({
      ...e,
      data: e.data ? {
        ...e.data,
        message: this.truncateMessage(e.data.message, 300)
      } : e.data
    }));
    
    // Combine all events
    let allEvents = [
      ...filteredConsole,
      ...filteredNetwork,
      ...this.recordingData.interactions,
      ...backendLogs
    ];

    // Sort by timestamp
    allEvents.sort((a, b) => a.relativeTime - b.relativeTime);
    
    // Deduplicate repeated consecutive events
    allEvents = this.dedupeEvents(allEvents);

    // Generate summary (based on filtered events)
    const summary = {
      totalEvents: allEvents.length,
      userInteractions: this.recordingData.interactions.length,
      networkRequests: filteredNetwork.length,
      networkFailures: filteredNetwork.filter((e) => e.subtype === 'failed').length,
      consoleErrors: filteredConsole.filter((e) => e.type === 'console-error').length,
      backendLogs: backendLogs.length,
      backendErrors: backendLogs.filter((e) => e.type === 'backend-error').length,
      consoleWarnings: filteredConsole.filter((e) => e.type === 'console-warning').length,
      consoleLogs: filteredConsole.filter((e) => e.type === 'console-log').length
    };

    return {
      events: allEvents,
      summary
    };
  },

  /**
   * Analyze timeline to identify key issues and root causes
   */
  analyzeKeyIssues(timeline) {
    const keyIssues = [];
    const events = timeline.events;

    // Find console errors (exclude errors from chrome extensions - these are not user's app errors)
    const consoleErrors = events.filter((e) => {
      if (e.type !== 'console-error') return false;
      // Skip errors from chrome extensions (including Pointa itself)
      const source = e.data.source || '';
      if (source.startsWith('chrome-extension://')) return false;
      return true;
    });
    consoleErrors.forEach((error) => {
      keyIssues.push({
        type: 'console-error',
        description: error.data.message,
        timestamp: error.timestamp,
        relativeTime: error.relativeTime,
        severity: 'error',
        source: error.data.source,
        lineNumber: error.data.lineNumber
      });
    });

    // Find network failures
    const networkFailures = events.filter((e) => e.type === 'network' && e.subtype === 'failed');
    networkFailures.forEach((failure) => {
      const statusOrError = failure.data.status
        ? `status ${failure.data.status}`
        : failure.data.error || 'unknown reason';

      keyIssues.push({
        type: 'network-failure',
        description: `${failure.data.method} ${failure.data.url} failed with ${statusOrError}`,
        timestamp: failure.timestamp,
        relativeTime: failure.relativeTime,
        severity: 'error',
        url: failure.data.url,
        status: failure.data.status,
        error: failure.data.error,
        responseBody: failure.data.responseBody
      });
    });

    // Find backend errors
    const backendErrors = events.filter((e) => e.type === 'backend-error');
    backendErrors.forEach((error) => {
      keyIssues.push({
        type: 'backend-error',
        description: error.data.message,
        timestamp: error.timestamp,
        relativeTime: error.relativeTime,
        severity: 'error',
        source: 'backend',
        stack: error.data.stack
      });
    });

    // Try to detect root cause (simplified heuristic)
    if (keyIssues.length > 0) {
      // Sort by time
      keyIssues.sort((a, b) => a.relativeTime - b.relativeTime);

      // First error is likely the root cause
      const rootCause = keyIssues[0];
      rootCause.isRootCause = true;
    }

    return keyIssues;
  },

  /**
   * Format relative time for display (e.g., "00:02" for 2 seconds)
   */
  formatRelativeTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
};

// Make available globally
window.BugRecorder = BugRecorder;
