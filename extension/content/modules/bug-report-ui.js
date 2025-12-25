/**
 * bug-report-ui.js
 * 
 * Handles UI for bug reporting including recording indicator, timeline visualization,
 * and bug report form.
 */

const BugReportUI = {
  recordingIndicator: null,
  currentModal: null,

  /**
   * Format bug ID in human-friendly way
   * BUG-1763347240602 -> "BUG-1763347240602 (Nov 17, 2025 2:40 AM)"
   */
  formatBugId(bugId) {
    // Extract timestamp from bug ID (e.g., "BUG-1763347240602" -> 1763347240602)
    const match = bugId.match(/BUG-(\d+)/);
    if (!match) return bugId;

    const timestamp = parseInt(match[1], 10);
    const date = new Date(timestamp);

    // Format: "Month Day, Year HH:MM AM/PM"
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const friendlyDate = date.toLocaleString('en-US', options);

    return `${bugId} <span class="bug-id-date">(${friendlyDate})</span>`;
  },

  /**
   * Show recording indicator (red border + cursor dot)
   */
  showRecordingIndicator() {
    // Create recording indicator overlay
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

    // Store interval for cleanup
    this.recordingIndicator._timerInterval = timerInterval;

    // Add cursor dot
    document.body.style.cursor = 'crosshair';

    // Add stop button handler
    const stopBtn = this.recordingIndicator.querySelector('.bug-recording-stop-btn');
    stopBtn.addEventListener('click', async () => {
      await window.pointa.stopBugReporting();
    });
  },

  /**
   * Hide recording indicator
   */
  hideRecordingIndicator() {
    if (this.recordingIndicator) {
      // Clear timer interval
      if (this.recordingIndicator._timerInterval) {
        clearInterval(this.recordingIndicator._timerInterval);
      }

      this.recordingIndicator.remove();
      this.recordingIndicator = null;
    }

    // Restore cursor
    document.body.style.cursor = '';
  },

  /**
   * Show timeline review modal
   */
  showTimelineReview(recordingData) {
    const timeline = recordingData.timeline;

    // Register modal with central manager
    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('bug-timeline');
    }

    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal bug-report-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    // Generate timeline HTML
    const timelineHTML = this.generateTimelineHTML(timeline);

    modal.innerHTML = `
      <div class="pointa-comment-modal-content bug-report-modal-content">
        <div class="pointa-comment-modal-header">
          <h3 class="pointa-comment-modal-title">🐛 Bug Timeline</h3>
          <button class="pointa-comment-modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="bug-timeline-container">
          <div class="bug-timeline-summary">
            <div class="bug-summary-stat">
              <span class="bug-summary-icon">🖱️</span>
              <span class="bug-summary-value">${timeline.summary.userInteractions}</span>
              <span class="bug-summary-label">interactions</span>
            </div>
            <div class="bug-summary-stat">
              <span class="bug-summary-icon">🌐</span>
              <span class="bug-summary-value">${timeline.summary.networkRequests}</span>
              <span class="bug-summary-label">requests</span>
            </div>
            <div class="bug-summary-stat ${timeline.summary.networkFailures > 0 ? 'bug-summary-error' : ''}">
              <span class="bug-summary-icon">⚠️</span>
              <span class="bug-summary-value">${timeline.summary.networkFailures}</span>
              <span class="bug-summary-label">failures</span>
            </div>
            <div class="bug-summary-stat ${timeline.summary.consoleErrors > 0 ? 'bug-summary-error' : ''}">
              <span class="bug-summary-icon">🔴</span>
              <span class="bug-summary-value">${timeline.summary.consoleErrors}</span>
              <span class="bug-summary-label">errors</span>
            </div>
            <div class="bug-summary-stat ${timeline.summary.consoleWarnings > 0 ? 'bug-summary-warning' : ''}">
              <span class="bug-summary-icon">⚠️</span>
              <span class="bug-summary-value">${timeline.summary.consoleWarnings}</span>
              <span class="bug-summary-label">warnings</span>
            </div>
            <div class="bug-summary-stat">
              <span class="bug-summary-icon">💬</span>
              <span class="bug-summary-value">${timeline.summary.consoleLogs}</span>
              <span class="bug-summary-label">logs</span>
            </div>
          </div>
          
          <div class="bug-timeline-tabs">
            <button class="bug-timeline-tab active" data-tab="timeline">
              <span class="bug-tab-icon">📋</span>
              <span class="bug-tab-label">Timeline</span>
            </button>
            <button class="bug-timeline-tab" data-tab="issues">
              <span class="bug-tab-icon">🎯</span>
              <span class="bug-tab-label">Key Issues Detected</span>
              ${recordingData.keyIssues.length > 0 ? `<span class="bug-tab-badge">${recordingData.keyIssues.length}</span>` : ''}
            </button>
          </div>
          
          <div class="bug-timeline-tab-content active" data-tab-content="timeline">
            <div class="bug-timeline-events">
              ${timelineHTML}
            </div>
          </div>
          
          <div class="bug-timeline-tab-content" data-tab-content="issues">
            <div class="bug-report-key-issues">
              ${recordingData.keyIssues.length > 0 ? `
                <ul class="bug-issues-list">
                  ${recordingData.keyIssues.map((issue) => `
                    <li class="bug-issue-item ${issue.severity}">
                      <span class="bug-issue-type">${this.getIssueIcon(issue.type)}</span>
                      <span class="bug-issue-desc">${this.escapeHtml(issue.description)}</span>
                      ${issue.isRootCause ? '<span class="bug-root-cause-badge">Root Cause</span>' : ''}
                    </li>
                  `).join('')}
                </ul>
              ` : '<p class="bug-no-issues">No critical issues detected in timeline.</p>'}
            </div>
          </div>
        </div>
        
        <div class="pointa-comment-actions">
          <button class="pointa-btn pointa-btn-secondary" id="cancel-bug-report">Cancel</button>
          <button class="pointa-btn pointa-btn-primary" id="continue-bug-report">Continue to Report</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Set up event listeners
    this.setupTimelineModalListeners(modal, recordingData);
  },

  /**
   * Generate timeline HTML
   */
  generateTimelineHTML(timeline) {
    return timeline.events.map((event) => {
      const timeStr = BugRecorder.formatRelativeTime(event.relativeTime);
      const icon = this.getEventIcon(event);
      const description = this.getEventDescription(event);
      const cssClass = `bug-timeline-event ${event.severity}`;

      return `
        <div class="${cssClass}">
          <span class="bug-event-time">${timeStr}</span>
          <span class="bug-event-icon">${icon}</span>
          <span class="bug-event-desc">${description}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * Get icon for event type
   */
  getEventIcon(event) {
    switch (event.type) {
      case 'recording-start':return '🎬';
      case 'recording-end':return '⏹️';
      case 'user-interaction':
        if (event.subtype === 'click') return '🖱️';
        if (event.subtype === 'input') return '⌨️';
        if (event.subtype === 'keypress') return '🔤';
        return '👆';
      case 'network':
        if (event.subtype === 'failed') return '❌';
        return '✓';
      case 'console-error':return '🔴';
      case 'console-warning':return '⚠️';
      case 'console-log':return '💬';
      case 'backend-log':return '🖥️';
      case 'backend-warn':return '🖥️';
      case 'backend-error':return '🖥️';
      default:return '•';
    }
  },

  /**
   * Get description for event
   */
  getEventDescription(event) {
    switch (event.type) {
      case 'recording-start':
        return 'Recording started';
      case 'recording-end':
        return 'Recording stopped';
      case 'user-interaction':
        if (event.subtype === 'click') {
          const elem = event.data.element;
          const desc = elem.textContent || elem.id || elem.tagName;
          return `Clicked "${this.escapeHtml(desc)}"`;
        }
        if (event.subtype === 'input') {
          return `Input to ${event.data.element.tagName}`;
        }
        if (event.subtype === 'keypress') {
          return `Pressed ${event.data.key}`;
        }
        return 'User interaction';
      case 'network':
        const statusOrError = event.data.status || event.data.error || 'Network Error';
        if (event.subtype === 'failed') {
          return `${event.data.method} ${this.truncateUrl(event.data.url)} - Failed (${statusOrError})`;
        }
        return `${event.data.method} ${this.truncateUrl(event.data.url)} - ${event.data.status}`;
      case 'console-error':
        return this.escapeHtml(this.truncateText(event.data.message, 100));
      case 'console-warning':
        return this.escapeHtml(this.truncateText(event.data.message, 100));
      case 'console-log':
        return this.escapeHtml(this.truncateText(event.data.message, 100));
      case 'backend-log':
        return `[Server] ${this.escapeHtml(this.truncateText(event.data.message, 100))}`;
      case 'backend-warn':
        return `[Server ⚠️] ${this.escapeHtml(this.truncateText(event.data.message, 100))}`;
      case 'backend-error':
        return `[Server ❌] ${this.escapeHtml(this.truncateText(event.data.message, 100))}`;
      default:
        return 'Event';
    }
  },

  /**
   * Get icon for issue type
   */
  getIssueIcon(type) {
    switch (type) {
      case 'console-error':return '🔴';
      case 'network-failure':return '🌐';
      case 'backend-error':return '🖥️';
      default:return '⚠️';
    }
  },

  /**
   * Show bug report form
   */
  showReportForm(recordingData) {
    // Register modal with central manager
    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('bug-report-form');
    }

    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal bug-report-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    modal.innerHTML = `
      <div class="pointa-comment-modal-content">
        <div class="pointa-comment-modal-header">
          <h3 class="pointa-comment-modal-title">🐛 Describe the Bug</h3>
          <button class="pointa-comment-modal-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="bug-report-form-container">
          <div class="bug-form-field">
            <label for="bug-expected">What did you expect? <span class="bug-form-optional">(optional)</span></label>
            <textarea 
              id="bug-expected"
              class="pointa-comment-textarea bug-form-textarea" 
              placeholder="Describe what should have happened..."
              maxlength="500"
              rows="3"
            ></textarea>
            <div class="bug-form-helper">We already captured the technical details from your recording</div>
          </div>
          
          <div class="bug-captured-data-summary">
            <h4>📊 Captured Data</h4>
            <div class="bug-data-chips">
              ${recordingData.screenshot?.captured ? '<span class="bug-data-chip">✓ Screenshot (saved to disk)</span>' : '<span class="bug-data-chip">⚠ Screenshot (not captured)</span>'}
              <span class="bug-data-chip">✓ ${recordingData.timeline.summary.consoleErrors} Errors</span>
              <span class="bug-data-chip">✓ ${recordingData.timeline.summary.consoleWarnings} Warnings</span>
              <span class="bug-data-chip">✓ ${recordingData.timeline.summary.consoleLogs} Logs</span>
              <span class="bug-data-chip">✓ ${recordingData.timeline.summary.networkFailures} Failed Requests</span>
              <span class="bug-data-chip">✓ ${recordingData.timeline.summary.userInteractions} Interactions</span>
            </div>
          </div>
        </div>
        
        <div class="pointa-comment-actions">
          <button class="pointa-btn pointa-btn-secondary" id="cancel-bug-report">Cancel</button>
          <button class="pointa-btn pointa-btn-primary" id="submit-bug-report">Create Bug Report</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Set up form event listeners
    this.setupFormModalListeners(modal, recordingData);
  },

  /**
   * Show confirmation modal
   */
  showConfirmation(bugReportId) {
    // Close any existing modal first
    this.closeModal();

    // Register modal with central manager
    if (window.PointaModalManager) {
      window.PointaModalManager.registerModal('bug-confirmation');
    }

    const modal = document.createElement('div');
    modal.className = 'pointa-comment-modal bug-report-modal';
    modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    modal.innerHTML = `
      <div class="pointa-comment-modal-content bug-confirmation-content">
        <div class="bug-confirmation-icon">✓</div>
        <h3 class="bug-confirmation-title">Bug Report Created</h3>
        <p class="bug-confirmation-id">${this.formatBugId(bugReportId)}</p>
        
        <div class="bug-confirmation-next">
          <h4>What's next?</h4>
          <ul>
            <li>Saved to local database</li>
            <li>Ready for AI analysis</li>
            <li>View in sidebar → Bug Reports tab</li>
          </ul>
        </div>
        
        <div class="bug-ai-prompt">
          <p>Tell your AI:</p>
          <div class="bug-ai-prompt-container">
            <code id="bug-ai-prompt-text">"Analyze and fix bug report ${bugReportId}"</code>
            <div class="bug-ai-actions">
              <button class="bug-ai-copy-btn" id="bug-ai-copy-btn" title="Copy to clipboard">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <div class="pointa-send-to-dropdown" id="bug-send-to-dropdown">
                <div class="pointa-split-button">
                  <button class="pointa-send-to-main" id="bug-send-to-main" data-tool="cursor">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span class="pointa-send-to-label">Send to Cursor</span>
                  </button>
                  <button class="pointa-send-to-toggle" id="bug-send-to-toggle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
                <div class="pointa-send-to-menu" id="bug-send-to-menu">
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
                  <div class="pointa-send-to-status" id="bug-send-to-status">
                    Checking availability...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button class="pointa-btn pointa-btn-primary bug-confirmation-done-btn" id="bug-confirmation-done">Done</button>
      </div>
    `;

    document.body.appendChild(modal);
    this.currentModal = modal;

    // Set up done button handler and copy button (use setTimeout to ensure DOM is ready)
    setTimeout(() => {
      const doneBtn = document.getElementById('bug-confirmation-done');
      const copyBtn = document.getElementById('bug-ai-copy-btn');
      const promptText = document.getElementById('bug-ai-prompt-text');



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
            console.error('[BugReportUI] Failed to copy text:', err);
          }
        });
      }

      // Set up Send to AI dropdown
      const sendToMain = document.getElementById('bug-send-to-main');
      const sendToToggle = document.getElementById('bug-send-to-toggle');
      const sendToMenu = document.getElementById('bug-send-to-menu');
      const sendToStatus = document.getElementById('bug-send-to-status');
      const sendToOptions = document.querySelectorAll('#bug-send-to-dropdown .pointa-send-to-option');
      const sendToLabel = document.querySelector('#bug-send-to-dropdown .pointa-send-to-label');

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
          console.error('[BugReportUI] Error checking AI tools availability:', error);
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
          console.error('[BugReportUI] Error sending to AI tool:', error);

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
          if (!e.target.closest('#bug-send-to-dropdown')) {
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
        // Store modal reference in closure to ensure we can close it
        const modalToClose = modal;

        doneBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();


          // Unregister modal with central manager
          if (window.PointaModalManager) {
            window.PointaModalManager.unregisterModal('bug-confirmation');
          }

          // Close the modal directly using the stored reference
          if (modalToClose && modalToClose.parentNode) {
            // Clean up escape handler if it exists
            if (modalToClose._escHandler) {
              document.removeEventListener('keydown', modalToClose._escHandler);
            }

            modalToClose.remove();
            this.currentModal = null;

          } else {
            // Fallback to closeModal method
            this.closeModal();
          }

          // CRITICAL: Always refresh sidebar to show updated bug report count
          // This ensures the dropdown badge and bug reports list are updated immediately
          if (window.PointaSidebar && window.PointaSidebar.isOpen) {

            window.PointaSidebar.isRecordingBug = false;
            window.PointaSidebar.currentView = null;
            const serverOnline = await window.PointaSidebar.checkServerStatus();
            await window.PointaSidebar.updateContent(window.pointa, serverOnline);

          } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
            // If sidebar is closed, open it to show the new bug report

            await window.PointaSidebar.open(window.pointa);
          }
        });


      } else {
        console.error('[BugReportUI] Done button not found!');
      }
    }, 100);

    // Close on backdrop click (clicking outside the content area)
    modal.addEventListener('click', async (e) => {
      // Only close if clicking directly on the modal backdrop (not its children)
      // Check that the target is exactly the modal element, not a child
      if (e.target === modal) {


        // Unregister modal with central manager
        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('bug-confirmation');
        }

        this.closeModal();

        // CRITICAL: Refresh sidebar when closing via backdrop
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {

          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
          // If sidebar is closed, open it to show the new bug report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    });

    // ESC to close
    const escHandler = async (e) => {
      if (e.key === 'Escape') {


        // Unregister modal with central manager
        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('bug-confirmation');
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
          // If sidebar is closed, open it to show the new bug report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    };
    document.addEventListener('keydown', escHandler);

    // Store handler reference for cleanup
    modal._escHandler = escHandler;

    // Auto-close after 8 seconds
    setTimeout(async () => {
      if (this.currentModal === modal) {


        // Unregister modal with central manager
        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('bug-confirmation');
        }

        this.closeModal();

        // CRITICAL: Refresh sidebar when auto-closing
        if (window.PointaSidebar && window.PointaSidebar.isOpen) {

          window.PointaSidebar.isRecordingBug = false;
          window.PointaSidebar.currentView = null;
          const serverOnline = await window.PointaSidebar.checkServerStatus();
          await window.PointaSidebar.updateContent(window.pointa, serverOnline);
        } else if (window.PointaSidebar && !window.PointaSidebar.isOpen) {
          // If sidebar is closed, open it to show the new bug report
          await window.PointaSidebar.open(window.pointa);
        }
      }
    }, 8000);
  },

  /**
   * Set up timeline modal listeners
   */
  setupTimelineModalListeners(modal, recordingData) {
    const closeBtn = modal.querySelector('.pointa-comment-modal-close');
    const cancelBtn = modal.querySelector('#cancel-bug-report');
    const continueBtn = modal.querySelector('#continue-bug-report');
    const tabButtons = modal.querySelectorAll('.bug-timeline-tab');
    const tabContents = modal.querySelectorAll('.bug-timeline-tab-content');

    // Tab switching logic
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        // Remove active class from all tabs and contents
        tabButtons.forEach((btn) => btn.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        const targetContent = modal.querySelector(`[data-tab-content="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });

    const closeModal = async () => {
      // Unregister this modal
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('bug-timeline');
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
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    continueBtn.addEventListener('click', () => {
      // Unregister timeline modal, showReportForm will register the form modal
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('bug-timeline');
      }
      modal.remove();
      this.currentModal = null;
      this.showReportForm(recordingData);
    });

    // ESC to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Set up form modal listeners
   */
  setupFormModalListeners(modal, recordingData) {
    const closeBtn = modal.querySelector('.pointa-comment-modal-close');
    const cancelBtn = modal.querySelector('#cancel-bug-report');
    const submitBtn = modal.querySelector('#submit-bug-report');
    const expectedInput = modal.querySelector('#bug-expected');

    const closeModal = async () => {
      // Unregister this modal
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('bug-report-form');
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
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    submitBtn.addEventListener('click', async () => {
      const expected = expectedInput.value.trim();

      // Unregister form modal before showing confirmation
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('bug-report-form');
      }

      // Create bug report (expectedBehavior is optional)
      await window.pointa.saveBugReport({
        expectedBehavior: expected || null,
        recordingData
      });

      modal.remove();
      this.currentModal = null;
    });

    // ESC to close
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


      // Store reference to modal being closed
      const modalToClose = this.currentModal;

      // Clear current modal reference immediately
      this.currentModal = null;

      // Unregister modal with central manager (check all possible bug report modal IDs)
      if (window.PointaModalManager) {
        window.PointaModalManager.unregisterModal('bug-timeline');
        window.PointaModalManager.unregisterModal('bug-report-form');
        window.PointaModalManager.unregisterModal('bug-confirmation');
      }

      // Clean up escape handler if it exists
      if (modalToClose._escHandler) {
        document.removeEventListener('keydown', modalToClose._escHandler);
      }

      // Remove from DOM immediately
      modalToClose.remove();

    } else {

    }
  },

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Utility: Truncate text
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Utility: Truncate URL
   */
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
window.BugReportUI = BugReportUI;