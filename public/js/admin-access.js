(function () {
  'use strict';

  var HERO_TITLE_TARGET = '.hero__title';
  var HOTSPOT_CLASS = 'admin-secret-hotspot';

  function openAdmin(event) {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = 'admin.html';
  }

  function addHotspotToHeroTitle(title) {
    if (!title || title.querySelector('.' + HOTSPOT_CLASS)) {
      return;
    }

    var text = title.textContent || '';
    var mIndex = text.toLowerCase().indexOf('m');
    if (mIndex === -1) {
      return;
    }

    title.textContent = '';
    title.appendChild(document.createTextNode(text.slice(0, mIndex)));

    var hotspot = document.createElement('span');
    hotspot.className = HOTSPOT_CLASS;
    hotspot.textContent = text.charAt(mIndex);
    hotspot.setAttribute('aria-hidden', 'true');
    hotspot.addEventListener('click', openAdmin);
    title.appendChild(hotspot);

    title.appendChild(document.createTextNode(text.slice(mIndex + 1)));
  }

  function initAdminAccess() {
    if (document.body && document.body.getAttribute('data-page') !== 'home') {
      return;
    }

    addHotspotToHeroTitle(document.querySelector(HERO_TITLE_TARGET));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminAccess);
  } else {
    initAdminAccess();
  }
}());
