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

  var endpoint = "https://websight.srexrg.me/api/track";
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
    var sessionId = sessionStorage.getItem("session_id");
    var expirationTimestamp = sessionStorage.getItem(
      "session_expiration_timestamp"
    );
    var isNewSession = false;

    if (
      !sessionId ||
      !expirationTimestamp ||
      isSessionExpired(parseInt(expirationTimestamp))
    ) {
      sessionId = generateSessionId();
      expirationTimestamp = Date.now() + sessionDuration;
      sessionStorage.setItem("session_id", sessionId);
      sessionStorage.setItem(
        "session_expiration_timestamp",
        expirationTimestamp
      );
      isNewSession = true;
    } else {
      expirationTimestamp = Date.now() + sessionDuration;
      sessionStorage.setItem(
        "session_expiration_timestamp",
        expirationTimestamp
      );
    }

    if (isNewSession) {
      trackSessionStart();
    }

    return {
      sessionId: sessionId,
      expirationTimestamp: parseInt(expirationTimestamp),
      isNewSession: isNewSession,
    };
  }

  // Function to check if the session is expired
  function isSessionExpired(expirationTimestamp) {
    return Date.now() >= expirationTimestamp;
  }

  function checkSessionStatus() {
    var session = initializeSession();
    if (isSessionExpired(session.expirationTimestamp)) {
      sessionStorage.removeItem("session_id");
      sessionStorage.removeItem("session_expiration_timestamp");
      trackSessionEnd();
      initializeSession();
    }
  }

  checkSessionStatus();

  function trigger(eventName, eventData, options) {
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

    // Using sendBeacon API for more reliable data sending
    if (navigator.sendBeacon && !options?.forceXHR) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
      options?.callback?.();
    } else {
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

  // Function to track page views
  function trackPageView() {
    trigger("pageview");
  }
  function trackSessionStart() {
    trigger("session_start");
  }
  function trackSessionEnd() {
    trigger("session_end");
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
    var isOutbound =
      href.indexOf("http") === 0 && !href.includes(location.hostname);
    var isDownload = /\.(pdf|zip|docx?|xlsx?|pptx?|rar|tar|gz|exe)$/i.test(
      href
    );

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
})();
