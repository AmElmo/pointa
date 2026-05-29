// Pointa page-world network recorder.
// Injected on demand with scripting.executeScript({ world: 'MAIN' }).
(function () {
  function readConfig() {
    var config = window.__POINTA_NETWORK_RECORDER_CONFIG__;
    var attrName = 'data-pointa-network-recorder-config';
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
    delete window.__POINTA_NETWORK_RECORDER_CONFIG__;
  } catch (_) {
    window.__POINTA_NETWORK_RECORDER_CONFIG__ = null;
  }

  var stateKey = '__pointaNetworkRecorder';
  var existing = window[stateKey];

  if (existing && typeof existing.stop === 'function') {
    existing.stop();
  }

  var originalFetch = window.fetch;
  var xhrPrototype = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  var originalXHROpen = xhrPrototype && xhrPrototype.open;
  var originalXHRSend = xhrPrototype && xhrPrototype.send;
  var active = true;
  var sequence = 0;
  var wrappedFetch = null;
  var wrappedOpen = null;
  var wrappedSend = null;
  var xhrMetadataKey = '__pointaNetworkMetadata_' + config.id;

  function nextRequestId(prefix) {
    sequence += 1;
    return prefix + '-' + Date.now() + '-' + sequence;
  }

  function safeString(value, fallback) {
    if (typeof value === 'undefined' || value === null) return fallback || '';
    try {
      return String(value);
    } catch (_) {
      return fallback || '';
    }
  }

  function normalizeMethod(method) {
    return safeString(method, 'GET').toUpperCase();
  }

  function normalizeUrl(value) {
    var rawUrl = safeString(value, 'unknown');
    if (rawUrl === 'unknown') return rawUrl;

    try {
      return new URL(rawUrl, window.location.href).href;
    } catch (_) {
      return rawUrl;
    }
  }

  function getFetchUrl(input) {
    if (input && typeof input.url === 'string') return normalizeUrl(input.url);
    return normalizeUrl(input);
  }

  function getFetchMethod(input, init) {
    if (init && init.method) return normalizeMethod(init.method);
    if (input && typeof input.method === 'string') return normalizeMethod(input.method);
    return 'GET';
  }

  function getFailureReason(error, fallback) {
    if (!error) return fallback || 'Network request failed';
    var name = safeString(error.name, '');
    var message = safeString(error.message, '');
    if (name && message) return name + ': ' + message;
    return message || name || safeString(error, fallback || 'Network request failed');
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

  function postNetworkEvent(detail) {
    if (!active) return;

    emitToContent({
      id: config.id,
      event: {
        observedAt: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'network',
        subtype: detail.subtype,
        severity: detail.severity,
        data: detail.data
      }
    });
  }

  function installFetchWrapper() {
    if (typeof originalFetch !== 'function') return;

    wrappedFetch = function pointaFetchWrapper(input, init) {
      var metadata = {
        url: getFetchUrl(input),
        method: getFetchMethod(input, init),
        requestId: nextRequestId('fetch'),
        startedAt: Date.now()
      };

      return originalFetch.apply(this, arguments).then(function (response) {
        var status = response && typeof response.status !== 'undefined' ? response.status : undefined;
        var ok = response && typeof response.ok === 'boolean' ? response.ok : status >= 200 && status < 400;
        var failed = !ok;

        postNetworkEvent({
          subtype: failed ? 'failed' : 'success',
          severity: failed ? 'error' : 'info',
          data: {
            url: metadata.url,
            method: metadata.method,
            status: status,
            statusText: response && response.statusText ? response.statusText : '',
            ok: ok,
            resourceType: 'Fetch',
            type: 'content-fetch',
            requestId: metadata.requestId,
            duration: Date.now() - metadata.startedAt
          }
        });

        return response;
      }, function (error) {
        postNetworkEvent({
          subtype: 'failed',
          severity: 'error',
          data: {
            url: metadata.url,
            method: metadata.method,
            error: getFailureReason(error),
            resourceType: 'Fetch',
            type: 'content-fetch',
            requestId: metadata.requestId,
            duration: Date.now() - metadata.startedAt
          }
        });

        throw error;
      });
    };

    window.fetch = wrappedFetch;
  }

  function installXHRWrapper() {
    if (!xhrPrototype || typeof originalXHROpen !== 'function' || typeof originalXHRSend !== 'function') return;

    wrappedOpen = function pointaXHROpenWrapper(method, url) {
      this[xhrMetadataKey] = {
        method: normalizeMethod(method),
        url: normalizeUrl(url),
        requestId: nextRequestId('xhr')
      };

      return originalXHROpen.apply(this, arguments);
    };

    wrappedSend = function pointaXHRSendWrapper() {
      var xhr = this;
      var metadata = xhr[xhrMetadataKey] || {
        method: 'GET',
        url: 'unknown',
        requestId: nextRequestId('xhr')
      };

      metadata.startedAt = Date.now();
      var completed = false;

      function cleanup() {
        xhr.removeEventListener('error', handleError);
        xhr.removeEventListener('abort', handleAbort);
        xhr.removeEventListener('timeout', handleTimeout);
        xhr.removeEventListener('loadend', handleLoadEnd);
      }

      function rememberFailure(reason) {
        metadata.failureReason = reason;
      }

      function handleError() {
        rememberFailure('XMLHttpRequest error');
      }

      function handleAbort() {
        rememberFailure('XMLHttpRequest aborted');
      }

      function handleTimeout() {
        rememberFailure('XMLHttpRequest timed out');
      }

      function handleLoadEnd() {
        if (completed) return;
        completed = true;
        cleanup();

        var status;
        var statusText = '';

        try {
          status = xhr.status;
          statusText = xhr.statusText || '';
        } catch (_) {
          status = 0;
        }

        var failed = Boolean(metadata.failureReason) || status === 0 || status >= 400;
        postNetworkEvent({
          subtype: failed ? 'failed' : 'success',
          severity: failed ? 'error' : 'info',
          data: {
            url: metadata.url,
            method: metadata.method,
            status: status,
            statusText: statusText,
            error: failed ? metadata.failureReason || 'XMLHttpRequest completed without an HTTP status' : undefined,
            resourceType: 'XMLHttpRequest',
            type: 'content-xhr',
            requestId: metadata.requestId,
            duration: Date.now() - metadata.startedAt
          }
        });
      }

      xhr.addEventListener('error', handleError);
      xhr.addEventListener('abort', handleAbort);
      xhr.addEventListener('timeout', handleTimeout);
      xhr.addEventListener('loadend', handleLoadEnd);

      try {
        return originalXHRSend.apply(this, arguments);
      } catch (error) {
        cleanup();
        postNetworkEvent({
          subtype: 'failed',
          severity: 'error',
          data: {
            url: metadata.url,
            method: metadata.method,
            error: getFailureReason(error, 'XMLHttpRequest send failed'),
            resourceType: 'XMLHttpRequest',
            type: 'content-xhr',
            requestId: metadata.requestId,
            duration: Date.now() - metadata.startedAt
          }
        });
        throw error;
      }
    };

    xhrPrototype.open = wrappedOpen;
    xhrPrototype.send = wrappedSend;
  }

  function stop() {
    active = false;
    window.removeEventListener(config.stopEventName, stop);
    document.removeEventListener(config.stopEventName, stop);

    if (wrappedFetch && window.fetch === wrappedFetch) {
      window.fetch = originalFetch;
    }

    if (xhrPrototype) {
      if (wrappedOpen && xhrPrototype.open === wrappedOpen) {
        xhrPrototype.open = originalXHROpen;
      }
      if (wrappedSend && xhrPrototype.send === wrappedSend) {
        xhrPrototype.send = originalXHRSend;
      }
    }

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
    installFetchWrapper();
    installXHRWrapper();
    window[stateKey] = { id: config.id, stop: stop };
    emitToContent({ id: config.id, ready: true });
  } catch (error) {
    stop();
    emitToContent({
      id: config.id,
      error: getFailureReason(error, 'Network instrumentation failed')
    });
  }
})();
