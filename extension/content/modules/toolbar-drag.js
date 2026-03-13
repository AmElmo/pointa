// Toolbar Drag Module
// Handles drag-and-drop repositioning of the floating toolbar

const ToolbarDrag = {
  isDragging: false,
  wasDrag: false,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  toolbarElement: null,
  shadowHost: null,
  resizeHandler: null,

  /**
   * Initialize drag handling on the toolbar
   * @param {HTMLElement} toolbarElement - The toolbar element inside shadow DOM
   * @param {HTMLElement} shadowHost - The shadow host element positioned in the page
   */
  init(toolbarElement, shadowHost) {
    this.toolbarElement = toolbarElement;
    this.shadowHost = shadowHost;

    // Attach drag to the entire pill — not just the logo handle
    toolbarElement.addEventListener('mousedown', (e) => this.onMouseDown(e));

    this.setupResizeListener();
  },

  /**
   * Handle mousedown on the toolbar pill
   * @param {MouseEvent} e
   */
  onMouseDown(e) {
    // Only left mouse button
    if (e.button !== 0) return;

    e.preventDefault();

    this.isDragging = true;
    this.wasDrag = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startLeft = parseInt(this.shadowHost.style.left, 10) || 0;
    this.startTop = parseInt(this.shadowHost.style.top, 10) || 0;

    this._boundMouseMove = (e) => this.onMouseMove(e);
    this._boundMouseUp = (e) => this.onMouseUp(e);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
  },

  /**
   * Handle mousemove during drag
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    // Only start visual drag after threshold
    const totalMovement = Math.abs(deltaX) + Math.abs(deltaY);
    if (totalMovement < 5) return;

    const newX = this.startLeft + deltaX;
    const newY = this.startTop + deltaY;

    const clamped = this.clampPosition(newX, newY);
    this.shadowHost.style.left = clamped.x + 'px';
    this.shadowHost.style.top = clamped.y + 'px';
    this.shadowHost.style.cursor = 'grabbing';
  },

  /**
   * Handle mouseup to end drag
   * @param {MouseEvent} e
   */
  onMouseUp(e) {
    if (!this.isDragging) return;

    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);

    const totalMovement = Math.abs(e.clientX - this.startX) + Math.abs(e.clientY - this.startY);
    this.wasDrag = totalMovement >= 5;

    if (this.wasDrag) {
      const finalX = parseInt(this.shadowHost.style.left, 10) || 0;
      const finalY = parseInt(this.shadowHost.style.top, 10) || 0;
      this.savePosition(finalX, finalY);
    }

    this.isDragging = false;
    this.shadowHost.style.cursor = '';
  },

  /**
   * Clamp position to keep toolbar within the viewport
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}}
   */
  clampPosition(x, y) {
    const width = this.toolbarElement.offsetWidth;
    const height = this.toolbarElement.offsetHeight;

    const maxX = window.innerWidth - width;
    const maxY = window.innerHeight - height;

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    };
  },

  /**
   * Save toolbar position to chrome storage
   * @param {number} x
   * @param {number} y
   */
  savePosition(x, y) {
    chrome.storage.local.set({ toolbarPosition: { x, y } });
  },

  /**
   * Load saved toolbar position from chrome storage
   * @returns {Promise<{x: number, y: number}|null>}
   */
  async loadPosition() {
    const result = await chrome.storage.local.get(['toolbarPosition']);
    return result.toolbarPosition || null;
  },

  /**
   * Get default toolbar position (top-right with margin)
   * @returns {{x: number, y: number}}
   */
  getDefaultPosition() {
    return { x: window.innerWidth - 60, y: Math.round(window.innerHeight / 2 - 150) };
  },

  /**
   * Set up a resize listener to re-clamp position when window is resized
   */
  setupResizeListener() {
    this.resizeHandler = () => {
      if (!this.shadowHost) return;

      const currentX = parseInt(this.shadowHost.style.left, 10) || 0;
      const currentY = parseInt(this.shadowHost.style.top, 10) || 0;
      const clamped = this.clampPosition(currentX, currentY);

      this.shadowHost.style.left = clamped.x + 'px';
      this.shadowHost.style.top = clamped.y + 'px';
    };

    window.addEventListener('resize', this.resizeHandler);
  },

  /**
   * Clean up all listeners
   */
  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
};

window.ToolbarDrag = ToolbarDrag;
