(function () {
  "use strict";

  var location = window.location;
  var document = window.document;

  var scriptElement = document.currentScript;
  var siteId = scriptElement.getAttribute("data-site");
  

  let queryString = location.search;
  const params = new URLSearchParams(queryString);
  var utmSource = params.get("utm_source");
  var utmMedium = params.get("utm_medium");
  var utmCampaign = params.get("utm_campaign");

  var endpoint = "http://localhost:3000/api/track";

 
  function generateSessionId() {
    return "websight-" + Math.random().toString(36).substr(2, 9);
  }


  function initializeSession() {
    var sessionId = localStorage.getItem("websight_session_id");
    var expirationTimestamp = localStorage.getItem(
      "websight_session_expiration"
    );

    if (!sessionId || !expirationTimestamp) {
      // Generate a new session ID
      sessionId = generateSessionId();

      expirationTimestamp = Date.now() + 30 * 60 * 1000;


      localStorage.setItem("websight_session_id", sessionId);
      localStorage.setItem("websight_session_expiration", expirationTimestamp);
      trackSessionStart();
    }

    return {
      sessionId: sessionId,
      expirationTimestamp: parseInt(expirationTimestamp),
    };
  }


  function isSessionExpired(expirationTimestamp) {
    return Date.now() >= expirationTimestamp;
  }


  function checkSessionStatus() {
    var session = initializeSession();
    if (isSessionExpired(session.expirationTimestamp)) {
      localStorage.removeItem("websight_session_id");
      localStorage.removeItem("websight_session_expiration");
      trackSessionEnd();
    
      initializeSession();
    } else {
    
      localStorage.setItem(
        "websight_session_expiration",
        Date.now() + 30 * 60 * 1000
      );
    }
  }

  
  checkSessionStatus();

  
  function trigger(eventName, eventProperties) {
    if (!siteId) {
      console.warn('WebSight: No site ID provided. Add the data-site attribute to your script tag.');
      return;
    }


    var session = initializeSession();
    
    var payload = {
      event_type: eventName,
      site_id: siteId,
      url: location.href,
      pathname: location.pathname,
      referrer: document.referrer || null,
      hostname: location.hostname,
      language: navigator.language,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      session_id: session.sessionId,
      // UTM parameters
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign
    };

  
    if (eventProperties) {
      payload.event_properties = eventProperties;
    }

    sendRequest(payload);
  }


  function sendRequest(payload) {

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
    } else {

      var request = new XMLHttpRequest();
      request.open("POST", endpoint, true);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(JSON.stringify(payload));
    }
  }


  var queue = (window.websight && window.websight.q) || [];
  

  window.websight = function() {

    var args = Array.prototype.slice.call(arguments);
    var eventName = args[0];
    var eventProperties = args[1] || {};
    
    trigger(eventName, eventProperties);
  };


  window.websight.q = [];
  for (var i = 0; i < queue.length; i++) {
    window.websight.apply(this, queue[i]);
  }


  function trackPageView() {
    trigger("pageview");
  }

  function trackSessionStart() {
    trigger("session_start");
  }

  function trackSessionEnd() {
    trigger("session_end");
  }


  trackPageView();
  
  var initialPathname = window.location.pathname;


  

  window.addEventListener("popstate", trackPageView);
  
  window.addEventListener("hashchange", trackPageView);
  

  document.addEventListener("click", function () {
    setTimeout(function() {
      if (window.location.pathname !== initialPathname) {
        trackPageView();
        
        initialPathname = window.location.pathname;
      }
    }, 300); 
  });

 
  window.websight.trackPageView = trackPageView;
  window.websight.trackEvent = function(eventName, eventProperties) {
    trigger(eventName, eventProperties);
  };
})();