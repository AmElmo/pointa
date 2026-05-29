// Pointa cross-browser runtime and capability helpers.
(function () {
  var root = typeof globalThis !== 'undefined' ? globalThis : self;

  if (root.PointaBrowser &&
    typeof root.PointaBrowser.getLocalServerBaseUrl === 'function' &&
    typeof root.PointaBrowser.checkLocalServerHealth === 'function') {
    return;
  }

  var chromeApi = root.chrome || null;
  var browserApi = root.browser || null;
  var api = browserApi || chromeApi || {};
  var namespace = browserApi ? 'browser' : chromeApi ? 'chrome' : 'none';
  var userAgent = root.navigator && root.navigator.userAgent ? root.navigator.userAgent : '';
  var isFirefox = /Firefox\//.test(userAgent);
  var isChromium = /(?:Chrome|Chromium|Edg)\//.test(userAgent) && !isFirefox;

  if (isFirefox && browserApi && !chromeApi) {
    root.chrome = browserApi;
    chromeApi = root.chrome;
    api = browserApi;
    namespace = 'browser';
  }

  var LOCAL_SERVER_URL = 'http://127.0.0.1:4242';
  var LOCAL_SERVER_HEALTH_PATH = '/health';
  var LOCAL_SERVER_OFFLINE_ERROR = 'Pointa server is offline';
  var LOCAL_SERVER_HOST_ALIASES = Object.freeze(['127.0.0.1', 'localhost']);

  function normalizeLocalServerPath(path) {
    if (!path) {
      return '';
    }

    var normalizedPath = String(path);
    if (normalizedPath.charAt(0) === '?' || normalizedPath.charAt(0) === '#') {
      return normalizedPath;
    }

    return normalizedPath.charAt(0) === '/' ? normalizedPath : '/' + normalizedPath;
  }

  function getDefaultPort(protocol) {
    return protocol === 'https:' ? '443' : '80';
  }

  function getLocalServerBaseUrl() {
    return LOCAL_SERVER_URL;
  }

  function getLocalServerUrl(path) {
    return LOCAL_SERVER_URL + normalizeLocalServerPath(path);
  }

  function getLocalServerHealthUrl() {
    return getLocalServerUrl(LOCAL_SERVER_HEALTH_PATH);
  }

  function isLocalServerUrl(url, pathPrefix) {
    try {
      var parsedUrl = new URL(url);
      var canonicalUrl = new URL(LOCAL_SERVER_URL);
      var parsedPort = parsedUrl.port || getDefaultPort(parsedUrl.protocol);
      var canonicalPort = canonicalUrl.port || getDefaultPort(canonicalUrl.protocol);
      var pathMatches = true;

      if (pathPrefix) {
        pathMatches = parsedUrl.pathname.indexOf(normalizeLocalServerPath(pathPrefix)) === 0;
      }

      return parsedUrl.protocol === canonicalUrl.protocol &&
        parsedPort === canonicalPort &&
        LOCAL_SERVER_HOST_ALIASES.indexOf(parsedUrl.hostname) !== -1 &&
        pathMatches;
    } catch (_) {
      return false;
    }
  }

  function isLocalServerHealthUrl(url) {
    return isLocalServerUrl(url, LOCAL_SERVER_HEALTH_PATH);
  }

  function isLocalServerBackendUrl(url) {
    return isLocalServerUrl(url, '/api/backend');
  }

  function createTimeoutSignal(timeoutMs) {
    if (!timeoutMs || typeof root.AbortSignal === 'undefined') {
      return {};
    }

    if (typeof root.AbortSignal.timeout === 'function') {
      return { signal: root.AbortSignal.timeout(timeoutMs) };
    }

    if (typeof root.AbortController !== 'function' || typeof root.setTimeout !== 'function') {
      return {};
    }

    var controller = new root.AbortController();
    var timeoutId = root.setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      cancel: function () {
        if (typeof root.clearTimeout === 'function') {
          root.clearTimeout(timeoutId);
        }
      }
    };
  }

  function normalizeLocalServerStatus(status) {
    var input = status || {};
    var connected = Boolean(input.connected || input.serverOnline);
    var normalized = {
      connected: connected,
      serverOnline: connected,
      server_url: input.server_url || LOCAL_SERVER_URL,
      last_check: input.last_check || new Date().toISOString()
    };

    if (typeof input.http_status !== 'undefined') {
      normalized.http_status = input.http_status;
    }
    if (typeof input.server_version !== 'undefined' || typeof input.serverVersion !== 'undefined') {
      normalized.server_version = input.server_version || input.serverVersion;
    }
    if (typeof input.server_status !== 'undefined' || typeof input.serverStatus !== 'undefined') {
      normalized.server_status = input.server_status || input.serverStatus;
    }
    if (typeof input.version_compatible !== 'undefined') {
      normalized.version_compatible = input.version_compatible;
    }
    if (typeof input.compatibility_message !== 'undefined') {
      normalized.compatibility_message = input.compatibility_message;
    }
    if (input.data) {
      normalized.data = input.data;
    }
    if (!connected) {
      normalized.error = input.error || LOCAL_SERVER_OFFLINE_ERROR;
    }

    return normalized;
  }

  async function checkLocalServerHealth(options) {
    var healthOptions = options || {};
    var fetchImpl = healthOptions.fetch || root.fetch;
    var timeout = createTimeoutSignal(healthOptions.timeoutMs || 5000);

    if (typeof fetchImpl !== 'function') {
      return normalizeLocalServerStatus({
        connected: false,
        error: 'Fetch API is unavailable in this extension context'
      });
    }

    try {
      var requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      if (timeout.signal) {
        requestOptions.signal = timeout.signal;
      }
      if (healthOptions.mode) {
        requestOptions.mode = healthOptions.mode;
      }
      if (healthOptions.credentials) {
        requestOptions.credentials = healthOptions.credentials;
      }

      var response = await fetchImpl.call(root, getLocalServerHealthUrl(), requestOptions);

      if (!response.ok) {
        return normalizeLocalServerStatus({
          connected: false,
          error: 'Server returned ' + response.status,
          http_status: response.status
        });
      }

      var data = {};
      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      return normalizeLocalServerStatus({
        connected: true,
        data: data,
        server_version: data.version,
        server_status: data.status
      });
    } catch (error) {
      return normalizeLocalServerStatus({
        connected: false,
        error: error && error.name === 'AbortError'
          ? 'Timed out connecting to Pointa server'
          : error && error.message ? error.message : LOCAL_SERVER_OFFLINE_ERROR
      });
    } finally {
      if (typeof timeout.cancel === 'function') {
        timeout.cancel();
      }
    }
  }

  function getApiFromNamespace(namespaceApi, path) {
    var parts = path.split('.');
    var current = namespaceApi;

    for (var i = 0; i < parts.length; i += 1) {
      if (!current || !(parts[i] in current)) {
        return undefined;
      }
      current = current[parts[i]];
    }

    return current;
  }

  function getApi(path) {
    var value = getApiFromNamespace(browserApi, path);
    return typeof value === 'undefined' ? getApiFromNamespace(chromeApi, path) : value;
  }

  function hasApi(path) {
    return typeof getApi(path) !== 'undefined';
  }

  var capabilities = Object.freeze({
    namespace: namespace,
    hasBrowserNamespace: Boolean(browserApi),
    hasChromeNamespace: Boolean(chromeApi),
    isFirefox: isFirefox,
    isChromium: isChromium,
    action: hasApi('action'),
    runtime: hasApi('runtime'),
    storage: hasApi('storage.local'),
    tabs: hasApi('tabs'),
    captureVisibleTab: hasApi('tabs.captureVisibleTab'),
    scripting: hasApi('scripting.executeScript') && hasApi('scripting.insertCSS'),
    debugger: !isFirefox &&
      hasApi('debugger.attach') &&
      hasApi('debugger.detach') &&
      hasApi('debugger.sendCommand') &&
      hasApi('debugger.onEvent') &&
      hasApi('debugger.onDetach')
  });

  function getCapabilities() {
    return capabilities;
  }

  function hasCapability(name) {
    return Boolean(capabilities[name]);
  }

  root.PointaBrowser = Object.freeze({
    api: api,
    browser: browserApi,
    chrome: chromeApi,
    namespace: namespace,
    capabilities: capabilities,
    getApi: getApi,
    hasApi: hasApi,
    getCapabilities: getCapabilities,
    hasCapability: hasCapability,
    localServer: Object.freeze({
      url: LOCAL_SERVER_URL,
      healthPath: LOCAL_SERVER_HEALTH_PATH,
      healthUrl: getLocalServerHealthUrl(),
      offlineError: LOCAL_SERVER_OFFLINE_ERROR
    }),
    getLocalServerBaseUrl: getLocalServerBaseUrl,
    getLocalServerUrl: getLocalServerUrl,
    getLocalServerHealthUrl: getLocalServerHealthUrl,
    checkLocalServerHealth: checkLocalServerHealth,
    normalizeLocalServerStatus: normalizeLocalServerStatus,
    isLocalServerUrl: isLocalServerUrl,
    isLocalServerHealthUrl: isLocalServerHealthUrl,
    isLocalServerBackendUrl: isLocalServerBackendUrl
  });
})();
