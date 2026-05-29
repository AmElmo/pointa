/**
 * sidebar-ui.js — Legacy shim
 *
 * The sidebar has been replaced by the floating toolbar (floating-toolbar.js).
 * This stub keeps PointaSidebar defined so guarded references in other modules
 * (e.g. `if (PointaSidebar.isOpen) { ... }`) silently no-op instead of crashing.
 *
 * All active functionality has been moved:
 *   - Report detail modals → report-details.js (PointaReportDetails)
 *   - markAnnotationDone  → inlined in annotation-mode.js
 *   - checkServerStatus   → no longer needed (toolbar handles its own status)
 */

const PointaSidebar = {
  isOpen: false,
  isRecordingBug: false,
  currentView: null,
  sidebar: null,
  sidebarTimerInterval: null,
  notificationCenterOpen: false,

  async checkServerStatus() {
    if (!PointaUtils.isLocalhostUrl(window.location.href)) return false;
    try {
      if (window.pointa && typeof window.pointa.checkAPIStatus === 'function') {
        const status = await window.pointa.checkAPIStatus();
        return status.connected;
      }

      const bgResponse = await chrome.runtime.sendMessage({
        action: 'checkMCPStatus'
      });

      if (bgResponse?.success && bgResponse.status) {
        return window.PointaBrowser.normalizeLocalServerStatus(bgResponse.status).connected;
      }

      const status = await window.PointaBrowser.checkLocalServerHealth({
        timeoutMs: 2000,
        mode: 'cors',
        credentials: 'omit'
      });
      return status.connected;
    } catch {
      return false;
    }
  },

  async updateContent() { /* no-op */ },
  async open() { /* no-op */ },
  close() { /* no-op */ },
  async toggle() { /* no-op */ },
  scrollToAnnotationInSidebar() { /* no-op */ },
};

window.PointaSidebar = PointaSidebar;
