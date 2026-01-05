/**
 * video-recording-ui.js
 *
 * Recording overlay UI for video recording feature.
 * Shows timer display, pause/resume/stop buttons, and recording indicator.
 */

const VideoRecordingUI = {
  overlay: null,
  timerInterval: null,
  warningHandler: null,
  maxDurationHandler: null,

  /**
   * Show recording overlay
   */
  show() {
    if (this.overlay) {
      this.hide();
    }

    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'video-recording-overlay';
    this.overlay.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    this.overlay.innerHTML = `
      <div class="video-recording-indicator">
        <div class="video-recording-pulse"></div>
        <div class="video-recording-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>
      </div>
      <div class="video-recording-timer">
        <span id="video-timer-display">00:00</span>
        <span class="video-timer-max">/ 5:00</span>
      </div>
      <div class="video-recording-controls">
        <button id="video-pause-btn" class="video-control-btn" title="Pause recording">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        </button>
        <button id="video-stop-btn" class="video-control-btn video-stop" title="Stop recording">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
          <span>Stop</span>
        </button>
      </div>
      <div id="video-warning" class="video-recording-warning" style="display: none;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>30 seconds remaining</span>
      </div>
    `;

    // Inject styles if not present
    this.injectStyles();

    document.body.appendChild(this.overlay);

    // Start timer
    this.startTimer();

    // Set up event handlers
    this.setupEventHandlers();

    // Listen for warning event
    this.warningHandler = () => {
      const warning = this.overlay?.querySelector('#video-warning');
      if (warning) {
        warning.style.display = 'flex';
      }
    };
    window.addEventListener('videoRecordingWarning', this.warningHandler);

    // Listen for max duration event
    this.maxDurationHandler = async () => {
      await window.pointa?.stopVideoRecording();
    };
    window.addEventListener('videoRecordingMaxDuration', this.maxDurationHandler);
  },

  /**
   * Hide recording overlay
   */
  hide() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.warningHandler) {
      window.removeEventListener('videoRecordingWarning', this.warningHandler);
      this.warningHandler = null;
    }

    if (this.maxDurationHandler) {
      window.removeEventListener('videoRecordingMaxDuration', this.maxDurationHandler);
      this.maxDurationHandler = null;
    }

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  },

  /**
   * Start the timer display
   */
  startTimer() {
    const timerDisplay = this.overlay?.querySelector('#video-timer-display');
    if (!timerDisplay) return;

    this.timerInterval = setInterval(() => {
      if (!window.VideoRecorder?.isRecording) {
        return;
      }

      const elapsed = window.VideoRecorder.getRelativeTime();
      timerDisplay.textContent = window.VideoRecorder.formatDuration(elapsed);

      // Update warning countdown
      if (elapsed >= 4.5 * 60 * 1000) {
        const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);
        const seconds = Math.ceil(remaining / 1000);
        const warningSpan = this.overlay?.querySelector('#video-warning span');
        if (warningSpan && seconds > 0) {
          warningSpan.textContent = `${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
        }
      }
    }, 100);
  },

  /**
   * Set up event handlers for buttons
   */
  setupEventHandlers() {
    const pauseBtn = this.overlay?.querySelector('#video-pause-btn');
    const stopBtn = this.overlay?.querySelector('#video-stop-btn');

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (window.VideoRecorder?.isPaused) {
          window.VideoRecorder.resumeRecording();
          this.updatePauseButton(false);
        } else {
          window.VideoRecorder?.pauseRecording();
          this.updatePauseButton(true);
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        await window.pointa?.stopVideoRecording();
      });
    }
  },

  /**
   * Update pause button state
   * @param {boolean} isPaused - Whether recording is paused
   */
  updatePauseButton(isPaused) {
    const pauseBtn = this.overlay?.querySelector('#video-pause-btn');
    if (!pauseBtn) return;

    if (isPaused) {
      pauseBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21"/>
        </svg>
      `;
      pauseBtn.title = 'Resume recording';
      pauseBtn.classList.add('paused');

      // Update indicator
      const indicator = this.overlay?.querySelector('.video-recording-indicator');
      if (indicator) {
        indicator.classList.add('paused');
      }
    } else {
      pauseBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      pauseBtn.title = 'Pause recording';
      pauseBtn.classList.remove('paused');

      // Update indicator
      const indicator = this.overlay?.querySelector('.video-recording-indicator');
      if (indicator) {
        indicator.classList.remove('paused');
      }
    }
  },

  /**
   * Inject CSS styles for the overlay
   */
  injectStyles() {
    if (document.getElementById('video-recording-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'video-recording-ui-styles';
    style.textContent = `
      .video-recording-overlay {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        backdrop-filter: blur(10px);
      }

      .video-recording-indicator {
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .video-recording-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.3);
        animation: video-pulse 1.5s ease-in-out infinite;
      }

      .video-recording-indicator.paused .video-recording-pulse {
        animation: none;
        background: rgba(251, 191, 36, 0.3);
      }

      .video-recording-icon {
        position: relative;
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .video-recording-indicator.paused .video-recording-icon {
        color: #fbbf24;
      }

      @keyframes video-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.3);
          opacity: 0.5;
        }
      }

      .video-recording-timer {
        font-size: 18px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        display: flex;
        align-items: baseline;
        gap: 4px;
      }

      #video-timer-display {
        color: #fff;
      }

      .video-timer-max {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 400;
      }

      .video-recording-controls {
        display: flex;
        gap: 8px;
        margin-left: 8px;
        padding-left: 12px;
        border-left: 1px solid rgba(255, 255, 255, 0.2);
      }

      .video-control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .video-control-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .video-control-btn.video-stop {
        background: #ef4444;
      }

      .video-control-btn.video-stop:hover {
        background: #dc2626;
      }

      .video-control-btn.paused {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .video-control-btn.paused:hover {
        background: rgba(34, 197, 94, 0.3);
      }

      .video-recording-warning {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(251, 191, 36, 0.2);
        border-radius: 6px;
        font-size: 12px;
        color: #fbbf24;
        margin-left: 8px;
        animation: video-warning-pulse 1s ease-in-out infinite;
      }

      @keyframes video-warning-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      /* Responsive adjustments */
      @media (max-width: 600px) {
        .video-recording-overlay {
          flex-wrap: wrap;
          justify-content: center;
          bottom: 10px;
          left: 10px;
          right: 10px;
          transform: none;
        }

        .video-recording-controls {
          border-left: none;
          padding-left: 0;
          margin-left: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }
};

// Make available globally
window.VideoRecordingUI = VideoRecordingUI;
