// Pointa page-world console recorder.
// Injected on demand with scripting.executeScript({ world: 'MAIN' }).
(function () {
  function readConfig() {
    var config = window.__POINTA_CONSOLE_RECORDER_CONFIG__;
    var attrName = 'data-pointa-console-recorder-config';
    var attrValue = document.documentElement && document.documentElement.getAttribute(attrName);

    if ((!config || !config.id) && attrValue) {
      try {
        config = JSON.parse(attrValue);
      } catch (_) {
        config = null;
      }
    }

    if (document.documentElement) {
      document.documentElement.removeAttribute(attrName);
    }

    return config;
  }

  var config = readConfig();
  if (!config || !config.id) return;

  try {
    delete window.__POINTA_CONSOLE_RECORDER_CONFIG__;
  } catch (_) {
    window.__POINTA_CONSOLE_RECORDER_CONFIG__ = null;
  }

  var stateKey = '__pointaConsoleRecorder';
  var existing = window[stateKey];

  if (existing && typeof existing.stop === 'function') {
    existing.stop();
  }

  var originalConsole = {};
  var active = true;
  var methods = ['log', 'warn', 'error'];

  function safeString(value) {
    if (typeof value === 'undefined') return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }
    if (value instanceof Error) {
      return value.stack || value.message || String(value);
    }

    try {
      var seen = [];
      return JSON.stringify(value, function (_key, nestedValue) {
        if (typeof nestedValue === 'object' && nestedValue !== null) {
          if (seen.indexOf(nestedValue) !== -1) return '[Circular]';
          seen.push(nestedValue);
        }
        if (typeof nestedValue === 'function') return '[Function]';
        return nestedValue;
      });
    } catch (_) {
      try {
        return String(value);
      } catch (_error) {
        return '[Unserializable]';
      }
    }
  }

  function normalizeMessage(args) {
    return Array.prototype.slice.call(args).map(safeString).join(' ');
  }

  function levelToType(level) {
    if (level === 'error') return 'console-error';
    if (level === 'warn') return 'console-warning';
    return 'console-log';
  }

  function emitToContent(payload) {
    var detail = JSON.stringify(payload);
    var event;

    if (typeof CustomEvent === 'function') {
      event = new CustomEvent(config.eventName, { detail: detail });
    } else {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(config.eventName, false, false, detail);
    }

    window.dispatchEvent(event);
  }

  function postConsoleEvent(level, args) {
    if (!active) return;

    emitToContent({
      id: config.id,
      event: {
        observedAt: Date.now(),
        timestamp: new Date().toISOString(),
        type: levelToType(level),
        severity: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info',
        data: {
          level: level,
          message: normalizeMessage(args),
          source: window.location.href,
          url: window.location.href,
          capturedBy: 'page-console-recorder'
        }
      }
    });
  }

  function postErrorEvent(subtype, data) {
    if (!active) return;

    emitToContent({
      id: config.id,
      event: {
        observedAt: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'console-error',
        subtype: subtype,
        severity: 'error',
        data: {
          level: 'error',
          message: data.message || 'Runtime error',
          source: data.source || window.location.href,
          url: window.location.href,
          lineNumber: data.lineNumber,
          columnNumber: data.columnNumber,
          stack: data.stack,
          reason: data.reason,
          capturedBy: subtype
        }
      }
    });
  }

  function handleWindowError(event) {
    postErrorEvent('page-error', {
      message: event.message || safeString(event.error) || 'Runtime error',
      source: event.filename || window.location.href,
      lineNumber: event.lineno,
      columnNumber: event.colno,
      stack: event.error && event.error.stack ? event.error.stack : undefined
    });
  }

  function handleUnhandledRejection(event) {
    var reason = event.reason;
    postErrorEvent('unhandled-rejection', {
      message: 'Unhandled Promise Rejection: ' + safeString(reason),
      source: window.location.href,
      stack: reason && reason.stack ? reason.stack : undefined,
      reason: safeString(reason)
    });
  }

  function installWrapper(method) {
    if (!window.console || typeof window.console[method] !== 'function') return;

    originalConsole[method] = window.console[method];
    window.console[method] = function pointaConsoleWrapper() {
      postConsoleEvent(method, arguments);
      return originalConsole[method].apply(this, arguments);
    };
  }

  function stop() {
    active = false;
    window.removeEventListener(config.stopEventName, stop);
    document.removeEventListener(config.stopEventName, stop);
    window.removeEventListener('error', handleWindowError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);

    methods.forEach(function (method) {
      if (
        window.console &&
        originalConsole[method] &&
        window.console[method] &&
        window.console[method].name === 'pointaConsoleWrapper'
      ) {
        window.console[method] = originalConsole[method];
      }
    });

    if (window[stateKey] && window[stateKey].id === config.id) {
      try {
        delete window[stateKey];
      } catch (_) {
        window[stateKey] = null;
      }
    }
  }

  window.addEventListener(config.stopEventName, stop);
  document.addEventListener(config.stopEventName, stop);

  try {
    methods.forEach(installWrapper);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window[stateKey] = { id: config.id, stop: stop };
    emitToContent({ id: config.id, ready: true });
  } catch (error) {
    stop();
    emitToContent({
      id: config.id,
      error: error && error.message ? error.message : 'Console instrumentation failed'
    });
  }
})();
