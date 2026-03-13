/**
 * toolbar-panels.js
 *
 * Panel content builders for the floating toolbar.
 * Adapts sidebar-ui.js HTML builders to work in compact dropdown panels
 * (360px wide, max 480px tall).
 */

const ToolbarPanels = {

  // ─── Router ──────────────────────────────────────────────────────────

  /**
   * Build panel HTML by ID
   * @param {string} panelId - Panel identifier
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   * @returns {Promise<string>} HTML string
   */
  async buildPanel(panelId, pointa, toolbar) {
    switch (panelId) {
      case 'annotations':
        return await this.buildAnnotationsPanel(pointa, toolbar);
      case 'bug-report':
        return this.buildBugReportPanel(toolbar);
      case 'settings':
        return this.buildSettingsPanel(toolbar);
      default:
        return '';
    }
  },

  /**
   * Set up event listeners for the active panel
   * @param {string} panelId - Panel identifier
   * @param {HTMLElement} panelContainer - The panel DOM container
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   */
  setupPanelListeners(panelId, panelContainer, pointa, toolbar) {
    switch (panelId) {
      case 'annotations':
        this.setupAnnotationsPanelListeners(panelContainer, pointa, toolbar);
        break;
      case 'bug-report':
        this.setupBugReportPanelListeners(panelContainer, pointa, toolbar);
        break;
      case 'settings':
        this.setupSettingsPanelListeners(panelContainer, pointa, toolbar);
        break;
    }
  },

  // ─── Annotations Panel ───────────────────────────────────────────────

  /**
   * Build the annotations panel showing current-page annotations + page navigation
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   * @returns {Promise<string>} HTML string
   */
  async buildAnnotationsPanel(pointa, toolbar) {
    const annotations = pointa.annotations || [];
    const activeAnnotations = annotations.filter(a => a.status === 'pending' || !a.status);

    // Fetch all annotations for notification center / cross-page counts
    let allAnnotations = [];
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAnnotations',
        limit: 1000
      });
      allAnnotations = response.success ? response.annotations || [] : [];
    } catch (_) { /* ignore */ }

    const allToReviewAnnotations = allAnnotations.filter(a => a.status === 'in-review');
    const toReviewCount = allToReviewAnnotations.length;

    // Determine which annotations to render
    let annotationItemsHTML = '';

    if (toolbar.notificationCenterOpen) {
      // Group to-review annotations by page URL
      const pageGroups = new Map();
      allToReviewAnnotations.forEach(annotation => {
        const url = annotation.url || window.location.href;
        if (!pageGroups.has(url)) {
          pageGroups.set(url, []);
        }
        pageGroups.get(url).push(annotation);
      });

      if (pageGroups.size === 0) {
        annotationItemsHTML = '<div class="toolbar-panel-empty">No annotations to review</div>';
      } else {
        annotationItemsHTML = Array.from(pageGroups.entries()).map(([url, groupAnnotations]) => {
          let urlLabel;
          try {
            const urlObj = new URL(url);
            urlLabel = urlObj.pathname || '/';
          } catch (_) {
            urlLabel = url;
          }

          const itemsHTML = groupAnnotations.map((annotation, index) => {
            return this.buildAnnotationItemHTML(annotation, index, pointa, true);
          }).join('');

          return `
            <div class="toolbar-panel-page-group">
              <div class="toolbar-panel-page-group-header">${PointaUtils.escapeHtml(urlLabel)}</div>
              ${itemsHTML}
            </div>
          `;
        }).join('');
      }
    } else {
      // Normal mode: active annotations for current page
      if (activeAnnotations.length === 0) {
        annotationItemsHTML = '';
      } else {
        annotationItemsHTML = activeAnnotations.map((annotation, index) => {
          return this.buildAnnotationItemHTML(annotation, index, pointa, false);
        }).join('');
      }
    }

    // Sub-header for notification center mode
    let subHeaderHTML = '';
    if (toolbar.notificationCenterOpen) {
      subHeaderHTML = `
        <div class="toolbar-panel-subheader">
          <button id="toolbar-back-btn" class="toolbar-panel-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <span>To Review (${toReviewCount})</span>
          ${toReviewCount > 0 ? '<button id="toolbar-mark-all-done" class="toolbar-panel-action-btn">Mark all done</button>' : ''}
        </div>
      `;
    }

    // Fetch all bug/performance reports (cross-app, not page-specific)
    let reportsHTML = '';
    if (!toolbar.notificationCenterOpen) {
      try {
        const reportsResponse = await chrome.runtime.sendMessage({
          action: 'getBugReports',
          status: 'active'
        });
        const reports = reportsResponse.success ? reportsResponse.issueReports || [] : [];
        if (reports.length > 0) {
          const reportItems = reports.map((report, index) => {
            const isBug = report.type === 'bug' || !report.type;
            const typeLabel = isBug ? 'Bug' : 'Performance';
            const typeIcon = isBug
              ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
              : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>';
            const reportId = report.id || '';
            const shortId = reportId.length > 16 ? reportId.substring(0, 16) + '...' : reportId;
            const timestamp = report.created ? new Date(report.created).toLocaleDateString() : '';
            const prompt = isBug
              ? `Analyze and fix bug report ${reportId}`
              : `Analyze and fix performance report ${reportId}`;

            return `
              <div class="toolbar-panel-item toolbar-panel-report-item" data-report-id="${PointaUtils.escapeHtml(reportId)}" data-report-type="${isBug ? 'bug' : 'performance'}" data-report-prompt="${PointaUtils.escapeHtml(prompt)}">
                <div class="toolbar-panel-item-number">${typeIcon}</div>
                <div class="toolbar-panel-item-content">
                  <div class="toolbar-panel-item-preview">${PointaUtils.escapeHtml(shortId)}</div>
                  <div class="toolbar-panel-item-meta">
                    <span class="toolbar-panel-item-tag">${typeLabel}</span>
                    ${timestamp ? `<span class="toolbar-panel-item-date">${timestamp}</span>` : ''}
                  </div>
                </div>
                <div class="toolbar-panel-item-actions">
                  <button class="toolbar-panel-item-copy" data-report-prompt="${PointaUtils.escapeHtml(prompt)}" title="Copy prompt">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button class="toolbar-panel-item-delete" data-report-id="${PointaUtils.escapeHtml(reportId)}" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            `;
          }).join('');

          reportsHTML = `
            <div class="toolbar-panel-divider"></div>
            <div class="toolbar-panel-section-label">Reports</div>
            ${reportItems}
          `;
        }
      } catch (_) { /* ignore */ }
    }

    // Build page navigation section (other pages with annotations)
    let pageNavHTML = '';
    if (!toolbar.notificationCenterOpen) {
      const allActive = allAnnotations.filter(a => a.status === 'pending' || !a.status);
      const currentUrl = window.location.href;
      const pageGroups = new Map();
      allActive.forEach(annotation => {
        const url = annotation.url || currentUrl;
        if (!pageGroups.has(url)) {
          pageGroups.set(url, []);
        }
        pageGroups.get(url).push(annotation);
      });

      // Only show page nav if there are other pages
      const otherPages = Array.from(pageGroups.entries()).filter(([url]) => url !== currentUrl);
      if (otherPages.length > 0) {
        const pageItems = otherPages.map(([url, pageAnnotations]) => {
          let path, host;
          try {
            const urlObj = new URL(url);
            path = urlObj.pathname + (urlObj.hash || '') || '/';
            host = urlObj.host;
          } catch (_) {
            path = url;
            host = '';
          }

          return `
            <div class="toolbar-panel-page-item" data-page-url="${PointaUtils.escapeHtml(url)}">
              <div class="toolbar-panel-page-info">
                <div class="toolbar-panel-page-path">${PointaUtils.escapeHtml(path)}</div>
                <div class="toolbar-panel-page-host">${PointaUtils.escapeHtml(host)}</div>
              </div>
              <div class="toolbar-panel-page-badge">${pageAnnotations.length}</div>
            </div>
          `;
        }).join('');

        pageNavHTML = `
          <div class="toolbar-panel-divider"></div>
          <div class="toolbar-panel-section-label">Other Pages</div>
          ${pageItems}
        `;
      }
    }

    return `
      <div class="toolbar-panel-content" data-panel="annotations">
        <div class="toolbar-panel-header">
          <h3 class="toolbar-panel-title">Annotations</h3>
          <button class="toolbar-panel-header-btn ${toolbar.notificationCenterOpen ? 'active' : ''}" id="toolbar-notification-toggle" title="To Review">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            ${toReviewCount > 0 ? `<span class="toolbar-badge-inline">${toReviewCount}</span>` : ''}
          </button>
        </div>
        ${subHeaderHTML}
        <div class="toolbar-panel-list">
          ${annotationItemsHTML || '<div class="toolbar-panel-empty">No annotations on this page</div>'}
          ${reportsHTML}
          ${pageNavHTML}
        </div>
      </div>
    `;
  },

  /**
   * Build a single annotation item HTML
   * @param {Object} annotation - Annotation data
   * @param {number} index - Display index
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {boolean} isInReviewList - Whether shown in the notification center
   * @returns {string} HTML string
   */
  buildAnnotationItemHTML(annotation, index, pointa, isInReviewList) {
    const isDesign = annotation.type === 'design' || annotation.type === 'design-edit';
    const hasImages = annotation.reference_images && annotation.reference_images.length > 0;
    const isInReview = annotation.status === 'in-review';
    const hasPositionChange = isDesign && annotation.css_changes?.dom_position;

    // Check if the element still exists on the page
    const element = pointa.findElementBySelector(annotation);
    const elementMissing = !element && !isInReviewList;

    // Build preview text
    let preview;
    const hasComment = annotation.comment || (annotation.messages && annotation.messages.length > 0);
    const hasDesignChanges = annotation.css_changes && Object.keys(annotation.css_changes).length > 0;

    if (hasComment && hasDesignChanges) {
      // Hybrid annotation
      const messages = annotation.messages || (annotation.comment ? [{ text: annotation.comment }] : []);
      const latestMessage = messages.length > 0 ? messages[messages.length - 1].text : '';
      const commentPreview = PointaUtils.escapeHtml(latestMessage.substring(0, 60));
      const designPreview = this.getDesignPreview(annotation);

      preview = `
        <div class="toolbar-panel-hybrid-preview">
          <div class="toolbar-panel-hybrid-comment">${commentPreview}${latestMessage.length > 60 ? '...' : ''}</div>
          <div class="toolbar-panel-hybrid-design">${designPreview}</div>
        </div>
      `;
    } else if (isDesign) {
      preview = this.getDesignPreview(annotation);
    } else {
      const messages = annotation.messages || (annotation.comment ? [{ text: annotation.comment }] : []);
      const latestMessage = messages.length > 0 ? messages[messages.length - 1].text : 'No text';
      preview = PointaUtils.escapeHtml(latestMessage);
    }

    // Tags
    let tags = '';
    if (isDesign) tags += '<span class="toolbar-panel-item-tag">Design</span>';
    if (hasPositionChange) tags += '<span class="toolbar-panel-item-tag" title="Element position was changed">Position</span>';
    if (hasImages) tags += `<span class="toolbar-panel-item-tag" title="${annotation.reference_images.length} reference image${annotation.reference_images.length > 1 ? 's' : ''}">Ref ${annotation.reference_images.length}</span>`;
    if (elementMissing) tags += '<span class="toolbar-panel-item-warning" title="Element no longer exists on the page">Element removed</span>';

    // Action button
    const actionButton = isInReview
      ? `<button class="toolbar-panel-item-done" data-annotation-id="${annotation.id}" title="Mark done">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polyline points="20 6 9 17 4 12"></polyline>
           </svg>
         </button>`
      : `<button class="toolbar-panel-item-delete" data-annotation-id="${annotation.id}" title="Delete">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polyline points="3 6 5 6 21 6"></polyline>
             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
           </svg>
         </button>`;

    return `
      <div class="toolbar-panel-item" data-annotation-id="${annotation.id}" data-annotation-url="${annotation.url || ''}">
        <div class="toolbar-panel-item-number">${index + 1}</div>
        <div class="toolbar-panel-item-content">
          <div class="toolbar-panel-item-preview">${preview}</div>
          <div class="toolbar-panel-item-meta">
            ${tags}
            <span class="toolbar-panel-item-status ${annotation.status || 'pending'}">${annotation.status || 'pending'}</span>
          </div>
        </div>
        <div class="toolbar-panel-item-actions">
          <button class="toolbar-panel-item-copy" data-annotation-id="${annotation.id}" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          ${actionButton}
        </div>
      </div>
    `;
  },

  /**
   * Generate a human-readable preview for design-mode annotations
   * @param {Object} annotation - Annotation data
   * @returns {string} HTML preview with visual indicators
   */
  getDesignPreview(annotation) {
    const changes = annotation.css_changes || {};
    const changeCount = Object.keys(changes).length;

    if (changeCount === 0) {
      return '<span class="design-preview-empty">No changes</span>';
    }

    const getPropertyInfo = (property) => {
      if (['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'].includes(property)) {
        return { category: 'color', icon: '🎨' };
      }
      if (['padding', 'margin', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
        'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'gap'].includes(property)) {
        return { category: 'spacing', icon: '📏' };
      }
      if (['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform'].includes(property)) {
        return { category: 'typography', icon: '📝' };
      }
      if (['display', 'flexDirection', 'justifyContent', 'alignItems', 'position', 'width', 'height'].includes(property)) {
        return { category: 'layout', icon: '📐' };
      }
      if (['borderRadius', 'borderWidth', 'border', 'borderStyle'].includes(property)) {
        return { category: 'border', icon: '⬜' };
      }
      if (property === 'dom_position') {
        return { category: 'position', icon: '📍' };
      }
      if (property === 'textContent') {
        return { category: 'text', icon: '✏️' };
      }
      return { category: 'other', icon: '✨' };
    };

    const formatPropertyName = (property) => {
      if (property === 'dom_position') return 'Position';
      if (property === 'textContent') return 'Text';
      return property.replace(/([A-Z])/g, ' $1').toLowerCase();
    };

    const formatValue = (value) => {
      if (typeof value === 'object' && value !== null) {
        if (value.new !== undefined) return value.new;
        if (value.value !== undefined) return value.value;
        return JSON.stringify(value).substring(0, 20);
      }
      return String(value);
    };

    const isColorValue = (value) => {
      const str = String(value);
      return str.startsWith('#') || str.startsWith('rgb') || str.startsWith('hsl') ||
        ['red', 'blue', 'green', 'white', 'black', 'yellow', 'purple', 'orange'].includes(str.toLowerCase());
    };

    const previewItems = [];
    const entries = Object.entries(changes);
    const maxVisible = 3;

    for (let i = 0; i < Math.min(maxVisible, entries.length); i++) {
      const [property, value] = entries[i];
      const info = getPropertyInfo(property);
      const propName = formatPropertyName(property);
      const displayValue = formatValue(value);

      let itemHTML = '';

      if (info.category === 'color' && isColorValue(displayValue)) {
        itemHTML = `
          <div class="design-preview-item design-preview-color">
            <span class="design-preview-icon">${info.icon}</span>
            <span class="design-preview-label">${propName}</span>
            <span class="design-preview-swatch" style="background-color: ${displayValue};" title="${displayValue}"></span>
          </div>
        `;
      } else if (property === 'dom_position') {
        itemHTML = `
          <div class="design-preview-item design-preview-position">
            <span class="design-preview-icon">${info.icon}</span>
            <span class="design-preview-label">Moved element</span>
          </div>
        `;
      } else if (property === 'textContent') {
        const truncated = displayValue.length > 30 ? displayValue.substring(0, 27) + '...' : displayValue;
        itemHTML = `
          <div class="design-preview-item design-preview-text">
            <span class="design-preview-icon">${info.icon}</span>
            <span class="design-preview-label">Text</span>
            <span class="design-preview-value">"${PointaUtils.escapeHtml(truncated)}"</span>
          </div>
        `;
      } else {
        const truncated = displayValue.length > 20 ? displayValue.substring(0, 17) + '...' : displayValue;
        itemHTML = `
          <div class="design-preview-item">
            <span class="design-preview-icon">${info.icon}</span>
            <span class="design-preview-label">${propName}</span>
            <span class="design-preview-value">${PointaUtils.escapeHtml(truncated)}</span>
          </div>
        `;
      }

      previewItems.push(itemHTML);
    }

    const remainingCount = changeCount - maxVisible;
    if (remainingCount > 0) {
      previewItems.push(`
        <div class="design-preview-item design-preview-more">
          <span class="design-preview-more-count">+${remainingCount} more</span>
        </div>
      `);
    }

    return `<div class="design-preview-container">${previewItems.join('')}</div>`;
  },

  // ─── Bug Report Panel ────────────────────────────────────────────────

  /**
   * Build the bug report panel
   * @param {Object} toolbar - Reference to PointaToolbar
   * @returns {string} HTML string
   */
  buildBugReportPanel(toolbar) {
    // Bug report intro (after selecting bug type)
    if (toolbar.currentView === 'bug-report') {
      return `
        <div class="toolbar-panel-content" data-panel="bug-report">
          <div class="toolbar-panel-header">
            <button id="toolbar-bug-back-btn" class="toolbar-panel-back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h3 class="toolbar-panel-title">Bug Report</h3>
          </div>
          <div class="toolbar-panel-body">
            <p class="toolbar-panel-desc">Record your bug in action:</p>
            <ul class="toolbar-panel-feature-list">
              <li>🎬 Console errors & warnings</li>
              <li>🌐 Network requests & failures</li>
              <li>🖱️ Clicks & interactions</li>
              <li>📸 Page screenshot</li>
            </ul>
            <div class="toolbar-panel-toggle-row" id="toolbar-backend-logs-section">
              <span>🔧 Backend logs</span>
              <label class="toolbar-panel-toggle">
                <input type="checkbox" id="toolbar-backend-logs-toggle">
                <span class="toolbar-panel-toggle-slider"></span>
              </label>
            </div>
            <div id="toolbar-backend-logs-status" class="toolbar-panel-hint">Checking...</div>
            <div id="toolbar-backend-logs-help" class="toolbar-panel-backend-help" style="display: none;">
              <p class="toolbar-panel-hint">Run your dev server with Pointa to capture backend logs:</p>
              <div class="toolbar-panel-command-row">
                <code class="toolbar-panel-command">pointa-server dev npm run dev</code>
                <button class="toolbar-panel-copy-cmd" id="toolbar-copy-backend-cmd" title="Copy command">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <p class="toolbar-panel-hint" style="margin-top: 4px;">Works with any Node.js command: <code>npm run dev</code>, <code>yarn dev</code>, <code>node server.js</code>, etc.</p>
            </div>
            <button id="toolbar-start-recording-btn" class="toolbar-panel-primary-btn">
              Start Recording
            </button>
          </div>
        </div>
      `;
    }

    // Default: issue type selector
    return `
      <div class="toolbar-panel-content" data-panel="bug-report">
        <div class="toolbar-panel-header">
          <h3 class="toolbar-panel-title">Report Issue</h3>
        </div>
        <div class="toolbar-panel-list">
          <button class="toolbar-panel-option" id="toolbar-issue-type-bug">
            <span class="toolbar-panel-option-icon">🐛</span>
            <div>
              <div class="toolbar-panel-option-title">Bug Report</div>
              <div class="toolbar-panel-option-desc">Report an error or broken feature</div>
            </div>
          </button>
          <button class="toolbar-panel-option" id="toolbar-issue-type-performance">
            <span class="toolbar-panel-option-icon">⚡</span>
            <div>
              <div class="toolbar-panel-option-title">Performance</div>
              <div class="toolbar-panel-option-desc">Report slowness or performance issues</div>
            </div>
          </button>
        </div>
      </div>
    `;
  },

  // ─── Settings Panel ──────────────────────────────────────────────────

  /**
   * Build the settings panel
   * @param {Object} toolbar - Reference to PointaToolbar
   * @returns {string} HTML string
   */
  buildSettingsPanel(toolbar) {
    const serverOnline = toolbar?.serverOnline || false;

    return `
      <div class="toolbar-panel-content" data-panel="settings">
        <div class="toolbar-panel-header">
          <h3 class="toolbar-panel-title">Settings</h3>
        </div>
        <div class="toolbar-panel-body">
          <div class="toolbar-panel-setting-group">
            <label class="toolbar-panel-setting-label">Theme</label>
            <div class="toolbar-theme-toggle-row">
              <svg class="toolbar-theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <label class="toolbar-panel-toggle">
                <input type="checkbox" id="toolbar-dark-mode-toggle">
                <span class="toolbar-panel-toggle-slider"></span>
              </label>
              <svg class="toolbar-theme-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </div>
          </div>

          <div class="toolbar-panel-setting-group">
            <label class="toolbar-panel-setting-label">Get Started</label>
            <button id="toolbar-setup-guide-btn" class="toolbar-panel-nav-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2"/>
                <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>
              </svg>
              <span>See how it works</span>
              <svg class="toolbar-panel-nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <button id="toolbar-docs-btn" class="toolbar-panel-nav-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>Documentation</span>
              <svg class="toolbar-panel-nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          <div class="toolbar-panel-setting-group">
            <label class="toolbar-panel-setting-label">Linear Integration</label>
            <div class="toolbar-panel-toggle-row">
              <span>Enable Linear Sync</span>
              <label class="toolbar-panel-toggle">
                <input type="checkbox" id="toolbar-linear-enabled-toggle">
                <span class="toolbar-panel-toggle-slider"></span>
              </label>
            </div>
            <div id="toolbar-linear-config" style="display: none; margin-top: 8px;">
              <input type="password" id="toolbar-linear-api-key" class="toolbar-panel-input" placeholder="Linear API key">
              <button id="toolbar-linear-save-btn" class="toolbar-panel-secondary-btn" style="margin-top: 4px;">Save</button>
              <div id="toolbar-linear-status" class="toolbar-panel-hint" style="display: none;"></div>
            </div>
          </div>

          <div class="toolbar-panel-setting-group">
            <div class="toolbar-panel-server-status">
              <div class="toolbar-status-dot-inline ${serverOnline ? 'online' : 'offline'}"></div>
              <span>MCP Server ${serverOnline ? 'Connected' : 'Offline'}</span>
            </div>
            ${!serverOnline ? `
              <div class="toolbar-panel-server-help">
                <p class="toolbar-panel-hint">Start the server to enable annotations:</p>
                <div class="toolbar-panel-command-row">
                  <code class="toolbar-panel-command">pointa-server start</code>
                  <button class="toolbar-panel-copy-cmd" id="toolbar-copy-server-cmd" title="Copy command">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                <p class="toolbar-panel-hint" style="margin-top: 4px;">First time? Run: <code>npm i -g pointa-server</code></p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  // ─── Listener Setup ──────────────────────────────────────────────────

  /**
   * Set up listeners for the annotations panel
   * @param {HTMLElement} panel - Panel container element
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   */
  setupAnnotationsPanelListeners(panel, pointa, toolbar) {
    // Click on annotation item (navigate to element)
    panel.querySelectorAll('.toolbar-panel-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Ignore clicks on action buttons
        if (e.target.closest('.toolbar-panel-item-actions')) return;

        const annotationId = item.dataset.annotationId;
        const annotationUrl = item.dataset.annotationUrl;
        const annotations = pointa.annotations || [];
        const annotation = annotations.find(a => a.id === annotationId);

        if (annotation) {
          // Navigate to the annotation element on the current page
          // Close editors/widgets first to prevent UI conflicts
          if (pointa.currentDesignEditor) {
            pointa.closeDesignEditor();
          }
          const existingWidget = document.querySelector('.pointa-inline-widget');
          if (existingWidget) {
            pointa.closeInlineCommentWidget();
          }

          const element = pointa.findElementBySelector(annotation);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash the badge to highlight
            const badge = document.querySelector(`.pointa-badge[data-annotation-id="${annotation.id}"]`);
            if (badge) {
              badge.classList.add('sidebar-hover-highlight');
              setTimeout(() => badge.classList.remove('sidebar-hover-highlight'), 1500);
            }
          }
          toolbar.closePanel();
        } else if (annotationUrl) {
          // Annotation is on a different page - navigate there
          await chrome.storage.local.set({ reopenToolbar: true });
          window.location.href = annotationUrl;
        }
      });
    });

    // Copy buttons
    panel.querySelectorAll('.toolbar-panel-item-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const annotationId = btn.dataset.annotationId;
        await this.copyAnnotationToClipboard(annotationId, pointa);
      });
    });

    // Delete buttons — with inline "Delete? Yes / No" confirmation
    panel.querySelectorAll('.toolbar-panel-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const annotationId = btn.dataset.annotationId;

        // Remove any existing confirmation
        const existing = panel.querySelector('.toolbar-delete-confirm');
        if (existing) existing.remove();

        // Create confirmation row
        const confirm = document.createElement('div');
        confirm.className = 'toolbar-delete-confirm';
        confirm.innerHTML = `
          <span class="toolbar-delete-confirm-text">Delete?</span>
          <button class="toolbar-delete-confirm-yes" data-annotation-id="${annotationId}">Yes</button>
          <button class="toolbar-delete-confirm-no">No</button>
        `;

        // Insert after the item's actions
        const item = btn.closest('.toolbar-panel-item');
        if (item) {
          item.appendChild(confirm);
        }

        // Yes button
        confirm.querySelector('.toolbar-delete-confirm-yes').addEventListener('click', async (ev) => {
          ev.stopPropagation();
          await chrome.runtime.sendMessage({
            action: 'deleteAnnotation',
            id: annotationId
          });
          if (pointa.loadAnnotations) {
            await pointa.loadAnnotations();
          }
          await toolbar.openPanel('annotations', pointa);
        });

        // No button
        confirm.querySelector('.toolbar-delete-confirm-no').addEventListener('click', (ev) => {
          ev.stopPropagation();
          confirm.remove();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          if (confirm.parentNode) confirm.remove();
        }, 5000);
      });
    });

    // Done buttons (mark in-review as done)
    panel.querySelectorAll('.toolbar-panel-item-done').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const annotationId = btn.dataset.annotationId;

        await chrome.runtime.sendMessage({
          action: 'updateAnnotationStatus',
          id: annotationId,
          status: 'done'
        });

        // Refresh and rebuild panel
        if (pointa.loadAnnotations) {
          await pointa.loadAnnotations();
        }
        await toolbar.openPanel('annotations', pointa);
      });
    });

    // Notification center toggle
    const notifToggle = panel.querySelector('#toolbar-notification-toggle');
    if (notifToggle) {
      notifToggle.addEventListener('click', async () => {
        toolbar.notificationCenterOpen = !toolbar.notificationCenterOpen;
        await toolbar.openPanel('annotations', pointa);
      });
    }

    // Back button (from notification center)
    const backBtn = panel.querySelector('#toolbar-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        toolbar.notificationCenterOpen = false;
        await toolbar.openPanel('annotations', pointa);
      });
    }

    // Mark all done button
    const markAllDone = panel.querySelector('#toolbar-mark-all-done');
    if (markAllDone) {
      markAllDone.addEventListener('click', async () => {
        // Get all to-review annotations and mark them done
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'getAnnotations',
            limit: 1000
          });
          const allAnnotations = response.success ? response.annotations || [] : [];
          const toReview = allAnnotations.filter(a => a.status === 'in-review');

          for (const annotation of toReview) {
            await chrome.runtime.sendMessage({
              action: 'updateAnnotationStatus',
              id: annotation.id,
              status: 'done'
            });
          }
        } catch (_) { /* ignore */ }

        // Refresh and rebuild panel
        if (pointa.loadAnnotations) {
          await pointa.loadAnnotations();
        }
        toolbar.notificationCenterOpen = false;
        await toolbar.openPanel('annotations', pointa);
      });
    }

    // Report item click → open report detail modal
    panel.querySelectorAll('.toolbar-panel-report-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Ignore clicks on action buttons
        if (e.target.closest('.toolbar-panel-item-actions')) return;

        const reportId = item.dataset.reportId;
        const reportType = item.dataset.reportType;
        if (!reportId) return;

        toolbar.closePanel();

        if (reportType === 'performance' && window.PointaReportDetails) {
          await PointaReportDetails.showPerformanceReportDetails(reportId);
        } else if (window.PointaReportDetails) {
          await PointaReportDetails.showBugReportDetails(reportId);
        }
      });
    });

    // Report copy buttons (uses same class as annotation copy)
    panel.querySelectorAll('.toolbar-panel-report-item .toolbar-panel-item-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const prompt = btn.dataset.reportPrompt;
        if (!prompt) return;
        try {
          await navigator.clipboard.writeText(prompt);
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          btn.style.color = '#10b981';
          setTimeout(() => {
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            btn.style.color = '';
          }, 2000);
        } catch (_) { /* ignore */ }
      });
    });

    // Report delete buttons (uses same class as annotation delete)
    panel.querySelectorAll('.toolbar-panel-report-item .toolbar-panel-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const reportId = btn.dataset.reportId;
        if (!reportId) return;
        try {
          await chrome.runtime.sendMessage({
            action: 'deleteBugReport',
            id: reportId
          });
          // Refresh panel
          await toolbar.openPanel('annotations', pointa);
        } catch (_) { /* ignore */ }
      });
    });

    // Page navigation items (merged from "More" panel)
    panel.querySelectorAll('.toolbar-panel-page-item').forEach(item => {
      item.addEventListener('click', async () => {
        const url = item.dataset.pageUrl;
        if (!url) return;

        // Set flag to reopen toolbar after navigation
        await chrome.storage.local.set({ reopenToolbar: true });
        window.location.href = url;
      });
    });
  },

  /**
   * Set up listeners for the bug report panel
   * @param {HTMLElement} panel - Panel container element
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   */
  setupBugReportPanelListeners(panel, pointa, toolbar) {
    // Issue type: Bug
    const bugTypeBtn = panel.querySelector('#toolbar-issue-type-bug');
    if (bugTypeBtn) {
      bugTypeBtn.addEventListener('click', async () => {
        toolbar.currentView = 'bug-report';
        await toolbar.openPanel('bug-report', pointa);
      });
    }

    // Issue type: Performance
    const perfTypeBtn = panel.querySelector('#toolbar-issue-type-performance');
    if (perfTypeBtn) {
      perfTypeBtn.addEventListener('click', async () => {
        toolbar.currentView = 'performance';
        toolbar.isRecordingBug = true;
        toolbar.closePanel();

        // Use the full flow that shows recording indicator + starts recording
        await pointa.startPerformanceInvestigation();
      });
    }

    // Back button (from bug report intro)
    const bugBackBtn = panel.querySelector('#toolbar-bug-back-btn');
    if (bugBackBtn) {
      bugBackBtn.addEventListener('click', async () => {
        toolbar.currentView = null;
        await toolbar.openPanel('bug-report', pointa);
      });
    }

    // Start recording button
    const startRecordingBtn = panel.querySelector('#toolbar-start-recording-btn');
    if (startRecordingBtn) {
      startRecordingBtn.addEventListener('click', async () => {
        toolbar.isRecordingBug = true;

        // Persist recording state so it survives page navigation
        chrome.storage.local.set({
          bugRecordingActive: true,
          bugRecordingStartTime: Date.now()
        });

        // Close the panel and show the full-screen recording indicator
        toolbar.closePanel();

        // Use the same recording indicator as the sidebar (red border, timer, stop button)
        await pointa.startBugReporting();
      });
    }

    // Backend logs toggle
    const backendToggle = panel.querySelector('#toolbar-backend-logs-toggle');
    const statusEl = panel.querySelector('#toolbar-backend-logs-status');

    if (backendToggle && statusEl) {
      // Check backend logs availability
      this.checkBackendLogsStatus(backendToggle, statusEl);

      backendToggle.addEventListener('change', () => {
        if (window.BugRecorder) {
          BugRecorder.includeBackendLogs = backendToggle.checked;
        }
      });
    }

    // Copy backend command button
    const copyBackendCmd = panel.querySelector('#toolbar-copy-backend-cmd');
    if (copyBackendCmd) {
      copyBackendCmd.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText('pointa-server dev npm run dev');
          copyBackendCmd.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(() => {
            copyBackendCmd.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }, 2000);
        } catch (_) { /* ignore */ }
      });
    }

  },

  /**
   * Check backend logs availability and update UI
   * @param {HTMLInputElement} toggle - Checkbox toggle
   * @param {HTMLElement} statusEl - Status text element
   */
  async checkBackendLogsStatus(toggle, statusEl) {
    const helpEl = statusEl.parentElement?.querySelector('#toolbar-backend-logs-help');
    const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getBackendLogStatus',
        port: currentPort
      });

      if (response.success && response.status?.connected) {
        statusEl.innerHTML = '<span style="color: #10b981;">✓</span> Backend logs ready';
        statusEl.className = 'toolbar-panel-hint success';
        toggle.disabled = false;
        toggle.checked = window.BugRecorder?.includeBackendLogs || false;
        if (helpEl) helpEl.style.display = 'none';
      } else {
        statusEl.innerHTML = 'Not available — run <code>pointa-server dev</code>';
        statusEl.className = 'toolbar-panel-hint';
        toggle.disabled = true;
        toggle.checked = false;
        if (helpEl) helpEl.style.display = 'block';
      }
    } catch (_) {
      statusEl.textContent = 'Server not connected';
      statusEl.className = 'toolbar-panel-hint';
      toggle.disabled = true;
      toggle.checked = false;
      if (helpEl) helpEl.style.display = 'block';
    }
  },

  /**
   * Set up listeners for the settings panel
   * @param {HTMLElement} panel - Panel container element
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @param {Object} toolbar - Reference to PointaToolbar
   */
  setupSettingsPanelListeners(panel, pointa, toolbar) {
    // Load current settings values
    this.loadSettingsValues(panel);

    // Dark mode toggle
    const darkModeToggle = panel.querySelector('#toolbar-dark-mode-toggle');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', () => {
        const value = darkModeToggle.checked ? 'dark' : 'light';
        chrome.storage.local.set({ themePreference: value });

        if (typeof PointaThemeManager !== 'undefined') {
          PointaThemeManager.apply(value);
        }

        // Update theme attribute on wrapper (parent of both pill and panel)
        if (toolbar.toolbar) {
          const wrapper = toolbar.toolbar.closest('.toolbar-wrapper');
          if (wrapper) {
            wrapper.setAttribute('data-pointa-theme', value);
          }
        }
      });
    }

    // Linear enabled toggle
    const linearToggle = panel.querySelector('#toolbar-linear-enabled-toggle');
    const linearConfig = panel.querySelector('#toolbar-linear-config');
    if (linearToggle && linearConfig) {
      linearToggle.addEventListener('change', () => {
        const enabled = linearToggle.checked;
        chrome.storage.local.set({ linearEnabled: enabled });
        linearConfig.style.display = enabled ? 'block' : 'none';
      });
    }

    // Linear save button
    const linearSaveBtn = panel.querySelector('#toolbar-linear-save-btn');
    if (linearSaveBtn) {
      linearSaveBtn.addEventListener('click', async () => {
        const apiKeyInput = panel.querySelector('#toolbar-linear-api-key');
        const statusEl = panel.querySelector('#toolbar-linear-status');
        if (!apiKeyInput) return;

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
          if (statusEl) {
            statusEl.textContent = 'Please enter an API key';
            statusEl.style.display = 'block';
          }
          return;
        }

        // Save via background script
        try {
          await chrome.runtime.sendMessage({
            action: 'saveLinearApiKey',
            apiKey: apiKey
          });

          if (statusEl) {
            statusEl.textContent = 'API key saved';
            statusEl.className = 'toolbar-panel-hint success';
            statusEl.style.display = 'block';
          }
        } catch (error) {
          if (statusEl) {
            statusEl.textContent = 'Failed to save API key';
            statusEl.className = 'toolbar-panel-hint';
            statusEl.style.display = 'block';
          }
        }
      });
    }

    // "See how it works" — trigger onboarding overlay
    const setupGuideBtn = panel.querySelector('#toolbar-setup-guide-btn');
    if (setupGuideBtn) {
      setupGuideBtn.addEventListener('click', () => {
        toolbar.closePanel();
        if (window.VibeOnboarding) {
          window.VibeOnboarding.show();
        }
      });
    }

    // Documentation — open GitHub repo
    const docsBtn = panel.querySelector('#toolbar-docs-btn');
    if (docsBtn) {
      docsBtn.addEventListener('click', () => {
        window.open('https://github.com/pointa-app/pointa', '_blank');
      });
    }

    // Copy server command button
    const copyCmdBtn = panel.querySelector('#toolbar-copy-server-cmd');
    if (copyCmdBtn) {
      copyCmdBtn.addEventListener('click', async () => {
        if (typeof PointaUtils !== 'undefined' && PointaUtils.copyToClipboard) {
          await PointaUtils.copyToClipboard('pointa-server start', 'Command copied! Paste in your terminal.');
        } else {
          await navigator.clipboard.writeText('pointa-server start');
        }
        // Visual feedback
        copyCmdBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        setTimeout(() => {
          copyCmdBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 2000);
      });
    }
  },

  /**
   * Load current settings values into the panel controls
   * @param {HTMLElement} panel - Panel container element
   */
  async loadSettingsValues(panel) {
    try {
      const result = await chrome.storage.local.get([
        'themePreference',
        'linearEnabled'
      ]);

      // Theme (dark mode toggle)
      const darkModeToggle = panel.querySelector('#toolbar-dark-mode-toggle');
      if (darkModeToggle) {
        darkModeToggle.checked = (result.themePreference === 'dark') || (!result.themePreference);
      }

      // Linear
      const linearToggle = panel.querySelector('#toolbar-linear-enabled-toggle');
      const linearConfig = panel.querySelector('#toolbar-linear-config');
      if (linearToggle) {
        linearToggle.checked = result.linearEnabled || false;
        if (linearConfig) {
          linearConfig.style.display = result.linearEnabled ? 'block' : 'none';
        }
      }
    } catch (_) { /* ignore storage errors */ }
  },

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Copy an annotation reference to the clipboard
   * @param {string} annotationId - ID of the annotation
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async copyAnnotationToClipboard(annotationId, pointa) {
    const annotations = pointa.annotations || [];
    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return;

    // Use shared utility if available, otherwise format inline
    const text = (typeof PointaUtils !== 'undefined' && PointaUtils.formatAnnotationForClipboard)
      ? PointaUtils.formatAnnotationForClipboard(annotation)
      : this.formatAnnotationForClipboard(annotation);

    if (typeof PointaUtils !== 'undefined' && PointaUtils.copyToClipboard) {
      await PointaUtils.copyToClipboard(text, 'Annotation reference copied! Paste into your AI coding tool.');
    } else {
      await navigator.clipboard.writeText(text);
    }
  },

  /**
   * Fallback annotation clipboard format
   * @param {Object} annotation - Annotation data
   * @returns {string} Formatted clipboard text
   */
  formatAnnotationForClipboard(annotation) {
    const messages = annotation.messages || (annotation.comment ? [{ text: annotation.comment }] : []);
    let text = `Please address this annotation:\n\n`;
    text += `Annotation ID: ${annotation.id}\n`;

    if (messages.length > 0) {
      text += `Latest comment: ${messages[messages.length - 1].text}\n`;
    }

    text += `\nUse the Pointa MCP tools to get full context:\n`;
    text += `- read_annotation_by_id(id: "${annotation.id}")\n`;

    return text;
  },
};

window.ToolbarPanels = ToolbarPanels;
