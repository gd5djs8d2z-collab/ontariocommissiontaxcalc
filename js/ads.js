// AdSense unit activation for Ontario Commission Tax Calculator
// Pushes AdSense ad units after page load
(function() {
  // Wait for AdSense script to load, then push ad units
  function pushAds() {
    var adUnits = document.querySelectorAll('.ad-unit .adsbygoogle');
    for (var i = 0; i < adUnits.length; i++) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // AdSense not loaded — ad units remain hidden via .ad-inactive
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pushAds);
  } else {
    pushAds();
  }
})();
