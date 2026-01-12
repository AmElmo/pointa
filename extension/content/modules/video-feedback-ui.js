/**
 * video-feedback-ui.js
 *
 * Review modal UI for video recordings.
 * Shows video playback, AI processing status, feedback points timeline,
 * category editing, and save functionality.
 */

const VideoFeedbackUI = {
  currentModal: null,
  videoUrl: null,
  recordingData: null,
  feedbackPoints: [],
  transcript: null,
  processingStatus: 'idle',
  eventSource: null,

  /**
   * Show the video review modal
   * @param {Object} recordingData - Recording data from VideoRecorder
   */
  show(recordingData) {
    if (!recordingData) {
      console.error('[VideoFeedbackUI] No recording data provided');
      return;
    }

    // Close any existing modal
    this.hide();

    // Store recording data
    this.recordingData = recordingData;
    this.feedbackPoints = [];
    this.transcript = null;
    this.processingStatus = 'idle';

    // Create video URL from blob
    if (recordingData.videoBlob) {
      this.videoUrl = URL.createObjectURL(recordingData.videoBlob);
    }

    // Register modal with central manager
    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('video-feedback');
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal video-feedback-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    const videoSize = recordingData.videoSize ? this.formatFileSize(recordingData.videoSize) : 'Unknown';

    modal.innerHTML = `
      <div class="pointa-comment-modal-content video-feedback-modal-content">
        <div class="pointa-comment-modal-header">
          <h3 class="pointa-comment-modal-title">
            <span style="font-size: 20px;">🎬</span>
            Video Recording Review
          </h3>
          <button class="pointa-comment-modal-close" id="video-feedback-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="video-feedback-body">
          <!-- Video player section -->
          <div class="video-feedback-player-section">
            ${this.videoUrl ? `
              <video id="video-feedback-player" controls class="video-feedback-player">
                <source src="${this.videoUrl}" type="video/webm">
                Your browser does not support the video tag.
              </video>
            ` : `
              <div class="video-feedback-no-video">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
                <p>Video not available</p>
              </div>
            `}

            <!-- Timeline with markers -->
            <div class="video-timeline" id="video-timeline">
              <div class="video-timeline-track"></div>
              <div class="video-timeline-markers" id="timeline-markers"></div>
            </div>

            <div class="video-feedback-meta">
              <span class="video-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${recordingData.durationFormatted || '00:00'}
              </span>
              <span class="video-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ${videoSize}
              </span>
              <span class="video-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                ${recordingData.metadata?.viewport?.width || 0}×${recordingData.metadata?.viewport?.height || 0}
              </span>
            </div>
          </div>

          <!-- Processing Status -->
          <div class="video-processing-status" id="processing-status">
            <div class="processing-spinner"></div>
            <span class="processing-message">Waiting to process...</span>
            <div class="processing-progress-bar">
              <div class="processing-progress-fill" style="width: 0%"></div>
            </div>
          </div>

          <!-- Transcript Section -->
          <div class="video-transcript-section" id="transcript-section" style="display: none;">
            <h4 class="section-title">
              <span>📝</span> Transcript
            </h4>
            <div class="video-transcript-content" id="transcript-content"></div>
          </div>

          <!-- Feedback Points Section -->
          <div class="video-feedback-points-section" id="feedback-points-section" style="display: none;">
            <h4 class="section-title">
              <span>📋</span> Feedback Points
              <span class="feedback-count" id="feedback-count">0</span>
            </h4>
            <div class="video-feedback-points-list" id="feedback-points-list"></div>
          </div>
        </div>

        <div class="video-feedback-actions">
          <button class="pointa-btn pointa-btn-secondary" id="video-feedback-dismiss">
            Dismiss
          </button>
          <button class="pointa-btn pointa-btn-primary" id="video-feedback-save" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save All
          </button>
        </div>
      </div>
    `;

    // Inject styles
    this.injectStyles();

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Set up event listeners
    this.setupEventListeners(recordingData);

    // Start processing automatically
    this.startProcessing();
  },

  /**
   * Hide the modal
   */
  hide() {
    if (window.PointaModalManager) {
      window.PointaModalManager.unregisterModal('video-feedback');
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }

    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }

    this.feedbackPoints = [];
    this.transcript = null;
    this.recordingData = null;
  },

  /**
   * Start video processing via SSE
   */
  async startProcessing() {
    if (!this.recordingData?.videoBlob) {
      this.updateProcessingStatus('error', 'No video to process');
      return;
    }

    this.updateProcessingStatus('starting', 'Starting processing...');

    try {
      // Create FormData with video and recording data
      const formData = new FormData();
      formData.append('video', this.recordingData.videoBlob, 'recording.webm');
      formData.append('recordingData', JSON.stringify({
        clicks: this.recordingData.clicks || [],
        pageChanges: this.recordingData.pageChanges || [],
        duration: this.recordingData.duration,
        metadata: this.recordingData.metadata
      }));

      // Use fetch with streaming for SSE-like processing
      const response = await fetch('http://localhost:4242/api/video/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              this.handleProcessingUpdate(data);
            } catch (e) {
              console.warn('[VideoFeedbackUI] Failed to parse SSE data:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('[VideoFeedbackUI] Processing error:', error);
      this.updateProcessingStatus('error', `Processing failed: ${error.message}`);
    }
  },

  /**
   * Handle processing update from SSE
   * @param {Object} data - Update data
   */
  handleProcessingUpdate(data) {
    this.updateProcessingStatus(data.status, data.message, data.progress);

    if (data.transcript) {
      this.transcript = data.transcript;
      this.showTranscript(data.transcript);
    }

    if (data.feedbackPoints) {
      this.feedbackPoints = data.feedbackPoints;
      this.renderFeedbackPoints();
      this.renderTimelineMarkers();
      this.enableSaveButton();
    }

    if (data.status === 'complete') {
      this.hideProcessingStatus();
    }

    if (data.status === 'error') {
      this.updateProcessingStatus('error', data.message);
    }
  },

  /**
   * Update processing status display
   * @param {string} status - Status type
   * @param {string} message - Status message
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProcessingStatus(status, message, progress = 0) {
    const statusEl = this.currentModal?.querySelector('#processing-status');
    if (!statusEl) return;

    statusEl.style.display = 'flex';
    const messageEl = statusEl.querySelector('.processing-message');
    const progressEl = statusEl.querySelector('.processing-progress-fill');
    const spinnerEl = statusEl.querySelector('.processing-spinner');

    if (messageEl) messageEl.textContent = message;
    if (progressEl) progressEl.style.width = `${progress}%`;

    if (status === 'error') {
      statusEl.classList.add('error');
      if (spinnerEl) spinnerEl.style.display = 'none';
    } else if (status === 'complete') {
      statusEl.classList.add('complete');
      if (spinnerEl) spinnerEl.style.display = 'none';
    } else {
      statusEl.classList.remove('error', 'complete');
      if (spinnerEl) spinnerEl.style.display = 'block';
    }

    this.processingStatus = status;
  },

  /**
   * Hide processing status
   */
  hideProcessingStatus() {
    const statusEl = this.currentModal?.querySelector('#processing-status');
    if (statusEl) {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 1000);
    }
  },

  /**
   * Show transcript section
   * @param {string} transcript - Transcript text
   */
  showTranscript(transcript) {
    const section = this.currentModal?.querySelector('#transcript-section');
    const content = this.currentModal?.querySelector('#transcript-content');

    if (section && content) {
      section.style.display = 'block';
      content.textContent = transcript;
    }
  },

  /**
   * Render feedback points list
   */
  renderFeedbackPoints() {
    const section = this.currentModal?.querySelector('#feedback-points-section');
    const list = this.currentModal?.querySelector('#feedback-points-list');
    const countEl = this.currentModal?.querySelector('#feedback-count');

    if (!section || !list) return;

    section.style.display = 'block';
    if (countEl) countEl.textContent = this.feedbackPoints.length;

    // Group by page URL
    const grouped = this.groupByPageUrl(this.feedbackPoints);

    list.innerHTML = Object.entries(grouped).map(([url, points]) => `
      <div class="feedback-page-group">
        <div class="feedback-page-header">
          <span class="page-icon">📄</span>
          <span class="page-url">${this.truncateUrl(url)}</span>
          <span class="page-count">${points.length} items</span>
        </div>
        <div class="feedback-page-items">
          ${points.map((point, idx) => this.renderFeedbackPoint(point, idx)).join('')}
        </div>
      </div>
    `).join('');

    // Set up feedback point event handlers
    this.setupFeedbackPointHandlers();
  },

  /**
   * Render a single feedback point
   * @param {Object} point - Feedback point data
   * @param {number} index - Point index
   * @returns {string} HTML string
   */
  renderFeedbackPoint(point, index) {
    const typeLabels = {
      'annotation': { label: 'Annotation', icon: '💬', color: '#0c8ce9' },
      'bug_report': { label: 'Bug', icon: '🐛', color: '#ef4444' },
      'performance_report': { label: 'Performance', icon: '⚡', color: '#f59e0b' }
    };

    const typeInfo = typeLabels[point.type] || typeLabels['annotation'];
    const startTime = this.formatTime(point.time_range?.start || 0);
    const endTime = this.formatTime(point.time_range?.end || 0);

    return `
      <div class="feedback-point" data-point-id="${point.id}" data-start="${point.time_range?.start || 0}">
        <div class="feedback-point-header">
          <div class="feedback-point-time" title="Click to seek">
            ${startTime} - ${endTime}
          </div>
          <div class="feedback-point-category">
            <select class="category-select" data-point-id="${point.id}">
              <option value="annotation" ${point.type === 'annotation' ? 'selected' : ''}>💬 Annotation</option>
              <option value="bug_report" ${point.type === 'bug_report' ? 'selected' : ''}>🐛 Bug</option>
              <option value="performance_report" ${point.type === 'performance_report' ? 'selected' : ''}>⚡ Performance</option>
            </select>
          </div>
          <button class="feedback-point-delete" data-point-id="${point.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="feedback-point-transcript">${this.escapeHtml(point.transcript || '')}</div>
        ${point.element_context ? `
          <div class="feedback-point-element" title="${this.escapeHtml(point.element_context.selector || '')}">
            ${point.element_context.tagName || 'element'}
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Render timeline markers for feedback points
   */
  renderTimelineMarkers() {
    const markersEl = this.currentModal?.querySelector('#timeline-markers');
    const videoEl = this.currentModal?.querySelector('#video-feedback-player');

    if (!markersEl || !videoEl) return;

    const duration = this.recordingData?.duration || (videoEl.duration * 1000) || 1;

    markersEl.innerHTML = this.feedbackPoints.map(point => {
      const startMs = point.time_range?.start || 0;
      const position = (startMs / duration) * 100;
      const typeColors = {
        'annotation': '#0c8ce9',
        'bug_report': '#ef4444',
        'performance_report': '#f59e0b'
      };
      const color = typeColors[point.type] || '#0c8ce9';

      return `
        <div class="timeline-marker"
             data-point-id="${point.id}"
             data-start="${startMs}"
             style="left: ${position}%; background-color: ${color};"
             title="${this.formatTime(startMs)} - ${point.type}">
        </div>
      `;
    }).join('');

    // Add marker click handlers
    markersEl.querySelectorAll('.timeline-marker').forEach(marker => {
      marker.addEventListener('click', () => {
        const startMs = parseInt(marker.dataset.start, 10);
        if (videoEl && !isNaN(startMs)) {
          videoEl.currentTime = startMs / 1000;
          videoEl.play();
        }
      });
    });
  },

  /**
   * Set up event handlers for feedback points
   */
  setupFeedbackPointHandlers() {
    const modal = this.currentModal;
    if (!modal) return;

    // Time click to seek
    modal.querySelectorAll('.feedback-point-time').forEach(el => {
      el.addEventListener('click', () => {
        const point = el.closest('.feedback-point');
        const startMs = parseInt(point?.dataset.start, 10);
        const videoEl = modal.querySelector('#video-feedback-player');
        if (videoEl && !isNaN(startMs)) {
          videoEl.currentTime = startMs / 1000;
          videoEl.play();
        }
      });
    });

    // Category change
    modal.querySelectorAll('.category-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const pointId = e.target.dataset.pointId;
        const newType = e.target.value;
        this.updatePointCategory(pointId, newType);
      });
    });

    // Delete button
    modal.querySelectorAll('.feedback-point-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pointId = e.target.closest('button').dataset.pointId;
        this.deletePoint(pointId);
      });
    });
  },

  /**
   * Update a feedback point's category
   * @param {string} pointId - Point ID
   * @param {string} newType - New category type
   */
  updatePointCategory(pointId, newType) {
    const point = this.feedbackPoints.find(p => p.id === pointId);
    if (point) {
      point.type = newType;
      this.renderTimelineMarkers(); // Update marker colors
    }
  },

  /**
   * Delete a feedback point
   * @param {string} pointId - Point ID
   */
  deletePoint(pointId) {
    this.feedbackPoints = this.feedbackPoints.filter(p => p.id !== pointId);
    this.renderFeedbackPoints();
    this.renderTimelineMarkers();

    // Update save button state
    if (this.feedbackPoints.length === 0) {
      const saveBtn = this.currentModal?.querySelector('#video-feedback-save');
      if (saveBtn) saveBtn.disabled = true;
    }
  },

  /**
   * Enable the save button
   */
  enableSaveButton() {
    const saveBtn = this.currentModal?.querySelector('#video-feedback-save');
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  },

  /**
   * Save all feedback points as individual items
   */
  async saveAll() {
    if (this.feedbackPoints.length === 0) return;

    const saveBtn = this.currentModal?.querySelector('#video-feedback-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="processing-spinner small"></span> Saving...';
    }

    try {
      for (const point of this.feedbackPoints) {
        await this.saveFeedbackPoint(point);
      }

      // Show success
      if (saveBtn) {
        saveBtn.innerHTML = '✓ Saved!';
      }

      // Close modal after brief delay
      setTimeout(() => {
        this.hide();
      }, 1500);

    } catch (error) {
      console.error('[VideoFeedbackUI] Save error:', error);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Failed - Retry';
      }
    }
  },

  /**
   * Save a single feedback point as an annotation/bug/perf report
   * @param {Object} point - Feedback point
   */
  async saveFeedbackPoint(point) {
    const baseUrl = 'http://localhost:4242';

    if (point.type === 'annotation') {
      // Save as annotation
      const annotation = {
        id: `pointa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: point.page_url,
        status: 'pending',
        messages: [{
          id: `msg_${Date.now()}`,
          type: 'user',
          content: point.transcript,
          created_at: new Date().toISOString()
        }],
        element_context: point.element_context,
        source: 'video',
        video_time_range: point.time_range,
        created_at: new Date().toISOString()
      };

      await fetch(`${baseUrl}/api/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation)
      });

    } else if (point.type === 'bug_report') {
      // Save as bug report
      const bugReport = {
        id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'bug-report',
        status: 'active',
        report: point.transcript,
        context: {
          page: {
            url: point.page_url
          }
        },
        element_context: point.element_context,
        source: 'video',
        video_time_range: point.time_range,
        created: new Date().toISOString()
      };

      await fetch(`${baseUrl}/api/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bugReport)
      });

    } else if (point.type === 'performance_report') {
      // Save as performance report
      const perfReport = {
        id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'performance-investigation',
        status: 'active',
        report: point.transcript,
        context: {
          page: {
            url: point.page_url
          }
        },
        element_context: point.element_context,
        source: 'video',
        video_time_range: point.time_range,
        created: new Date().toISOString()
      };

      await fetch(`${baseUrl}/api/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfReport)
      });
    }
  },

  /**
   * Group feedback points by page URL
   * @param {Array} points - Feedback points
   * @returns {Object} Grouped points
   */
  groupByPageUrl(points) {
    const grouped = {};
    for (const point of points) {
      const url = point.page_url || 'Unknown Page';
      if (!grouped[url]) grouped[url] = [];
      grouped[url].push(point);
    }
    return grouped;
  },

  /**
   * Set up event listeners
   * @param {Object} recordingData - Recording data
   */
  setupEventListeners(recordingData) {
    const modal = this.currentModal;
    if (!modal) return;

    // Close button
    const closeBtn = modal.querySelector('#video-feedback-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Dismiss button
    const dismissBtn = modal.querySelector('#video-feedback-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.hide());
    }

    // Save button
    const saveBtn = modal.querySelector('#video-feedback-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAll());
    }

    // ESC to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });
  },

  /**
   * Format time in milliseconds to MM:SS
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time
   */
  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * Truncate URL for display
   * @param {string} url - URL to truncate
   * @returns {string} Truncated URL
   */
  truncateUrl(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      if (path.length > 40) {
        return parsed.host + path.substring(0, 37) + '...';
      }
      return parsed.host + path;
    } catch {
      return url.substring(0, 50);
    }
  },

  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('video-feedback-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'video-feedback-ui-styles';
    style.textContent = `
      .video-feedback-modal .pointa-comment-modal-content {
        max-width: 800px;
        width: 95vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }

      .video-feedback-body {
        flex: 1;
        overflow-y: auto;
        padding: 0 20px;
      }

      .video-feedback-player-section {
        margin-bottom: 16px;
      }

      .video-feedback-player {
        width: 100%;
        border-radius: 8px;
        background: #000;
        max-height: 300px;
      }

      .video-feedback-no-video {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        background: var(--theme-surface, #f5f5f5);
        border-radius: 8px;
        color: var(--theme-text-secondary, #666);
      }

      /* Timeline */
      .video-timeline {
        position: relative;
        height: 24px;
        margin: 12px 0;
        cursor: pointer;
      }

      .video-timeline-track {
        position: absolute;
        top: 10px;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--theme-outline, #e0e0e0);
        border-radius: 2px;
      }

      .video-timeline-markers {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100%;
      }

      .timeline-marker {
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        transform: translate(-50%, 50%);
        cursor: pointer;
        transition: transform 0.2s ease;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .timeline-marker:hover {
        transform: translate(-50%, 50%) scale(1.3);
      }

      .video-feedback-meta {
        display: flex;
        gap: 16px;
        margin-top: 12px;
        flex-wrap: wrap;
      }

      .video-meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--theme-text-secondary, #666);
      }

      /* Processing Status */
      .video-processing-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        background: var(--theme-surface, #f5f5f5);
        border-radius: 12px;
        margin-bottom: 16px;
      }

      .video-processing-status.error {
        background: #fef2f2;
      }

      .video-processing-status.error .processing-message {
        color: #dc2626;
      }

      .video-processing-status.complete {
        background: #f0fdf4;
      }

      .video-processing-status.complete .processing-message {
        color: #16a34a;
      }

      .processing-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid var(--theme-outline, #e0e0e0);
        border-top-color: var(--theme-primary, #0c8ce9);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .processing-spinner.small {
        width: 14px;
        height: 14px;
        border-width: 2px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .processing-message {
        font-size: 14px;
        color: var(--theme-text-primary, #333);
      }

      .processing-progress-bar {
        width: 100%;
        max-width: 300px;
        height: 4px;
        background: var(--theme-outline, #e0e0e0);
        border-radius: 2px;
        overflow: hidden;
      }

      .processing-progress-fill {
        height: 100%;
        background: var(--theme-primary, #0c8ce9);
        transition: width 0.3s ease;
      }

      /* Transcript Section */
      .video-transcript-section {
        margin-bottom: 16px;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text-primary, #333);
      }

      .video-transcript-content {
        padding: 12px;
        background: var(--theme-surface, #f5f5f5);
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.6;
        max-height: 150px;
        overflow-y: auto;
        color: var(--theme-text-primary, #333);
      }

      /* Feedback Points Section */
      .video-feedback-points-section {
        margin-bottom: 16px;
      }

      .feedback-count {
        background: var(--theme-primary, #0c8ce9);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }

      .video-feedback-points-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;
      }

      .feedback-page-group {
        background: var(--theme-surface, #f5f5f5);
        border-radius: 8px;
        overflow: hidden;
      }

      .feedback-page-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(0,0,0,0.05);
        font-size: 12px;
      }

      .page-icon {
        font-size: 14px;
      }

      .page-url {
        flex: 1;
        font-family: monospace;
        color: var(--theme-text-secondary, #666);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .page-count {
        background: rgba(0,0,0,0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
      }

      .feedback-page-items {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .feedback-point {
        padding: 12px;
        background: var(--theme-background, #fff);
        border-left: 3px solid transparent;
        transition: border-color 0.2s ease;
      }

      .feedback-point:hover {
        border-left-color: var(--theme-primary, #0c8ce9);
      }

      .feedback-point-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .feedback-point-time {
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-primary, #0c8ce9);
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }

      .feedback-point-time:hover {
        text-decoration: underline;
      }

      .feedback-point-category {
        flex: 1;
      }

      .category-select {
        padding: 4px 8px;
        border: 1px solid var(--theme-outline, #e0e0e0);
        border-radius: 4px;
        font-size: 12px;
        background: var(--theme-background, #fff);
        cursor: pointer;
      }

      .feedback-point-delete {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--theme-text-secondary, #666);
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .feedback-point-delete:hover {
        background: #fef2f2;
        color: #dc2626;
      }

      .feedback-point-transcript {
        font-size: 13px;
        line-height: 1.5;
        color: var(--theme-text-primary, #333);
      }

      .feedback-point-element {
        margin-top: 8px;
        padding: 4px 8px;
        background: rgba(0,0,0,0.05);
        border-radius: 4px;
        font-size: 11px;
        font-family: monospace;
        color: var(--theme-text-secondary, #666);
      }

      /* Actions */
      .video-feedback-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--theme-outline, #e0e0e0);
        margin-top: auto;
      }

      .video-feedback-actions .pointa-btn {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .video-feedback-actions .pointa-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Responsive adjustments */
      @media (max-width: 600px) {
        .video-feedback-modal .pointa-comment-modal-content {
          max-width: 100%;
          width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }
};

// Make available globally
window.VideoFeedbackUI = VideoFeedbackUI;
