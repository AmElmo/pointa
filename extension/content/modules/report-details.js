const PointaReportDetails = {
  // Load bug reports from backend
  async loadBugReports() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getBugReports',
        status: 'all'
      });
      if (!response.success) {
        console.error('[ReportDetails] Error loading bug reports:', response.error);
        return [];
      }
      return response.issueReports || [];
    } catch (error) {
      console.error('[ReportDetails] Error loading bug reports:', error);
      return [];
    }
  },

  // Show bug report details modal
  async showBugReportDetails(bugId) {
    console.log('[ReportDetails] showBugReportDetails called with:', bugId);
    try {
      const issueReports = await PointaReportDetails.loadBugReports();
      console.log('[ReportDetails] Loaded reports:', issueReports.length, 'looking for:', bugId);
      const bugReport = issueReports.find((r) => r.id === bugId);

      if (!bugReport) {
        console.error('[ReportDetails] Bug report not found:', bugId);
        return;
      }

      if (window.PointaModalManager) {
        window.PointaModalManager.registerModal('bug-details');
      }

      const modal = document.createElement('div');
      modal.className = 'pointa-comment-modal bug-report-modal';
      modal.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

      const created = new Date(bugReport.created);
      const dateStr = created.toLocaleString();

      const expectedBehavior = bugReport.report?.expectedBehavior || 'Not specified';
      const timeline = bugReport.recordings?.[0]?.timeline || bugReport.timeline;
      const keyIssues = bugReport.keyIssues || [];

      const timelineHTML = timeline?.events ? PointaReportDetails.generateBugTimelineHTML(timeline) : '<p class="bug-no-timeline">No timeline data available.</p>';

      modal.innerHTML = `
        <div class="pointa-comment-modal-content bug-report-modal-content">
          <div class="pointa-comment-modal-header">
            <h3 class="pointa-comment-modal-title">🐛 Bug Report Details</h3>
            <button class="pointa-comment-modal-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="bug-details-container">
            ${bugReport.needs_more_logging ? `
              <div class="bug-action-section" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.1);">
                <h4>🔍 Needs More Logging</h4>
                <p class="bug-action-notes">Previous fix attempt failed. AI should add console.log statements and debugging output before attempting another fix.</p>
                <p class="bug-action-hint"><strong>Failed attempts:</strong> ${bugReport.failed_fix_attempts || 1}</p>
              </div>
            ` : ''}
            ${PointaReportDetails.renderBugStatusActions(bugReport)}

            <div class="bug-detail-section">
              <h4 class="bug-detail-label">Bug ID</h4>
              <p class="bug-confirmation-id">${bugReport.id}</p>
              <p class="bug-detail-meta">${dateStr}</p>
            </div>

            ${bugReport.visual?.screenshot?.captured ? `
              <div class="bug-detail-section">
                <h4 class="bug-detail-label">Screenshot</h4>
                <div class="bug-screenshot-info">
                  <p>📷 Screenshot captured and saved to disk</p>
                  <p class="bug-screenshot-path">Location: ~/.pointa/bug_screenshots/${bugReport.visual.screenshot.id}.png</p>
                </div>
              </div>
            ` : ''}

            <div class="bug-detail-section">
              <h4 class="bug-detail-label">Expected Behavior</h4>
              <p class="bug-detail-text">${PointaUtils.escapeHtml(expectedBehavior)}</p>
            </div>

            ${timeline ? `
              <div class="bug-detail-section">
                <h4 class="bug-detail-label">Timeline Summary</h4>
                <div class="bug-timeline-summary">
                  <div class="bug-summary-stat">
                    <span class="bug-summary-icon">🖱️</span>
                    <span class="bug-summary-value">${timeline.summary?.userInteractions || 0}</span>
                    <span class="bug-summary-label">interactions</span>
                  </div>
                  <div class="bug-summary-stat">
                    <span class="bug-summary-icon">🌐</span>
                    <span class="bug-summary-value">${timeline.summary?.networkRequests || 0}</span>
                    <span class="bug-summary-label">requests</span>
                  </div>
                  <div class="bug-summary-stat ${(timeline.summary?.networkFailures || 0) > 0 ? 'bug-summary-error' : ''}">
                    <span class="bug-summary-icon">⚠️</span>
                    <span class="bug-summary-value">${timeline.summary?.networkFailures || 0}</span>
                    <span class="bug-summary-label">failures</span>
                  </div>
                  <div class="bug-summary-stat ${(timeline.summary?.consoleErrors || 0) > 0 ? 'bug-summary-error' : ''}">
                    <span class="bug-summary-icon">🔴</span>
                    <span class="bug-summary-value">${timeline.summary?.consoleErrors || 0}</span>
                    <span class="bug-summary-label">errors</span>
                  </div>
                  <div class="bug-summary-stat ${(timeline.summary?.consoleWarnings || 0) > 0 ? 'bug-summary-warning' : ''}">
                    <span class="bug-summary-icon">⚠️</span>
                    <span class="bug-summary-value">${timeline.summary?.consoleWarnings || 0}</span>
                    <span class="bug-summary-label">warnings</span>
                  </div>
                  <div class="bug-summary-stat">
                    <span class="bug-summary-icon">💬</span>
                    <span class="bug-summary-value">${timeline.summary?.consoleLogs || 0}</span>
                    <span class="bug-summary-label">logs</span>
                  </div>
                </div>
              </div>
            ` : ''}

            ${keyIssues.length > 0 ? `
              <div class="bug-detail-section">
                <h4 class="bug-detail-label">🎯 Key Issues Detected</h4>
                <ul class="bug-issues-list">
                  ${keyIssues.map((issue) => `
                    <li class="bug-issue-item ${issue.severity}">
                      <span class="bug-issue-type">${PointaReportDetails.getBugIssueIcon(issue.type)}</span>
                      <span class="bug-issue-desc">${PointaUtils.escapeHtml(issue.description)}</span>
                      ${issue.isRootCause ? '<span class="bug-root-cause-badge">Root Cause</span>' : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            ${timeline?.events ? `
              <div class="bug-detail-section">
                <h4 class="bug-detail-label">Event Timeline</h4>
                <div class="bug-timeline-events">
                  ${timelineHTML}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="pointa-comment-actions">
            <button class="pointa-btn pointa-btn-primary" id="bug-details-close">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.pointa-comment-modal-close');
      const doneBtn = modal.querySelector('#bug-details-close');

      const closeModal = () => {
        if (window.PointaModalManager) {
          window.PointaModalManager.unregisterModal('bug-details');
        }
        modal.remove();
      };

      closeBtn.addEventListener('click', closeModal);
      doneBtn.addEventListener('click', closeModal);

      const autoReplayBtn = modal.querySelector('#auto-replay-btn');
      if (autoReplayBtn) {
        autoReplayBtn.addEventListener('click', async () => {
          closeModal();
          await BugReplayEngine.autoReplay(bugReport);
        });
      }

      const markFixedBtn = modal.querySelector('#mark-fixed-btn');
      if (markFixedBtn) {
        markFixedBtn.addEventListener('click', async () => {
          await PointaReportDetails.markBugResolved(bugReport.id);
          closeModal();
        });
      }

      const reopenBtn = modal.querySelector('#reopen-bug-btn');
      if (reopenBtn) {
        reopenBtn.addEventListener('click', async () => {
          await PointaReportDetails.reopenBug(bugReport.id);
          closeModal();
        });
      }

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      });

    } catch (error) {
      console.error('[ReportDetails] Error showing bug report details:', error);
      alert('Failed to load bug report details. Please try again.');
    }
  },

  // Show performance report details
  async showPerformanceReportDetails(perfId) {
    try {
      const reports = await PointaReportDetails.loadBugReports();
      const perfReport = reports.find((r) => r.id === perfId);
      if (!perfReport) {
        console.error('[ReportDetails] Performance report not found:', perfId);
        return;
      }
      const recordingData = {
        pageLoad: perfReport.performance?.pageLoad || perfReport.pageLoad || {},
        timeline: perfReport.performance?.timeline || perfReport.timeline || [],
        insights: perfReport.performance?.insights || perfReport.insights || { issues: [], recommendations: [], score: 0 },
        memory: perfReport.performance?.memory || perfReport.memory || {},
        screenshot: perfReport.screenshot || {},
        startTime: perfReport.performance?.startTime || perfReport.startTime,
        endTime: perfReport.performance?.endTime || perfReport.endTime,
        duration: perfReport.performance?.duration || perfReport.duration
      };
      if (window.PerformanceReportUI) {
        window.PerformanceReportUI.showPerformanceDashboard(recordingData, true);
      } else {
        console.error('[ReportDetails] PerformanceReportUI not available');
      }
    } catch (error) {
      console.error('[ReportDetails] Error showing performance report details:', error);
    }
  },

  // Render bug status action buttons
  renderBugStatusActions(bugReport) {
    if (bugReport.status === 'debugging') {
      const lastAction = bugReport.ai_actions?.[bugReport.ai_actions.length - 1];
      return `
        <div class="bug-action-section bug-debugging-section">
          <h4>🔄 AI Added Debugging</h4>
          <p class="bug-action-notes">${PointaUtils.escapeHtml(lastAction?.notes || 'Debugging code added')}</p>
          <p class="bug-action-hint"><strong>What to look for:</strong> ${PointaUtils.escapeHtml(lastAction?.what_to_look_for || 'Check new console logs')}</p>
          <button class="pointa-btn pointa-btn-primary" id="auto-replay-btn">
            ▶️ Auto-Replay & Capture (Iteration ${(bugReport.recordings?.length || 0) + 1})
          </button>
        </div>
      `;
    }
    if (bugReport.status === 'in-review') {
      const lastAction = bugReport.ai_actions?.[bugReport.ai_actions.length - 1];
      return `
        <div class="bug-action-section bug-review-section">
          <h4>🔧 AI Resolution</h4>
          <p class="bug-action-notes">${PointaUtils.escapeHtml(lastAction?.notes || 'Fix ready for testing')}</p>
          ${lastAction?.changes_made && lastAction.changes_made.length > 0 ? `
            <ul class="bug-changes-list">
              ${lastAction.changes_made.map((change) => `<li>${PointaUtils.escapeHtml(change)}</li>`).join('')}
            </ul>
          ` : ''}
          <div class="bug-review-actions">
            <button class="pointa-btn pointa-btn-success" id="mark-fixed-btn">✅ Works!</button>
            <button class="pointa-btn pointa-btn-secondary" id="reopen-bug-btn">❌ Not working, need more logging</button>
          </div>
        </div>
      `;
    }
    return '';
  },

  // Mark bug as resolved
  async markBugResolved(bugId) {
    try {
      const issueReports = await PointaReportDetails.loadBugReports();
      const bug = issueReports.find((r) => r.id === bugId);
      if (!bug) {
        console.error('[ReportDetails] Bug not found:', bugId);
        return;
      }
      bug.status = 'resolved';
      bug.updated = new Date().toISOString();
      bug.resolved_at = new Date().toISOString();
      const response = await chrome.runtime.sendMessage({
        action: 'updateBugReport',
        bugReport: bug
      });
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to update bug report');
      }
    } catch (error) {
      console.error('[ReportDetails] Error marking bug as resolved:', error);
      alert('Failed to update bug report. Please try again.');
    }
  },

  // Reopen bug
  async reopenBug(bugId) {
    try {
      const issueReports = await PointaReportDetails.loadBugReports();
      const bug = issueReports.find((r) => r.id === bugId);
      if (!bug) {
        console.error('[ReportDetails] Bug not found:', bugId);
        return;
      }
      const lastAction = bug.ai_actions?.[bug.ai_actions.length - 1];
      if (!bug.ai_actions) {
        bug.ai_actions = [];
      }
      bug.ai_actions.push({
        timestamp: new Date().toISOString(),
        type: 'fix_failed',
        notes: 'User tested fix but issue persists. Need to add more logging to understand the problem.',
        previous_attempt: lastAction ? {
          type: lastAction.type,
          notes: lastAction.notes
        } : null
      });
      bug.status = 'active';
      bug.needs_more_logging = true;
      bug.failed_fix_attempts = (bug.failed_fix_attempts || 0) + 1;
      bug.updated = new Date().toISOString();
      const response = await chrome.runtime.sendMessage({
        action: 'updateBugReport',
        bugReport: bug
      });
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to update bug report');
      }
    } catch (error) {
      console.error('[ReportDetails] Error reopening bug:', error);
      alert('Failed to update bug report. Please try again.');
    }
  },

  // Generate timeline HTML
  generateBugTimelineHTML(timeline) {
    if (!timeline.events || timeline.events.length === 0) {
      return '<p class="bug-no-timeline">No timeline events recorded.</p>';
    }
    const filteredEvents = timeline.events.filter((event) => {
      if (event.type === 'console-error') {
        const source = event.data?.source || '';
        if (source.startsWith('chrome-extension://')) return false;
      }
      if (event.type === 'network') {
        const url = event.data?.url || '';
        const method = event.data?.method || '';
        if (url.includes('127.0.0.1:4242/health')) return false;
        if (url.includes('localhost:4242/health')) return false;
        if (url.includes('127.0.0.1:4242/api/backend')) return false;
        if (method === 'OPTIONS') return false;
      }
      return true;
    });
    if (filteredEvents.length === 0) {
      return '<p class="bug-no-timeline">No relevant timeline events.</p>';
    }
    return filteredEvents.map((event) => {
      const timeStr = BugRecorder.formatRelativeTime(event.relativeTime);
      const icon = PointaReportDetails.getBugEventIcon(event);
      const description = PointaReportDetails.getBugEventDescription(event);
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

  // Get icon for bug event type
  getBugEventIcon(event) {
    switch (event.type) {
      case 'recording-start': return '🎬';
      case 'recording-end': return '⏹️';
      case 'user-interaction':
        if (event.subtype === 'click') return '🖱️';
        if (event.subtype === 'input') return '⌨️';
        if (event.subtype === 'keypress') return '🔤';
        return '👆';
      case 'network':
        if (event.subtype === 'failed') return '❌';
        return '✓';
      case 'console-error': return '🔴';
      case 'console-warning': return '⚠️';
      case 'console-log': return '💬';
      case 'backend-log': return '🖥️';
      case 'backend-warn': return '🖥️';
      case 'backend-error': return '🖥️';
      default: return '•';
    }
  },

  // Get description for bug event
  getBugEventDescription(event) {
    switch (event.type) {
      case 'recording-start':
        return 'Recording started';
      case 'recording-end':
        return 'Recording stopped';
      case 'user-interaction':
        if (event.subtype === 'click') {
          const elem = event.data.element;
          const desc = elem.textContent || elem.id || elem.tagName;
          return `Clicked "${PointaUtils.escapeHtml(desc.substring(0, 50))}"`;
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
        const truncUrl = PointaReportDetails.truncateUrl(event.data.url);
        if (event.subtype === 'failed') {
          return `${event.data.method} ${truncUrl} - Failed (${statusOrError})`;
        }
        return `${event.data.method} ${truncUrl} - ${event.data.status}`;
      case 'console-error':
        return PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100));
      case 'console-warning':
        return PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100));
      case 'console-log':
        return PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100));
      case 'backend-log':
        return `[Server] ${PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100))}`;
      case 'backend-warn':
        return `[Server ⚠️] ${PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100))}`;
      case 'backend-error':
        return `[Server ❌] ${PointaUtils.escapeHtml(PointaReportDetails.truncateText(event.data.message, 100))}`;
      default:
        return 'Event';
    }
  },

  // Get icon for bug issue type
  getBugIssueIcon(type) {
    switch (type) {
      case 'console-error': return '🔴';
      case 'network-failure': return '🌐';
      case 'backend-error': return '🖥️';
      default: return '⚠️';
    }
  },

  // Truncate URL for display
  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (path.length > 40) {
        return path.substring(0, 37) + '...';
      }
      return path || '/';
    } catch {
      if (url.length > 40) {
        return url.substring(0, 37) + '...';
      }
      return url;
    }
  },

  // Truncate text for display
  truncateText(text, maxLength) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }
};

window.PointaReportDetails = PointaReportDetails;
