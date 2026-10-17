/* Website IDAIDO BOT — interaksi ringan (menu, tahun, pencarian perintah). */
(function () {
  'use strict';

  // Tahun di footer
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Menu mobile
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Pencarian & filter daftar perintah
  var search = document.getElementById('commandSearch');
  var chips = document.getElementById('commandChips');
  var access = document.getElementById('accessFilter');
  var rows = document.getElementById('commandRows');
  var noResult = document.getElementById('noResult');

  if (!rows) {
    return;
  }

  var allRows = Array.prototype.slice.call(rows.querySelectorAll('tr'));
  var activeCategory = 'all';

  function matchesAccess(row, value) {
    if (value === 'all') return true;
    var rowAccess = row.getAttribute('data-access') || 'all';
    if (value === 'allusers') return rowAccess === 'all';
    if (value === 'admin') return rowAccess === 'admin' || rowAccess === 'owner';
    if (value === 'owner') return rowAccess === 'owner';
    return true;
  }

  function apply() {
    var query = (search && search.value ? search.value : '').trim().toLowerCase();
    var accessValue = access ? access.value : 'all';
    var shown = 0;

    allRows.forEach(function (row) {
      var category = row.getAttribute('data-category') || '';
      var haystack = row.getAttribute('data-search') || '';

      var okCategory = activeCategory === 'all' || category === activeCategory;
      var okSearch = !query || haystack.indexOf(query) !== -1;
      var okAccess = matchesAccess(row, accessValue);

      var visible = okCategory && okSearch && okAccess;
      row.hidden = !visible;
      if (visible) shown++;
    });

    if (noResult) {
      noResult.hidden = shown !== 0;
    }
  }

  if (search) {
    search.addEventListener('input', apply);
  }

  if (access) {
    access.addEventListener('change', apply);
  }

  if (chips) {
    chips.addEventListener('click', function (event) {
      var button = event.target.closest('.chip');
      if (!button) return;

      Array.prototype.forEach.call(chips.querySelectorAll('.chip'), function (chip) {
        chip.classList.remove('active');
      });
      button.classList.add('active');
      activeCategory = button.getAttribute('data-filter') || 'all';
      apply();
    });
  }
})();
