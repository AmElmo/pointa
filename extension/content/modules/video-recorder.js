/**
 * video-recorder.js
 *
 * Core logic for video recording with tab capture and click tracking.
 * Records screen + microphone using chrome.tabCapture API via background script.
 * Tracks clicks with visual pulse feedback and page URL changes.
 */

const VideoRecorder = {
  isRecording: false,
  isPaused: false,
  recordingData: null,
  startTime: null,
  pausedTime: 0, // Total time spent paused
  pauseStartTime: null, // When current pause started
  mediaRecorder: null,
  recordedChunks: [],
  stream: null,
  maxDuration: 5 * 60 * 1000, // 5 minutes in ms
  warningTime: 4.5 * 60 * 1000, // 4:30 warning
  warningShown: false,
  timerInterval: null,
  clickHandler: null,
  urlChangeInterval: null,
  lastUrl: null,
  beforeUnloadHandler: null,

  /**
   * Start video recording
   * @returns {Promise<boolean>} Success status
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('[VideoRecorder] Already recording');
      return false;
    }

    try {
      // Use getDisplayMedia to capture the screen/tab/window
      // This prompts the user to select what to share
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 30 }
        },
        audio: true // Include system/tab audio if available
      });

      if (!this.stream) {
        console.error('[VideoRecorder] No stream received from getDisplayMedia');
        return false;
      }

      console.log('[VideoRecorder] Got display media stream');

      this.isRecording = true;
      this.isPaused = false;
      this.startTime = Date.now();
      this.pausedTime = 0;
      this.pauseStartTime = null;
      this.warningShown = false;
      this.recordedChunks = [];
      this.lastUrl = window.location.href;

      // Initialize recording data
      this.recordingData = {
        id: `VIDEO-${Date.now()}`,
        startTime: new Date().toISOString(),
        clicks: [],
        pageChanges: [{
          timestamp: 0,
          url: window.location.href,
          type: 'initial'
        }],
        metadata: {
          browser: this.simplifyUserAgent(navigator.userAgent),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          startUrl: window.location.href
        }
      };

      // Set up MediaRecorder
      if (this.stream) {
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm;codecs=vp8,opus';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }

        this.mediaRecorder = new MediaRecorder(this.stream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          console.log('[VideoRecorder] MediaRecorder stopped');
        };

        this.mediaRecorder.start(1000); // Capture in 1-second chunks
      }

      // Set up click tracking
      this.setupClickTracking();

      // Set up URL change tracking
      this.setupUrlTracking();

      // Set up max duration timer
      this.setupDurationTimer();

      // Set up beforeunload warning to prevent accidental data loss
      this.setupBeforeUnloadWarning();

      console.log('[VideoRecorder] Recording started');
      return true;

    } catch (error) {
      console.error('[VideoRecorder] Error starting recording:', error);
      this.cleanup();
      return false;
    }
  },

  /**
   * Pause recording
   */
  pauseRecording() {
    if (!this.isRecording || this.isPaused) return;

    this.isPaused = true;
    this.pauseStartTime = Date.now();

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }

    console.log('[VideoRecorder] Recording paused');
  },

  /**
   * Resume recording
   */
  resumeRecording() {
    if (!this.isRecording || !this.isPaused) return;

    // Add pause duration to total paused time
    if (this.pauseStartTime) {
      this.pausedTime += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
    }

    this.isPaused = false;

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }

    console.log('[VideoRecorder] Recording resumed');
  },

  /**
   * Stop recording and return data
   * @returns {Promise<Object>} Recording data with video blob
   */
  async stopRecording() {
    if (!this.isRecording) {
      console.warn('[VideoRecorder] Not currently recording');
      return null;
    }

    this.isRecording = false;

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Wait for final data
    await new Promise(resolve => setTimeout(resolve, 500));

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    // Notify background script
    try {
      await chrome.runtime.sendMessage({ action: 'stopVideoCapture' });
    } catch (error) {
      console.warn('[VideoRecorder] Error notifying background:', error);
    }

    // Calculate actual recording duration (excluding paused time)
    const endTime = Date.now();
    let totalPausedTime = this.pausedTime;
    if (this.pauseStartTime) {
      totalPausedTime += endTime - this.pauseStartTime;
    }
    const duration = endTime - this.startTime - totalPausedTime;

    // Create video blob
    const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });

    // Build final result
    const result = {
      ...this.recordingData,
      endTime: new Date().toISOString(),
      duration: duration,
      durationFormatted: this.formatDuration(duration),
      videoBlob: videoBlob,
      videoSize: videoBlob.size
    };

    // Clean up
    this.cleanup();

    console.log('[VideoRecorder] Recording stopped, duration:', result.durationFormatted);
    return result;
  },

  /**
   * Set up click tracking with visual pulse feedback
   */
  setupClickTracking() {
    this.clickHandler = (event) => {
      if (!this.isRecording || this.isPaused) return;

      const target = event.target;
      const relativeTime = this.getRelativeTime();

      // Get element info
      const elementInfo = {
        tagName: target.tagName?.toLowerCase() || 'unknown',
        id: target.id || null,
        className: typeof target.className === 'string' ? target.className : null,
        textContent: target.textContent?.substring(0, 50) || null,
        selector: this.generateSelector(target)
      };

      // Record click
      this.recordingData.clicks.push({
        timestamp: relativeTime,
        timestampFormatted: this.formatDuration(relativeTime),
        coordinates: {
          x: event.clientX,
          y: event.clientY
        },
        element: elementInfo
      });

      // Show visual pulse feedback
      this.showClickPulse(event.clientX, event.clientY);

      console.log('[VideoRecorder] Click captured at', this.formatDuration(relativeTime));
    };

    document.addEventListener('click', this.clickHandler, true);
  },

  /**
   * Show visual pulse animation at click location
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  showClickPulse(x, y) {
    const pulse = document.createElement('div');
    pulse.className = 'video-recording-click-pulse';
    pulse.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 40px;
      height: 40px;
      margin-left: -20px;
      margin-top: -20px;
      border-radius: 50%;
      background: rgba(12, 140, 233, 0.3);
      border: 2px solid rgba(12, 140, 233, 0.8);
      pointer-events: none;
      z-index: 2147483647;
      animation: video-click-pulse 0.6s ease-out forwards;
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('video-click-pulse-styles')) {
      const style = document.createElement('style');
      style.id = 'video-click-pulse-styles';
      style.textContent = `
        @keyframes video-click-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(pulse);

    // Remove after animation
    setTimeout(() => {
      if (pulse.parentNode) {
        pulse.remove();
      }
    }, 600);
  },

  /**
   * Set up URL change tracking
   */
  setupUrlTracking() {
    this.urlChangeInterval = setInterval(() => {
      if (!this.isRecording || this.isPaused) return;

      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        const relativeTime = this.getRelativeTime();
        this.recordingData.pageChanges.push({
          timestamp: relativeTime,
          timestampFormatted: this.formatDuration(relativeTime),
          url: currentUrl,
          previousUrl: this.lastUrl,
          type: 'navigation'
        });
        this.lastUrl = currentUrl;
        console.log('[VideoRecorder] Page change detected:', currentUrl);
      }
    }, 100); // Check every 100ms
  },

  /**
   * Set up duration timer for max recording limit
   */
  setupDurationTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isRecording) return;
      if (this.isPaused) return; // Don't count paused time

      const elapsed = this.getRelativeTime();

      // Show warning at 4:30
      if (!this.warningShown && elapsed >= this.warningTime) {
        this.warningShown = true;
        this.showWarning();
      }

      // Auto-stop at 5 minutes
      if (elapsed >= this.maxDuration) {
        console.log('[VideoRecorder] Max duration reached, auto-stopping');
        window.dispatchEvent(new CustomEvent('videoRecordingMaxDuration'));
      }
    }, 1000);
  },

  /**
   * Show warning that recording is about to end
   */
  showWarning() {
    // Dispatch event for UI to handle
    window.dispatchEvent(new CustomEvent('videoRecordingWarning', {
      detail: { remainingSeconds: 30 }
    }));
  },

  /**
   * Set up beforeunload warning to prevent accidental data loss on page reload/navigation
   */
  setupBeforeUnloadWarning() {
    this.beforeUnloadHandler = (event) => {
      if (this.isRecording) {
        // Standard way to show browser's native "Leave site?" dialog
        event.preventDefault();
        // For older browsers
        event.returnValue = 'You have an active video recording. If you leave, your recording will be lost.';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  },

  /**
   * Get relative time from start (accounting for pauses)
   * @returns {number} Milliseconds since start (excluding paused time)
   */
  getRelativeTime() {
    if (!this.startTime) return 0;

    let pausedTime = this.pausedTime;
    if (this.pauseStartTime) {
      pausedTime += Date.now() - this.pauseStartTime;
    }

    return Date.now() - this.startTime - pausedTime;
  },

  /**
   * Generate CSS selector for element
   * @param {Element} element - DOM element
   * @returns {string} CSS selector
   */
  generateSelector(element) {
    if (!element || !element.tagName) return 'unknown';

    // Try ID first
    if (element.id) return `#${element.id}`;

    // Try unique class combo
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        const selector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        try {
          if (document.querySelectorAll(selector).length === 1) return selector;
        } catch (e) {
          // Invalid selector, continue
        }
      }
    }

    // Fallback to tag name with nth-child
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
      if (current && current.tagName.toLowerCase() === 'body') break;
    }
    return path.join(' > ');
  },

  /**
   * Format duration in milliseconds to MM:SS
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  /**
   * Simplify user agent string
   * @param {string} ua - User agent string
   * @returns {string} Simplified browser/OS info
   */
  simplifyUserAgent(ua) {
    if (!ua) return 'Unknown';

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
    }

    let os = 'Unknown';
    if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} / ${os}`;
  },

  /**
   * Clean up all resources
   */
  cleanup() {
    // Remove click handler
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }

    // Remove beforeunload handler
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    // Clear intervals
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.urlChangeInterval) {
      clearInterval(this.urlChangeInterval);
      this.urlChangeInterval = null;
    }

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Reset state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingData = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.pauseStartTime = null;
    this.warningShown = false;
    this.lastUrl = null;
  }
};

// Make available globally
window.VideoRecorder = VideoRecorder;
