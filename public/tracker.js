(function () {
  "use strict";

  var location = window.location;
  var document = window.document;

  var scriptElement = document.currentScript;
  var dataDomain = scriptElement.getAttribute("data-site");

  // Enhanced UTM parameter tracking
  let queryString = location.search;
  const params = new URLSearchParams(queryString);
  var utmParams = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
  };

  var endpoint = "https://websight-ecru.vercel.app/api/track";
  var sessionDuration = 30 * 60 * 1000; // 30 minutes


  function getVisitorId() {
    var visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = "visitor-" + Math.random().toString(36).substr(2, 16);
      localStorage.setItem("visitor_id", visitorId);
    }
    return visitorId;
  }

  function generateSessionId() {
    return "session-" + Math.random().toString(36).substr(2, 9);
  }

  function initializeSession() {
    console.log('Initializing session...');
    var sessionId = sessionStorage.getItem("session_id");
    var expirationTimestamp = sessionStorage.getItem(
      "session_expiration_timestamp"
    );
    var isNewSession = false;
    var sessionStartTime = sessionStorage.getItem("session_start_time");

    console.log('Current session state:', {
      sessionId,
      expirationTimestamp,
      sessionStartTime,
      isExpired: expirationTimestamp ? isSessionExpired(parseInt(expirationTimestamp)) : true
    });

    if (
      !sessionId ||
      !expirationTimestamp ||
      isSessionExpired(parseInt(expirationTimestamp))
    ) {
      console.log('Creating new session...');
      sessionId = generateSessionId();
      expirationTimestamp = Date.now() + sessionDuration;
      sessionStartTime = Date.now();
      sessionStorage.setItem("session_id", sessionId);
      sessionStorage.setItem(
        "session_expiration_timestamp",
        expirationTimestamp
      );
      sessionStorage.setItem("session_start_time", sessionStartTime);
      isNewSession = true;
    } else {
      console.log('Extending existing session...');
      expirationTimestamp = Date.now() + sessionDuration;
      sessionStorage.setItem(
        "session_expiration_timestamp",
        expirationTimestamp
      );
    }

    if (isNewSession) {
      console.log('New session detected, triggering session_start event...');
      trackSessionStart();
    }

    return {
      sessionId: sessionId,
      expirationTimestamp: parseInt(expirationTimestamp),
      isNewSession: isNewSession,
      sessionStartTime: parseInt(sessionStartTime)
    };
  }

  // Function to check if the session is expired
  function isSessionExpired(expirationTimestamp) {
    return Date.now() >= expirationTimestamp;
  }

  function checkSessionStatus() {
    var session = initializeSession();
    if (isSessionExpired(session.expirationTimestamp)) {
      // Calculate session duration before clearing
      const sessionDuration = Date.now() - session.sessionStartTime;
      trackSessionEnd(sessionDuration);
      sessionStorage.removeItem("session_id");
      sessionStorage.removeItem("session_expiration_timestamp");
      sessionStorage.removeItem("session_start_time");
      initializeSession();
    }
  }

  function trackSessionEnd(sessionDuration) {
    trigger("session_end", {
      duration: sessionDuration
    });
  }

  // Track session end when user leaves the page
  window.addEventListener('beforeunload', function() {
    const sessionId = sessionStorage.getItem("session_id");
    const sessionStartTime = sessionStorage.getItem("session_start_time");
    
    if (sessionId && sessionStartTime) {
      const sessionDuration = Date.now() - parseInt(sessionStartTime);
      // Use sendBeacon for reliable data sending during page unload
      if (navigator.sendBeacon) {
        const payload = {
          event: "session_end",
          domain: dataDomain,
          url: location.href,
          user_agent: navigator.userAgent,
          screen: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          language: navigator.language,
          session_id: sessionId,
          visitor_id: getVisitorId(),
          timestamp: new Date().toISOString(),
          data: {
            duration: sessionDuration
          }
        };
        navigator.sendBeacon(endpoint, JSON.stringify(payload));
      }
    }
  });

  // Track session end when tab becomes hidden
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      const sessionId = sessionStorage.getItem("session_id");
      const sessionStartTime = sessionStorage.getItem("session_start_time");
      
      if (sessionId && sessionStartTime) {
        const sessionDuration = Date.now() - parseInt(sessionStartTime);
        trackSessionEnd(sessionDuration);
      }
    }
  });

  // Track session end when session expires
  function checkSessionExpiration() {
    const sessionId = sessionStorage.getItem("session_id");
    const sessionStartTime = sessionStorage.getItem("session_start_time");
    const expirationTimestamp = sessionStorage.getItem("session_expiration_timestamp");
    
    if (sessionId && sessionStartTime && expirationTimestamp && isSessionExpired(parseInt(expirationTimestamp))) {
      const sessionDuration = Date.now() - parseInt(sessionStartTime);
      trackSessionEnd(sessionDuration);
      sessionStorage.removeItem("session_id");
      sessionStorage.removeItem("session_expiration_timestamp");
      sessionStorage.removeItem("session_start_time");
      initializeSession();
    }
  }

  // Check session expiration every minute
  setInterval(checkSessionExpiration, 60000);

  checkSessionStatus();

 
  function trigger(eventName, eventData, options) {
    console.log('Triggering event:', eventName, eventData);
    var session = initializeSession();
    var visitorId = getVisitorId();
    var source = "";
    
    if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        source = referrerUrl.hostname;
      } catch (e) {
        source = "unknown";
      }
    } else {
      source = "direct";
    }

    var payload = {
      event: eventName,
      url: location.href,
      path: location.pathname,
      domain: dataDomain,
      referrer: document.referrer,
      title: document.title,
      utm: utmParams,
      source: source,
      visitor_id: visitorId,
      session_id: session.sessionId,
      timestamp: new Date().toISOString(),
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      language: navigator.language,
      user_agent: navigator.userAgent,
      data: eventData || {},
    };

    console.log('Sending payload:', payload);

    // Using sendBeacon API for more reliable data sending
    if (navigator.sendBeacon && !options?.forceXHR) {
      console.log('Using sendBeacon API...');
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
      options?.callback?.();
    } else {
      console.log('Using XMLHttpRequest...');
      sendRequest(payload, options);
    }
  }

  // Function to send HTTP requests
  function sendRequest(payload, options) {
    var request = new XMLHttpRequest();
    request.open("POST", endpoint, true);
    request.setRequestHeader("Content-Type", "application/json");

    request.onreadystatechange = function () {
      if (request.readyState === 4) {
        options && options.callback && options.callback();
      }
    };

    request.send(JSON.stringify(payload));
  }

  // Queue of tracking events
  var queue = (window.your_tracking && window.your_tracking.q) || [];
  window.your_tracking = trigger;
  for (var i = 0; i < queue.length; i++) {
    trigger.apply(this, queue[i]);
  }

  // Track single page visits for bounce rate calculation
  let pageViewsInSession = 0;
  function trackPageView() {
    pageViewsInSession++;
    trigger("pageview", {
      page_views_in_session: pageViewsInSession
    });
  }

  // Reset page views counter for new sessions
  function trackSessionStart() {
    console.log('Tracking session start...');
    pageViewsInSession = 1;
    trigger("session_start");
  }

  // Track page view when the script is loaded
  trackPageView();
  var initialPathname = window.location.pathname;

  // Event listener for popstate (back/forward navigation)
  window.addEventListener("popstate", trackPageView);
  // Event listener for hashchange (hash-based navigation)
  window.addEventListener("hashchange", trackPageView);
  document.addEventListener("click", function (event) {
    setTimeout(() => {
      if (window.location.pathname !== initialPathname) {
        trackPageView();
        initialPathname = window.location.pathname;
      }
    }, 3000);
  });

  function resetActivityTimer() {
    initializeSession();
  }

  // User activity monitoring with throttling
  ["mousedown", "keydown", "touchstart", "scroll"].forEach(function (evt) {
    document.addEventListener(evt, throttle(resetActivityTimer, 5000), {
      passive: true,
    });
  });

  // Throttle function to limit how often a function is called
  function throttle(func, limit) {
    var lastCall = 0;
    return function () {
      var now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        func.apply(this, arguments);
      }
    };
  }

  // Enhanced tracking for outbound links and downloads
  document.addEventListener("click", function (event) {
    var target = event.target.closest("a");
    if (!target) return;

    var href = target.getAttribute("href") || "";
    var isOutbound = href.indexOf("http") === 0 && !href.includes(location.hostname);
    var isDownload = /\.(pdf|zip|docx?|xlsx?|pptx?|rar|tar|gz|exe)$/i.test(href);

    if (isOutbound) {
      trigger("outbound_click", {
        url: href,
        text: target.innerText,
        target: target.getAttribute("target"),
      });
    }

    if (isDownload) {
      trigger("download", {
        file: href,
        name: href.split("/").pop(),
      });
    }
  });

  // Track form submissions
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;

    var formId = form.id || form.getAttribute("name") || "unknown_form";
    trigger("form_submit", {
      form_id: formId,
      form_class: form.className,
      form_action: form.action,
    });
  });

  // Track scrolling depth
  var scrollDepthMarkers = [25, 50, 75, 90];
  var scrollDepthTracked = {};

  window.addEventListener(
    "scroll",
    throttle(function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

      scrollDepthMarkers.forEach(function (marker) {
        if (scrollPercent >= marker && !scrollDepthTracked[marker]) {
          scrollDepthTracked[marker] = true;
          trigger("scroll_depth", { depth: marker });
        }
      });
    }, 1000)
  );

  // Track performance metrics
  function trackPerformance() {
    if (window.performance && window.performance.timing) {
      var timing = window.performance.timing;
      var performanceData = {
        load_time: timing.loadEventEnd - timing.navigationStart,
        dom_ready: timing.domContentLoadedEventEnd - timing.navigationStart,
        network_latency: timing.responseEnd - timing.requestStart,
        processing_time: timing.domComplete - timing.responseEnd,
        total_time: timing.loadEventEnd - timing.navigationStart,
      };

      setTimeout(function () {
        trigger("performance", performanceData);
      }, 0);
    }
  }

  if (document.readyState === "complete") {
    trackPerformance();
  } else {
    window.addEventListener("load", trackPerformance);
  }
})();