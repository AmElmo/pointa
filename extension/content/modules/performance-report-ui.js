/**
 * performance-report-ui.js
 * 
 * Handles UI for performance investigation including recording indicator 
 * and performance dashboard visualization.
 */

const PerformanceReportUI = {
  recordingIndicator: null,
  currentModal: null,

  /**
   * Format performance report ID in human-friendly way
   */
  formatPerfId(perfId) {
    const match = perfId.match(/PERF-(\d+)/);
    if (!match) return perfId;

    const timestamp = parseInt(match[1], 10);
    const date = new Date(timestamp);

    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const friendlyDate = date.toLocaleString('en-US', options);

    return `${perfId} <span class="bug-id-date">(${friendlyDate})</span>`;
  },

  /**
   * Show recording indicator
   */
  showRecordingIndicator() {
    this.recordingIndicator = document.createElement('div');
    this.recordingIndicator.className = 'bug-recording-indicator';
    this.recordingIndicator.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());
    this.recordingIndicator.innerHTML = `
      <div class="bug-recording-pulse"></div>
      <div class="bug-recording-timer">00:00</div>
      <button class="bug-recording-stop-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
        Stop Recording
      </button>
    `;

    document.body.appendChild(this.recordingIndicator);

    // Update timer
    const startTime = Date.now();
    const timerEl = this.recordingIndicator.querySelector('.bug-recording-timer');

    const timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }, 1000);

    this.recordingIndicator._timerInterval = timerInterval;

    // Add cursor indicator
    document.body.style.cursor = 'crosshair';

    // Add stop button handler
    const stopBtn = this.recordingIndicator.querySelector('.bug-recording-stop-btn');
    stopBtn.addEventListener('click', async () => {
      // If sidebar is open, handle state there (like bug reporting does)
      if (window.PointaSidebar && window.PointaSidebar.isOpen && window.PointaSidebar.isRecordingBug) {
        // Clear the sidebar timer
        if (window.PointaSidebar.sidebarTimerInterval) {
          clearInterval(window.PointaSidebar.sidebarTimerInterval);
          window.PointaSidebar.sidebarTimerInterval = null;
        }

        // Clear recording flag FIRST
        window.PointaSidebar.isRecordingBug = false;
        window.PointaSidebar.currentView = null;

        // Stop recording (shows modal)
        await window.pointa.stopPerformanceInvestigation();

        // Update sidebar to normal state
        const serverOnline = await window.PointaSidebar.checkServerStatus();
        await window.PointaSidebar.updateContent(window.pointa, serverOnline);
      } else {
        // No sidebar or sidebar not in recording mode, just stop
        await window.pointa.stopPerformanceInvestigation();
      }
    });
  },

  /**
   * Hide recording indicator
   */
  hideRecordingIndicator() {
    if (this.recordingIndicator) {
      if (this.recordingIndicator._timerInterval) {
        clearInterval(this.recordingIndicator._timerInterval);
      }

      this.recordingIndicator.remove();
      this.recordingIndicator = null;
    }

    document.body.style.cursor = '';
  },

  /**
   * Show performance dashboard modal
   * @param {Object} recordingData - Performance recording data
   * @param {boolean} isViewMode - If true, only show close button (viewing existing report)
   */
  showPerformanceDashboard(recordingData, isViewMode = false) {
    // Register modal with central manager
    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('performance-dashboard');
    }

    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal bug-report-modal perf-dashboard-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    const insights = recordingData.insights;
    const resources = recordingData.resources;
    const deviceInfo = recordingData.deviceInfo;
    const interactions = recordingData.interactions;

    // Generate dashboard HTML
    const deviceHTML = this.generateDeviceHTML(deviceInfo);
    const resourcesHTML = this.generateResourcesHTML(resources);
    const insightsHTML = this.generateInsightsHTML(insights);
    const interactionsHTML = this.generateInteractionsHTML(interactions);

    modal.innerHTML = `
      <div class="pointa-comment-modal-content perf-dashboard-content">
        <div class="pointa-comment-modal-header">
          <h3 class="pointa-comment-modal-title">⚡ Resource Performance Report</h3>
          <button class="pointa-comment-modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="perf-dashboard-scroll">
          <!-- Device & Connection Context -->
          ${deviceHTML}
          
          <!-- Resources -->
          ${resourcesHTML}
          
          <!-- Insights & Recommendations -->
          ${insightsHTML}
          
          <!-- User Interactions Context -->
          ${interactionsHTML}
        </div>
        
        <div class="pointa-comment-actions">
          ${isViewMode ?
    `<button class="pointa-btn pointa-btn-secondary" id="close-perf-report">Close</button>` :
    `
              <button class="pointa-btn pointa-btn-secondary" id="cancel-perf-report">Cancel</button>
              <button class="pointa-btn pointa-btn-primary" id="save-perf-report">Save Report</button>
            `}
        </div>
      </div>
    `;


    document.body.appendChild(modal);
    this.currentModal = modal;

    // Set up event listeners
    this.setupDashboardModalListeners(modal, recordingData, isViewMode);

    // Add backdrop click handler
    modal.addEventListener('click', async (e) => {
      if (e.target === modal) {
        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('performance-dashboard');
        }
        modal.remove();
        this.currentModal = null;

        // Reset sidebar state
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {
          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        }
      }
    });
  },

  /**
   * Generate device and connection context HTML
   */
  generateDeviceHTML(deviceInfo) {
    if (!deviceInfo) return '';

    const connection = deviceInfo.connection;
    const connectionClass = connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.effectiveType === '3g') ?
    'perf-poor' :
    connection && connection.effectiveType === '4g' ?
    'perf-good' :
    '';

    return `
      <div class="perf-device-section">
        <h4>📱 Device & Network Context</h4>
        <div class="perf-metrics-grid">
          <div class="perf-metric-card">
            <div class="perf-metric-label">CPU Cores</div>
            <div class="perf-metric-value">${deviceInfo.cpuCores}</div>
          </div>
          
          <div class="perf-metric-card">
            <div class="perf-metric-label">Device Memory</div>
            <div class="perf-metric-value">${deviceInfo.deviceMemory}</div>
          </div>
          
          ${connection ? `
            <div class="perf-metric-card ${connectionClass}">
              <div class="perf-metric-label">Connection Type</div>
              <div class="perf-metric-value">${connection.effectiveType || 'unknown'}</div>
              <div class="perf-metric-rating">${connection.downlink || 'N/A'}</div>
            </div>
            
            <div class="perf-metric-card">
              <div class="perf-metric-label">Network RTT</div>
              <div class="perf-metric-value">${connection.rtt || 'N/A'}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Generate user interactions context HTML
   */
  generateInteractionsHTML(interactions) {
    if (!interactions || interactions.length === 0) return '';

    // Filter out recording-start and recording-end events
    const userInteractions = interactions.filter((i) =>
    i.type === 'user-interaction'
    );

    if (userInteractions.length === 0) return '';

    const maxToShow = 15;
    const hasMore = userInteractions.length > maxToShow;

    const interactionsHTML = userInteractions.slice(0, maxToShow).map((interaction) => {
      const icon = this.getEventIcon(interaction);
      const description = this.getEventDescription(interaction);
      const time = this.formatRelativeTime(interaction.relativeTime);

      // Get additional details based on interaction type
      let detailsHTML = '';
      if (interaction.subtype === 'click') {
        const elem = interaction.data.element;
        const details = [];
        if (elem.id) details.push(`#${elem.id}`);
        if (elem.className && typeof elem.className === 'string') {
          const classes = elem.className.split(' ').filter((c) => c).slice(0, 2);
          if (classes.length > 0) details.push(`.${classes.join('.')}`);
        }
        if (details.length > 0) {
          detailsHTML = `<span class="perf-interaction-detail">${this.escapeHtml(details.join(' '))}</span>`;
        }
      } else if (interaction.subtype === 'input') {
        const elem = interaction.data.element;
        if (elem.id) {
          detailsHTML = `<span class="perf-interaction-detail">#${this.escapeHtml(elem.id)}</span>`;
        }
      }

      return `
        <div class="perf-interaction-item">
          <div class="perf-interaction-icon-wrapper">
            <span class="perf-interaction-icon">${icon}</span>
          </div>
          <div class="perf-interaction-content">
            <div class="perf-interaction-main">
              <span class="perf-interaction-desc">${description}</span>
              ${detailsHTML}
            </div>
            <span class="perf-interaction-time">${time}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="perf-interactions-section">
        <div class="perf-section-header">
          <h4 style="margin-bottom: 16px;">👆 User Context</h4>
          <span class="perf-interaction-count">${userInteractions.length} interaction${userInteractions.length === 1 ? '' : 's'}</span>
        </div>
        <div class="perf-interactions-list">
          ${interactionsHTML}
          ${hasMore ? `<div class="perf-interactions-more">+ ${userInteractions.length - maxToShow} more interaction${userInteractions.length - maxToShow === 1 ? '' : 's'}</div>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Format relative time from milliseconds
   */
  formatRelativeTime(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor(ms % 60000 / 1000);
    return `${minutes}m ${seconds}s`;
  },

  /**
   * Generate insights and recommendations HTML
   */
  generateInsightsHTML(insights) {
    if (!insights) return '';

    if (insights.summary && insights.summary.message) {
      return `
        <div class="perf-insights-section">
          <h4>✅ No Issues Detected</h4>
          <p class="perf-all-good">${this.escapeHtml(insights.summary.message)}</p>
        </div>
      `;
    }

    if (insights.issues.length === 0 && insights.recommendations.length === 0) {
      return `
        <div class="perf-insights-section">
          <h4>✅ No Issues Detected</h4>
          <p class="perf-all-good">Performance looks good! No critical issues found.</p>
        </div>
      `;
    }

    const issuesHTML = insights.issues.map((issue) => `
      <li class="perf-issue-item ${issue.severity}">
        <span class="perf-issue-icon">${issue.severity === 'error' ? '🔴' : '⚠️'}</span>
        <span class="perf-issue-message">${this.escapeHtml(issue.message)}</span>
      </li>
    `).join('');

    const recommendationsHTML = insights.recommendations.map((rec) => `
      <li class="perf-recommendation-item">
        <span class="perf-rec-icon">💡</span>
        <span class="perf-rec-text">${this.escapeHtml(rec)}</span>
      </li>
    `).join('');

    return `
      <div class="perf-insights-section">
        ${insights.issues.length > 0 ? `
          <h4 style="margin-bottom: 16px;">🎯 Issues Detected</h4>
          <ul class="perf-issues-list">
            ${issuesHTML}
          </ul>
        ` : ''}
        
        ${insights.recommendations.length > 0 ? `
          <h4 style="margin-bottom: 16px;">💡 Recommendations</h4>
          <ul class="perf-recommendations-list">
            ${recommendationsHTML}
          </ul>
        ` : ''}
      </div>
    `;
  },


  /**
   * Generate resources HTML
   */
  generateResourcesHTML(resources) {
    if (!resources || resources.length === 0) {
      return `
        <div class="perf-resources-section">
          <h4 style="margin-bottom: 16px;">📦 Resources</h4>
          <p class="perf-all-good">✅ No slow resources detected! All resources loaded quickly.</p>
        </div>
      `;
    }

    const resourcesHTML = resources.slice(0, 10).map((resource) => {
      const durationClass = resource.duration > 3000 ? 'perf-slow' : resource.duration > 2000 ? 'perf-warning' : '';

      return `
        <div class="perf-resource-item">
          <div class="perf-resource-header">
            <span class="perf-resource-type">${resource.type}</span>
            <span class="perf-resource-duration ${durationClass}">${resource.duration}ms</span>
          </div>
          <div class="perf-resource-name">${this.truncateUrl(resource.name)}</div>
          <div class="perf-resource-details">
            ${resource.size ? `<span>${this.formatBytes(resource.size)}</span>` : ''}
            ${resource.cached ? '<span class="perf-cached">✓ cached</span>' : '<span class="perf-not-cached">not cached</span>'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="perf-resources-section">
        <h4 style="margin-bottom: 16px;">📦 Slow Resources (${resources.length} detected)</h4>
        <p class="perf-section-description">Resources taking >1s to load or >100KB in size</p>
        <div class="perf-resources-list">
          ${resourcesHTML}
        </div>
      </div>
    `;
  },

  /**
   * Get event icon
   */
  getEventIcon(event) {
    switch (event.type) {
      case 'user-interaction':
        if (event.subtype === 'click') return '🖱️';
        if (event.subtype === 'input') return '⌨️';
        if (event.subtype === 'scroll') return '📜';
        return '👆';
      default:return '•';
    }
  },

  /**
   * Get event description
   */
  getEventDescription(event) {
    switch (event.type) {
      case 'user-interaction':
        if (event.subtype === 'click') {
          const elem = event.data.element;
          const desc = elem.textContent || elem.id || elem.tagName;
          return `Clicked "${this.escapeHtml(desc)}"`;
        }
        if (event.subtype === 'input') {
          return `Input to ${event.data.element.tagName}`;
        }
        if (event.subtype === 'scroll') {
          return `Scrolled to ${event.data.scrollY}px`;
        }
        return 'User interaction';
      default:
        return 'Event';
    }
  },

  /**
   * Show confirmation modal
   */
  showConfirmation(perfReportId) {
    this.closeModal();

    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('perf-confirmation');
    }

    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal bug-report-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    modal.innerHTML = `
      <div class="pointa-comment-modal-content bug-confirmation-content">
        <div class="bug-confirmation-icon">✓</div>
        <h3 class="bug-confirmation-title">Performance Report Created</h3>
        <p class="bug-confirmation-id">${this.formatPerfId(perfReportId)}</p>
        
        <div class="bug-confirmation-next">
          <h4>What's next?</h4>
          <ul>
            <li>Saved to local database</li>
            <li>Ready for AI analysis</li>
            <li>View in sidebar → Issue Reports tab</li>
          </ul>
        </div>
        
        <div class="bug-ai-prompt">
          <p>Tell your AI:</p>
          <div class="bug-ai-prompt-container">
            <code id="perf-ai-prompt-text">"Analyze and fix performance report ${perfReportId}"</code>
            <div class="bug-ai-actions">
              <button class="bug-ai-copy-btn" id="perf-ai-copy-btn" title="Copy to clipboard">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <div class="pointa-send-to-dropdown" id="perf-send-to-dropdown">
                <div class="pointa-split-button">
                  <button class="pointa-send-to-main" id="perf-send-to-main" data-tool="cursor">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span class="pointa-send-to-label">Send to Cursor</span>
                  </button>
                  <button class="pointa-send-to-toggle" id="perf-send-to-toggle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
                <div class="pointa-send-to-menu" id="perf-send-to-menu">
                  <button class="pointa-send-to-option" data-tool="cursor">
                    <span class="pointa-tool-icon"><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"/></svg></span>
                    Cursor
                  </button>
                  <button class="pointa-send-to-option" data-tool="claude-code">
                    <span class="pointa-tool-icon"><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/></svg></span>
                    Claude Code
                  </button>
                  <button class="pointa-send-to-option" data-tool="github-copilot">
                    <span class="pointa-tool-icon"><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z"/></svg></span>
                    GitHub Copilot
                  </button>
                  <button class="pointa-send-to-option" data-tool="windsurf">
                    <span class="pointa-tool-icon"><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M23.55 5.067c-1.2038-.002-2.1806.973-2.1806 2.1765v4.8676c0 .972-.8035 1.7594-1.7597 1.7594-.568 0-1.1352-.286-1.4718-.7659l-4.9713-7.1003c-.4125-.5896-1.0837-.941-1.8103-.941-1.1334 0-2.1533.9635-2.1533 2.153v4.8957c0 .972-.7969 1.7594-1.7596 1.7594-.57 0-1.1363-.286-1.4728-.7658L.4076 5.1598C.2822 4.9798 0 5.0688 0 5.2882v4.2452c0 .2147.0656.4228.1884.599l5.4748 7.8183c.3234.462.8006.8052 1.3509.9298 1.3771.313 2.6446-.747 2.6446-2.0977v-4.893c0-.972.7875-1.7593 1.7596-1.7593h.003a1.798 1.798 0 0 1 1.4718.7658l4.9723 7.0994c.4135.5905 1.05.941 1.8093.941 1.1587 0 2.1515-.9645 2.1515-2.153v-4.8948c0-.972.7875-1.7594 1.7596-1.7594h.194a.22.22 0 0 0 .2204-.2202v-4.622a.22.22 0 0 0-.2203-.2203Z"/></svg></span>
                    Windsurf
                  </button>
                  <div class="pointa-send-to-divider"></div>
                  <div class="pointa-send-to-status" id="perf-send-to-status">
                    Checking availability...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button class="pointa-btn pointa-btn-primary bug-confirmation-done-btn" id="perf-confirmation-done">Done</button>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    setTimeout(() => {
      const doneBtn = document.getElementById('perf-confirmation-done');
      const copyBtn = document.getElementById('perf-ai-copy-btn');
      const promptText = document.getElementById('perf-ai-prompt-text');

      // Set up copy button
      if (copyBtn && promptText) {
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Remove surrounding quotes from the text
          const textToCopy = promptText.textContent.replace(/^["']|["']$/g, '');

          try {
            await navigator.clipboard.writeText(textToCopy);

            // Visual feedback - change icon to checkmark
            copyBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
            copyBtn.style.color = '#10b981';

            // Reset after 2 seconds
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              `;
              copyBtn.style.color = '';
            }, 2000);
          } catch (err) {
            console.error('[PerformanceReportUI] Failed to copy text:', err);
          }
        });
      }

      // Set up Send to AI dropdown
      const sendToMain = document.getElementById('perf-send-to-main');
      const sendToToggle = document.getElementById('perf-send-to-toggle');
      const sendToMenu = document.getElementById('perf-send-to-menu');
      const sendToStatus = document.getElementById('perf-send-to-status');
      const sendToOptions = document.querySelectorAll('#perf-send-to-dropdown .pointa-send-to-option');
      const sendToLabel = document.querySelector('#perf-send-to-dropdown .pointa-send-to-label');

      // Tool display names mapping
      const toolDisplayNames = {
        'cursor': 'Cursor',
        'claude-code': 'Claude Code',
        'github-copilot': 'GitHub Copilot',
        'windsurf': 'Windsurf'
      };

      // Load last used tool and update button
      const updateMainButtonTool = (tool) => {
        if (sendToMain && sendToLabel) {
          sendToMain.dataset.tool = tool;
          sendToLabel.textContent = `Send to ${toolDisplayNames[tool] || tool}`;
        }
      };

      // Initialize with last used tool
      chrome.storage.local.get(['lastUsedAITool'], (result) => {
        const lastTool = result.lastUsedAITool || 'cursor';
        updateMainButtonTool(lastTool);
      });

      // Check AI tools availability via pointa-server
      async function checkAIToolsAvailability() {
        if (sendToStatus) {
          sendToStatus.textContent = 'Checking availability...';
          sendToStatus.className = 'pointa-send-to-status';
        }

        try {
          const response = await chrome.runtime.sendMessage({ action: 'checkNativeHostInstalled' });

          if (response.success && response.installed) {
            // Get available tools
            const toolsResponse = await chrome.runtime.sendMessage({ action: 'getAvailableAITools' });

            if (toolsResponse.success && toolsResponse.tools) {
              const toolNames = toolsResponse.tools.map((t) => t.name).join(', ');
              if (sendToStatus) {
                sendToStatus.innerHTML = `<span class="pointa-status-ok">✓</span> Available: ${toolNames || 'None detected'}`;
                sendToStatus.className = 'pointa-send-to-status pointa-status-connected';
              }

              // Enable/disable options based on availability
              sendToOptions.forEach((option) => {
                const toolId = option.dataset.tool;
                const isAvailable = toolsResponse.tools.some((t) => t.id === toolId);
                option.classList.toggle('disabled', !isAvailable);
              });
            }
          } else {
            if (sendToStatus) {
              sendToStatus.innerHTML = `
                <span class="pointa-status-error">⚠</span> Server not running
                <br><small>Run: <code>pointa-server start</code></small>
              `;
              sendToStatus.className = 'pointa-send-to-status pointa-status-error';
            }

            // Disable all options
            sendToOptions.forEach((option) => {
              option.classList.add('disabled');
            });
          }
        } catch (error) {
          console.error('[PerformanceReportUI] Error checking AI tools availability:', error);
          if (sendToStatus) {
            sendToStatus.innerHTML = `<span class="pointa-status-error">✗</span> Error: ${error.message}`;
            sendToStatus.className = 'pointa-send-to-status pointa-status-error';
          }
        }
      }

      // Helper function to send to AI tool
      const sendToTool = async (tool, option) => {
        const prompt = promptText.textContent.replace(/^["']|["']$/g, '');

        // Show sending state
        const originalHTML = option.innerHTML;
        option.innerHTML = `
          <span class="pointa-sending-spinner"></span>
          Sending...
        `;
        option.classList.add('sending');

        try {
          // Get autoSend setting
          const settings = await new Promise(resolve => {
            chrome.storage.local.get(['aiAutoSend'], resolve);
          });
          const autoSend = settings.aiAutoSend || false;

          const response = await chrome.runtime.sendMessage({
            action: 'sendToAITool',
            tool: tool,
            prompt: prompt,
            autoSend: autoSend
          });

          if (response.success) {
            // Save last used tool and update main button
            chrome.storage.local.set({ lastUsedAITool: tool });
            updateMainButtonTool(tool);

            // Show success
            option.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Sent!
            `;
            option.classList.remove('sending');
            option.classList.add('sent');

            // Close dropdown after a delay
            setTimeout(() => {
              sendToMenu.classList.remove('show');
              option.innerHTML = originalHTML;
              option.classList.remove('sent');
            }, 1500);
          } else {
            throw new Error(response.error || 'Failed to send');
          }
        } catch (error) {
          console.error('[PerformanceReportUI] Error sending to AI tool:', error);

          // Show error
          option.innerHTML = `
            <span class="pointa-status-error">✗</span>
            Failed
          `;
          option.classList.remove('sending');
          option.classList.add('error');

          setTimeout(() => {
            option.innerHTML = originalHTML;
            option.classList.remove('error');
          }, 2000);
        }
      };

      if (sendToMain && sendToMenu) {
        // Main button sends directly
        sendToMain.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tool = sendToMain.dataset.tool;
          await sendToTool(tool, sendToMain);
        });

        // Toggle button opens dropdown
        if (sendToToggle) {
          sendToToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sendToMenu.classList.toggle('show');

            // Check AI tools availability when opening
            if (sendToMenu.classList.contains('show')) {
              checkAIToolsAvailability();
            }
          });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!e.target.closest('#perf-send-to-dropdown')) {
            sendToMenu.classList.remove('show');
          }
        });

        // Handle Send to option clicks
        sendToOptions.forEach((option) => {
          option.addEventListener('click', async (e) => {
            e.stopPropagation();

            if (option.classList.contains('disabled')) {
              return;
            }

            const tool = option.dataset.tool;
            await sendToTool(tool, option);
          });
        });
      }

      if (doneBtn) {
        const modalToClose = modal;

        doneBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();


          if (window.PointaModalManager) {
            window.PointaModalManager.unregisterModal('perf-confirmation');
          }

          if (modalToClose && modalToClose.parentNode) {
            if (modalToClose._escHandler) {
              document.removeEventListener('keydown', modalToClose._escHandler);
            }
            modalToClose.remove();
            this.currentModal = null;

          } else {
            this.closeModal();
          }

          // CRITICAL: Always refresh sidebar to show updated performance report count
          if (window.PointaSidebar && window.PointaSidebar.isOpen) {

            window.PointaSidebar.isRecordingBug = false;
            window.PointaSidebar.currentView = null;
            const serverOnline = await window.PointaSidebar.checkServerStatus();
            await window.PointaSidebar.updateContent(window.pointa, serverOnline);

          } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
            // If sidebar is closed, open it to show the new performance report

            await window.PointaSidebar.open(window.pointa);
          }
        });
      }
    }, 100);

    modal.addEventListener('click', async (e) => {
      if (e.target === modal) {


        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('perf-confirmation');
        }
        this.closeModal();

        // CRITICAL: Refresh sidebar when closing via backdrop
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {

          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
          // If sidebar is closed, open it to show the new performance report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    });

    const escHandler = async (e) => {
      if (e.key === 'Escape') {


        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('perf-confirmation');
        }
        this.closeModal();
        document.removeEventListener('keydown', escHandler);

        // CRITICAL: Refresh sidebar when closing via ESC
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {

          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
          // If sidebar is closed, open it to show the new performance report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    };
    document.addEventListener('keydown', escHandler);
    modal._escHandler = escHandler;

    setTimeout(async () => {
      if (this.currentModal === modal) {


        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('perf-confirmation');
        }
        this.closeModal();

        // CRITICAL: Refresh sidebar when auto-closing
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {

          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
          // If sidebar is closed, open it to show the new performance report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    }, 8000);
  },

  /**
   * Setup dashboard modal listeners
   */
  setupDashboardModalListeners(modal, recordingData, isViewMode = false) {
    const closeBtn = modal.querySelector('.pointa-comment-modal-close');
    const cancelBtn = modal.querySelector('#cancel-perf-report');
    const saveBtn = modal.querySelector('#save-perf-report');
    const viewCloseBtn = modal.querySelector('#close-perf-report');

    const closeModal = async () => {
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('performance-dashboard');
      }
      modal.remove();
      this.currentModal = null;

      // Reset sidebar state when user cancels/closes
      if (window.PointaSidebar && window.PointaSidebar.isOpen) {
        window.PointaSidebar.isRecordingBug = false;
        window.PointaSidebar.currentView = null;
        const serverOnline = await window.PointaSidebar.checkServerStatus();
        await window.PointaSidebar.updateContent(window.pointa, serverOnline);
      }
    };

    // Top-right close button always works
    closeBtn.addEventListener('click', closeModal);

    // In view mode, just show close button
    if (isViewMode) {
      if (viewCloseBtn) {
        viewCloseBtn.addEventListener('click', closeModal);
      }
    } else {
      // In create mode, show cancel and save buttons
      if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          if (window.PointaModalManager) {
            window.PointaModalManager.unregisterModal('performance-dashboard');
          }
          modal.remove();
          this.currentModal = null;

          // Save directly without the form
          await window.pointa.savePerformanceReport({
            description: '',
            whenHappens: '',
            recordingData
          });
        });
      }
    }

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Close current modal
   */
  closeModal() {
    if (this.currentModal) {
      const modalToClose = this.currentModal;
      this.currentModal = null;

      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('performance-dashboard');
        window.PointaModalManager.unregisterModal('perf-confirmation');
      }

      if (modalToClose._escHandler) {
        document.removeEventListener('keydown', modalToClose._escHandler);
      }

      modalToClose.remove();
    }
  },

  // Utility methods for formatting

  formatMs(ms) {
    if (!ms && ms !== 0) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },

  formatBytes(bytes) {
    if (!bytes && bytes !== 0) return 'N/A';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname;
      if (path.length > 40) {
        path = '...' + path.substring(path.length - 37);
      }
      return path + (urlObj.search ? '?' : '');
    } catch {
      return url.substring(0, 40) + (url.length > 40 ? '...' : '');
    }
  }
};

// Make available globally
window.PerformanceReportUI = PerformanceReportUI;