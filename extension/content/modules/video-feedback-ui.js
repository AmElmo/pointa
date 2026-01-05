/**
 * video-feedback-ui.js
 *
 * Review modal UI for video recordings.
 * Shows video playback, list of clicks with timestamps, and page changes.
 */

const VideoFeedbackUI = {
  currentModal: null,
  videoUrl: null,

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

    const clicksHTML = this.buildClicksList(recordingData.clicks || []);
    const pageChangesHTML = this.buildPageChangesList(recordingData.pageChanges || []);
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
                  <line x1="2" y1="7" x2="7" y2="7"></line>
                  <line x1="2" y1="17" x2="7" y2="17"></line>
                  <line x1="17" y1="17" x2="22" y2="17"></line>
                  <line x1="17" y1="7" x2="22" y2="7"></line>
                </svg>
                <p>Video not available</p>
              </div>
            `}
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

          <!-- Tabs for clicks and page changes -->
          <div class="video-feedback-tabs">
            <button class="video-feedback-tab active" data-tab="clicks">
              <span class="tab-icon">🖱️</span>
              <span class="tab-label">Clicks</span>
              <span class="tab-count">${recordingData.clicks?.length || 0}</span>
            </button>
            <button class="video-feedback-tab" data-tab="pages">
              <span class="tab-icon">📄</span>
              <span class="tab-label">Page Changes</span>
              <span class="tab-count">${(recordingData.pageChanges?.length || 1) - 1}</span>
            </button>
          </div>

          <!-- Tab content -->
          <div class="video-feedback-tab-content active" data-tab-content="clicks">
            ${clicksHTML}
          </div>
          <div class="video-feedback-tab-content" data-tab-content="pages">
            ${pageChangesHTML}
          </div>
        </div>

        <div class="video-feedback-actions">
          <button class="pointa-btn pointa-btn-secondary" id="video-feedback-dismiss">
            Dismiss
          </button>
          <button class="pointa-btn pointa-btn-primary" id="video-feedback-save" disabled title="Save functionality coming in Part 2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save (Coming Soon)
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
  },

  /**
   * Hide the modal
   */
  hide() {
    if (window.PointaModalManager) {
      window.PointaModalManager.unregisterModal('video-feedback');
    }

    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = null;
    }

    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
  },

  /**
   * Build clicks list HTML
   * @param {Array} clicks - Array of click events
   * @returns {string} HTML string
   */
  buildClicksList(clicks) {
    if (clicks.length === 0) {
      return `
        <div class="video-feedback-empty">
          <span class="empty-icon">🖱️</span>
          <p>No clicks recorded</p>
        </div>
      `;
    }

    const items = clicks.map((click, index) => {
      const element = click.element || {};
      const elementDesc = element.textContent?.substring(0, 30) || element.id || element.tagName || 'Unknown';

      return `
        <div class="video-feedback-item" data-timestamp="${click.timestamp}">
          <div class="video-feedback-item-time">${click.timestampFormatted || '00:00'}</div>
          <div class="video-feedback-item-icon">🖱️</div>
          <div class="video-feedback-item-content">
            <div class="video-feedback-item-title">Click #${index + 1}</div>
            <div class="video-feedback-item-desc">${this.escapeHtml(elementDesc)}</div>
            <div class="video-feedback-item-selector" title="${this.escapeHtml(element.selector || '')}">${this.escapeHtml(this.truncateSelector(element.selector || ''))}</div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="video-feedback-list">${items}</div>`;
  },

  /**
   * Build page changes list HTML
   * @param {Array} pageChanges - Array of page change events
   * @returns {string} HTML string
   */
  buildPageChangesList(pageChanges) {
    // Filter out initial page (show only navigations)
    const navigations = pageChanges.filter(p => p.type === 'navigation');

    if (navigations.length === 0) {
      return `
        <div class="video-feedback-empty">
          <span class="empty-icon">📄</span>
          <p>No page changes during recording</p>
        </div>
      `;
    }

    const items = navigations.map((change, index) => {
      const urlObj = this.parseUrl(change.url);

      return `
        <div class="video-feedback-item" data-timestamp="${change.timestamp}">
          <div class="video-feedback-item-time">${change.timestampFormatted || '00:00'}</div>
          <div class="video-feedback-item-icon">📄</div>
          <div class="video-feedback-item-content">
            <div class="video-feedback-item-title">Navigation #${index + 1}</div>
            <div class="video-feedback-item-desc">${this.escapeHtml(urlObj.pathname || '/')}</div>
            <div class="video-feedback-item-url" title="${this.escapeHtml(change.url)}">${this.escapeHtml(urlObj.host)}</div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="video-feedback-list">${items}</div>`;
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

    // Tab switching
    const tabs = modal.querySelectorAll('.video-feedback-tab');
    const tabContents = modal.querySelectorAll('.video-feedback-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetContent = modal.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });

    // Click on timeline items to seek video
    const timelineItems = modal.querySelectorAll('.video-feedback-item');
    const videoPlayer = modal.querySelector('#video-feedback-player');

    if (videoPlayer) {
      timelineItems.forEach(item => {
        item.addEventListener('click', () => {
          const timestamp = parseInt(item.dataset.timestamp, 10);
          if (!isNaN(timestamp)) {
            videoPlayer.currentTime = timestamp / 1000;
            videoPlayer.play();
          }
        });
      });
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
   * Parse URL safely
   * @param {string} url - URL to parse
   * @returns {Object} Parsed URL parts
   */
  parseUrl(url) {
    try {
      return new URL(url);
    } catch {
      return { pathname: url, host: '' };
    }
  },

  /**
   * Truncate selector for display
   * @param {string} selector - CSS selector
   * @returns {string} Truncated selector
   */
  truncateSelector(selector) {
    if (selector.length <= 40) return selector;
    return selector.substring(0, 37) + '...';
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
        max-width: 700px;
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

      .video-feedback-no-video svg {
        opacity: 0.5;
        margin-bottom: 12px;
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

      .video-meta-item svg {
        opacity: 0.7;
      }

      .video-feedback-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        border-bottom: 1px solid var(--theme-outline, #e0e0e0);
        padding-bottom: 12px;
      }

      .video-feedback-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        background: var(--theme-surface, #f5f5f5);
        border-radius: 8px;
        font-size: 13px;
        color: var(--theme-text-secondary, #666);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .video-feedback-tab:hover {
        background: var(--theme-surface-hover, #e8e8e8);
      }

      .video-feedback-tab.active {
        background: var(--theme-primary, #0c8ce9);
        color: #fff;
      }

      .video-feedback-tab .tab-count {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }

      .video-feedback-tab.active .tab-count {
        background: rgba(255, 255, 255, 0.2);
      }

      .video-feedback-tab-content {
        display: none;
      }

      .video-feedback-tab-content.active {
        display: block;
      }

      .video-feedback-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 250px;
        overflow-y: auto;
      }

      .video-feedback-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 12px;
        background: var(--theme-surface, #f5f5f5);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .video-feedback-item:hover {
        background: var(--theme-surface-hover, #e8e8e8);
      }

      .video-feedback-item-time {
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-primary, #0c8ce9);
        font-variant-numeric: tabular-nums;
        min-width: 40px;
      }

      .video-feedback-item-icon {
        font-size: 16px;
      }

      .video-feedback-item-content {
        flex: 1;
        min-width: 0;
      }

      .video-feedback-item-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-text-primary, #333);
        margin-bottom: 2px;
      }

      .video-feedback-item-desc {
        font-size: 12px;
        color: var(--theme-text-secondary, #666);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .video-feedback-item-selector,
      .video-feedback-item-url {
        font-size: 11px;
        color: var(--theme-text-tertiary, #999);
        font-family: monospace;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .video-feedback-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: var(--theme-text-secondary, #666);
      }

      .video-feedback-empty .empty-icon {
        font-size: 32px;
        margin-bottom: 8px;
        opacity: 0.5;
      }

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
    `;

    document.head.appendChild(style);
  }
};

// Make available globally
window.VideoFeedbackUI = VideoFeedbackUI;
