/**
 * floating-toolbar.js
 *
 * Core floating toolbar for Pointa Chrome extension.
 * Replaces the sidebar with a small floating pill-shaped toolbar on localhost pages.
 * Uses Shadow DOM for CSS isolation.
 */

const PointaToolbar = {
  shadowHost: null,
  shadowRoot: null,
  toolbar: null,
  panelContainer: null,
  activePanel: null,
  isVisible: false,
  serverOnline: false,
  statusPollInterval: null,
  notificationCenterOpen: false,
  isRecordingBug: false,
  currentView: null,
  storageListener: null,
  clickOutsideHandler: null,
  _closePanelTimeout: null,

  /**
   * Toggle toolbar visibility
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async toggle(pointa) {
    if (this.isVisible) {
      this.hide(pointa);
    } else {
      await this.show(pointa);
    }
  },

  /**
   * Show the floating toolbar
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async show(pointa) {
    // Check server status
    const isLocalhost = PointaUtils.isLocalhostUrl();
    const serverOnline = isLocalhost
      ? await this.checkServerStatus()
      : (await pointa.checkAPIStatus()).connected;
    this.serverOnline = serverOnline;

    // Create shadow host
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'pointa-toolbar-host';

    // Load saved position or use default
    const pos = await ToolbarDrag.loadPosition() || ToolbarDrag.getDefaultPosition();

    this.shadowHost.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      left: ${pos.x}px;
      top: ${pos.y}px;
    `;

    // Attach shadow root
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    // Inject styles into shadow root
    await this.injectShadowStyles();

    // Create toolbar element
    this.toolbar = document.createElement('div');
    this.toolbar.innerHTML = this.buildToolbarHTML(pointa);

    // Create panel container
    this.panelContainer = document.createElement('div');
    this.panelContainer.className = 'toolbar-panel';

    // Create wrapper with pointer-events restored
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-wrapper';
    wrapper.style.pointerEvents = 'auto';
    wrapper.setAttribute('data-pointa-theme', PointaThemeManager.getEffective());

    wrapper.appendChild(this.toolbar.firstElementChild);
    // Re-assign toolbar to the actual pill element inside the wrapper
    this.toolbar = wrapper.querySelector('.toolbar-pill');
    wrapper.appendChild(this.panelContainer);

    this.shadowRoot.appendChild(wrapper);
    document.body.appendChild(this.shadowHost);

    // Initialize drag behavior
    ToolbarDrag.init(this.toolbar, this.shadowHost);

    // Setup event listeners
    this.setupEventListeners(pointa);
    this.setupClickOutsideHandler();
    this.setupStorageListener(pointa);
    this.startStatusPolling(pointa);

    // Fade in animation
    wrapper.style.opacity = '0';
    wrapper.style.transition = 'opacity 0.2s ease-in-out';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wrapper.style.opacity = '1';
      });
    });

    this.isVisible = true;

    // Persist visibility so toolbar survives page reloads
    chrome.storage.local.set({ toolbarVisible: true });

    // Update badges
    this.updateBadges(pointa);
  },

  /**
   * Hide the floating toolbar
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  hide(pointa) {
    // Stop status polling
    this.stopStatusPolling();

    // Remove storage listener
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }

    // Remove click-outside handler
    if (this.clickOutsideHandler) {
      document.removeEventListener('mousedown', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }

    // Cancel any pending panel close timeout
    if (this._closePanelTimeout) {
      clearTimeout(this._closePanelTimeout);
      this._closePanelTimeout = null;
    }

    // Destroy drag
    ToolbarDrag.destroy();

    // Fade out then remove
    if (this.shadowHost) {
      const wrapper = this.shadowRoot?.querySelector('.toolbar-wrapper');
      if (wrapper) {
        wrapper.style.transition = 'opacity 0.15s ease-in-out';
        wrapper.style.opacity = '0';
        setTimeout(() => {
          if (this.shadowHost && this.shadowHost.parentNode) {
            this.shadowHost.parentNode.removeChild(this.shadowHost);
          }
          this.shadowHost = null;
          this.shadowRoot = null;
          this.toolbar = null;
          this.panelContainer = null;
          this.activePanel = null;
        }, 150);
      } else {
        if (this.shadowHost.parentNode) {
          this.shadowHost.parentNode.removeChild(this.shadowHost);
        }
        this.shadowHost = null;
        this.shadowRoot = null;
        this.toolbar = null;
        this.panelContainer = null;
        this.activePanel = null;
      }
    }

    this.isVisible = false;
    this.serverOnline = false;
    this.notificationCenterOpen = false;
    this.isRecordingBug = false;
    this.currentView = null;

    // Clear persistence so toolbar stays hidden after user dismissed it
    chrome.storage.local.remove(['toolbarVisible']);
  },

  /**
   * Build the toolbar pill HTML
   * @param {Pointa} pointa - Reference to main Pointa instance
   * @returns {string} HTML string
   */
  buildToolbarHTML(pointa) {
    const theme = PointaThemeManager.getEffective();
    const statusClass = this.serverOnline ? 'online' : 'offline';
    const statusTitle = this.serverOnline ? 'Server online' : 'Server offline';

    return `
      <div class="toolbar-pill" data-pointa-theme="${theme}">
        <div class="toolbar-drag-handle toolbar-btn" title="Pointa">
          <img src="${chrome.runtime.getURL('assets/icons/pointa-icon128.png')}" alt="Pointa" class="toolbar-logo" />
        </div>
        <button class="toolbar-btn" data-action="annotate" title="Annotate">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M28 16c0 6.627-5.373 12-12 12-1.94 0-3.771-.461-5.393-1.28L4 28l1.28-6.607C4.461 19.771 4 17.94 4 16 4 9.373 9.373 4 16 4s12 5.373 12 12z" fill="currentColor"/>
          </svg>
        </button>
        <button class="toolbar-btn" data-panel="annotations" title="Annotations">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
          <span class="toolbar-badge" id="toolbar-annotation-badge" style="display:none;"></span>
        </button>
        <button class="toolbar-btn" data-panel="bug-report" title="Report Issue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 2v4M16 2v4M9 9h6M9 13h6M9 17h6M3 9l1.5-1.5M3 21l1.5-1.5M21 9l-1.5-1.5M21 21l-1.5-1.5M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
          </svg>
        </button>
        <button class="toolbar-btn" data-action="copy-all" title="Copy All Annotations">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="toolbar-btn" data-panel="settings" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <div class="toolbar-status-dot ${statusClass}" title="${statusTitle}"></div>
      </div>
    `;
  },

  /**
   * Setup event listeners using event delegation on the toolbar
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  setupEventListeners(pointa) {
    if (!this.toolbar) return;

    this.toolbar.addEventListener('click', async (e) => {
      // Check if this was a drag — ignore clicks after drags
      if (ToolbarDrag.wasDrag) {
        ToolbarDrag.wasDrag = false;
        return;
      }

      // Find the closest actionable element
      const actionBtn = e.target.closest('[data-action]');
      const panelBtn = e.target.closest('[data-panel]');

      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'annotate') {
          this.closePanel();
          PointaAnnotationMode.startAnnotationMode(pointa);
        } else if (action === 'copy-all') {
          // Deactivate annotation mode if active
          if (pointa.isAnnotationMode) {
            pointa.stopAnnotationMode();
          }
          this.closePanel();
          await this.copyAllAnnotations(pointa);
        }
      } else if (panelBtn) {
        // Deactivate annotation mode if active
        if (pointa.isAnnotationMode) {
          pointa.stopAnnotationMode();
        }
        this.togglePanel(panelBtn.dataset.panel, pointa);
      }
    });
  },

  /**
   * Setup click-outside handler to close panels
   */
  setupClickOutsideHandler() {
    this.clickOutsideHandler = (event) => {
      if (!this.activePanel) return;

      const path = event.composedPath();
      if (!path.includes(this.shadowHost)) {
        this.closePanel();
      }
    };

    document.addEventListener('mousedown', this.clickOutsideHandler);
  },

  /**
   * Toggle a panel open/closed
   * @param {string} panelId - Panel identifier
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  togglePanel(panelId, pointa) {
    if (this.activePanel === panelId) {
      this.closePanel();
    } else {
      this.openPanel(panelId, pointa);
    }
  },

  /**
   * Open a panel by ID
   * @param {string} panelId - Panel identifier
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async openPanel(panelId, pointa) {
    // Cancel any pending close animation clear to prevent race condition
    if (this._closePanelTimeout) {
      clearTimeout(this._closePanelTimeout);
      this._closePanelTimeout = null;
    }

    // Reset previous panel state immediately (no animation when switching)
    if (this.activePanel) {
      this.panelContainer.classList.remove('visible');
      this.panelContainer.innerHTML = '';
      this.activePanel = null;
    }

    // Build panel content
    const html = await ToolbarPanels.buildPanel(panelId, pointa, this);
    this.panelContainer.innerHTML = html;

    // Show the panel
    this.panelContainer.classList.add('visible');

    // Setup panel-specific listeners
    ToolbarPanels.setupPanelListeners(panelId, this.panelContainer, pointa, this);

    this.activePanel = panelId;

    // Update active button state
    const btns = this.toolbar.querySelectorAll('.toolbar-btn');
    btns.forEach((btn) => {
      if (btn.dataset.panel === panelId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  /**
   * Close the currently open panel
   */
  closePanel() {
    if (!this.activePanel) return;

    this.panelContainer.classList.remove('visible');

    // Cancel any existing close timeout
    if (this._closePanelTimeout) {
      clearTimeout(this._closePanelTimeout);
    }

    // Clear content after animation
    this._closePanelTimeout = setTimeout(() => {
      if (this.panelContainer && !this.activePanel) {
        this.panelContainer.innerHTML = '';
      }
      this._closePanelTimeout = null;
    }, 150);

    this.activePanel = null;

    // Remove active class from all toolbar buttons
    if (this.toolbar) {
      const btns = this.toolbar.querySelectorAll('.toolbar-btn');
      btns.forEach((btn) => btn.classList.remove('active'));
    }
  },

  /**
   * Copy all annotations across all pages to clipboard
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async copyAllAnnotations(pointa) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAnnotations',
        limit: 1000
      });

      const allAnnotations = response.success ? response.annotations || [] : [];
      const active = allAnnotations.filter(a => a.status === 'pending' || !a.status || a.status === 'in-review');

      if (active.length === 0) {
        if (typeof PointaUtils !== 'undefined' && PointaUtils.showToast) {
          PointaUtils.showToast('No annotations to copy', 'info');
        }
        return;
      }

      // Group by URL
      const pageGroups = new Map();
      active.forEach(a => {
        const url = a.url || window.location.href;
        if (!pageGroups.has(url)) pageGroups.set(url, []);
        pageGroups.get(url).push(a);
      });

      // Build clipboard text
      let text = `I have ${active.length} Pointa annotation${active.length > 1 ? 's' : ''} across ${pageGroups.size} page${pageGroups.size > 1 ? 's' : ''}. Please read all my annotations using the read_annotations tool and implement the requested changes.\n\n`;

      for (const [url, annotations] of pageGroups) {
        let pagePath;
        try {
          pagePath = new URL(url).pathname || '/';
        } catch (_) {
          pagePath = url;
        }
        text += `${pagePath} (${annotations.length} annotation${annotations.length > 1 ? 's' : ''}):\n`;
        annotations.forEach((a, i) => {
          const messages = a.messages || (a.comment ? [{ text: a.comment }] : []);
          const latest = messages.length > 0 ? messages[messages.length - 1].text : 'No description';
          text += `  ${i + 1}. [${a.id}] ${latest.substring(0, 80)}${latest.length > 80 ? '...' : ''}\n`;
        });
        text += `  -> read_annotations(url: "${url}")\n\n`;
      }

      if (typeof PointaUtils !== 'undefined' && PointaUtils.copyToClipboard) {
        await PointaUtils.copyToClipboard(text, `Copied ${active.length} annotation${active.length > 1 ? 's' : ''}! Paste into your AI coding tool.`);
      } else {
        await navigator.clipboard.writeText(text);
      }

      // Flash the copy button to show success
      const copyBtn = this.toolbar?.querySelector('[data-action="copy-all"]');
      if (copyBtn) {
        copyBtn.classList.add('active');
        setTimeout(() => copyBtn.classList.remove('active'), 1000);
      }
    } catch (error) {
      console.error('Pointa: Failed to copy annotations:', error);
    }
  },

  /**
   * Update annotation badge count
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  updateBadges(pointa) {
    const badge = this.toolbar?.querySelector('#toolbar-annotation-badge');
    if (badge) {
      const count = (pointa.annotations || []).filter(
        (a) => a.status === 'pending' || !a.status
      ).length;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  /**
   * Check if the Pointa server is online
   * @returns {Promise<boolean>}
   */
  async checkServerStatus() {
    const isLocalhost = PointaUtils.isLocalhostUrl(window.location.href);
    if (!isLocalhost) return false;

    try {
      const response = await fetch('http://127.0.0.1:4242/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Start polling server status every 3 seconds
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  startStatusPolling(pointa) {
    this.stopStatusPolling();

    this.statusPollInterval = setInterval(async () => {
      const wasOnline = this.serverOnline;
      this.serverOnline = await this.checkServerStatus();

      // Update status dot
      const dot = this.toolbar?.querySelector('.toolbar-status-dot');
      if (dot) {
        dot.className = `toolbar-status-dot ${this.serverOnline ? 'online' : 'offline'}`;
        dot.title = this.serverOnline ? 'Server online' : 'Server offline';
      }

      // If status changed, refresh active panel
      if (wasOnline !== this.serverOnline) {
        await this.refreshActivePanel(pointa);
      }
    }, 3000);
  },

  /**
   * Stop status polling
   */
  stopStatusPolling() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  },

  /**
   * Inject CSS styles into the shadow root
   */
  async injectShadowStyles() {
    // Create a style element for the shadow root
    const styleEl = document.createElement('style');

    // Fetch the CSS file from the extension
    try {
      const cssUrl = chrome.runtime.getURL('content/content.css');
      const response = await fetch(cssUrl);
      const cssText = await response.text();
      styleEl.textContent = cssText;
    } catch (error) {
      console.error('Pointa: Failed to load toolbar CSS:', error);
    }

    // Insert the style element into shadow root
    this.shadowRoot.appendChild(styleEl);

    // Also inject the Inter font
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
      @font-face {
        font-family: 'Inter';
        src: url('${chrome.runtime.getURL('assets/fonts/InterVariable.woff2')}') format('woff2-variations');
        font-weight: 100 900;
        font-display: swap;
      }
    `;
    this.shadowRoot.appendChild(fontStyle);
  },

  /**
   * Setup storage listener for annotation changes
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  setupStorageListener(pointa) {
    this.storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.annotations) {
        this.updateBadges(pointa);

        // If annotations panel is open, refresh it
        if (this.activePanel === 'annotations') {
          this.refreshActivePanel(pointa);
        }
      }
    };

    chrome.storage.onChanged.addListener(this.storageListener);
  },

  /**
   * Refresh the currently active panel content
   * @param {Pointa} pointa - Reference to main Pointa instance
   */
  async refreshActivePanel(pointa) {
    if (!this.activePanel || !this.panelContainer) return;

    const html = await ToolbarPanels.buildPanel(this.activePanel, pointa, this);
    this.panelContainer.innerHTML = html;
    ToolbarPanels.setupPanelListeners(this.activePanel, this.panelContainer, pointa, this);
  },
};

window.PointaToolbar = PointaToolbar;
