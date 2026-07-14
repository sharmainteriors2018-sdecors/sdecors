document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('menu-toggle');
  var closeBtn = document.getElementById('menu-close');
  var panel = document.getElementById('menu-panel');
  var overlay = document.getElementById('menu-overlay');

  function openMenu() {
    if (!panel || !overlay || !toggle) return;
    panel.classList.add('open');
    overlay.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!panel || !overlay || !toggle) return;
    panel.classList.remove('open');
    overlay.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (toggle) toggle.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
  if (panel) {
    panel.querySelectorAll('.menu-item-link, .pd-item').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  var productsTrigger = document.getElementById('products-trigger');
  var productsItem = document.getElementById('products-menu-item');
  if (productsTrigger && productsItem) {
    productsTrigger.addEventListener('click', function () {
      var isOpen = productsItem.classList.toggle('open');
      productsTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Quote form + Dealer application form -> Formspree (real emails).
  // Progressive enhancement: if JS is disabled, this whole block never runs
  // and the browser falls back to a normal form POST + Formspree's own
  // "_next" redirect to thank-you.html.
  function wireAjaxForm(form, defaultError) {
    if (!form) return;
    var DEFAULT_ERROR = defaultError || 'Something went wrong sending your enquiry. Please try again, or WhatsApp us at +91 83681 21845.';
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalLabel = submitBtn ? submitBtn.textContent : '';
    var isSubmitting = false;

    // Conditional measurement fields (quote form only): which field group
    // applies to which product category. Hidden groups use [hidden], so any
    // required fields inside them are automatically skipped by the browser's
    // constraint validation (elements that are not rendered are barred from
    // validation).
    var CATEGORY_GROUPS = {
      'Window Blinds': 'blinds',
      'Wallpaper': 'wallcovering',
      'Wall Panels': 'wallcovering',
      'Book-Match Panels': 'wallcovering',
      'UV Marble Sheets': 'wallcovering',
      '3D Panels': 'wallcovering',
      'Wooden Flooring': 'flooring',
      'Carpet Flooring': 'flooring',
      'More than one category': 'multi'
    };
    var categorySelect = form.querySelector('#category');
    var conditionalGroups = form.querySelectorAll('.conditional-fields');
    function updateConditionalFields() {
      if (!categorySelect) return;
      var group = CATEGORY_GROUPS[categorySelect.value] || '';
      conditionalGroups.forEach(function (el) {
        el.hidden = el.id !== 'fields-' + group;
      });
    }
    if (categorySelect) {
      categorySelect.addEventListener('change', updateConditionalFields);
      updateConditionalFields();
    }

    // File attachments: BOQs, drawings, site photos, business documents.
    // Validate type and size client-side so people get instant feedback
    // instead of a bounced email.
    var fileInput = form.querySelector('input[type="file"]');
    var fileError = form.querySelector('.file-error');
    var MAX_FILE_MB = 10;
    var ALLOWED_EXT = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'webp'];
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var files = Array.prototype.slice.call(fileInput.files);
        var problem = files.filter(function (f) {
          var ext = f.name.split('.').pop().toLowerCase();
          return f.size > MAX_FILE_MB * 1024 * 1024 || ALLOWED_EXT.indexOf(ext) === -1;
        })[0];
        if (problem && fileError) {
          fileError.textContent = '"' + problem.name + '" can\'t be attached — files must be under 10MB and a PDF, Excel, Word or image file. Please remove or replace it, or share large files over WhatsApp instead.';
          fileError.style.display = 'block';
          fileInput.value = '';
        } else if (fileError) {
          fileError.style.display = 'none';
        }
      });
    }

    function setState(state, message) {
      // Single source of truth: exactly one of idle / error / success is
      // visible at any time, so the two blocks can never show together.
      var errorNote = document.getElementById('form-error');
      var successNote = document.getElementById('form-success');
      if (errorNote) errorNote.style.display = 'none';
      if (successNote) successNote.style.display = 'none';
      form.style.display = 'block';

      if (state === 'error' && errorNote) {
        errorNote.textContent = message || DEFAULT_ERROR;
        errorNote.style.display = 'block';
        errorNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (state === 'success' && successNote) {
        form.style.display = 'none';
        successNote.style.display = 'block';
        successNote.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Sending…' : originalLabel;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      // Honeypot: if a bot filled the hidden field, silently pretend success.
      var honeypot = form.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        setState('success');
        return;
      }

      if (!form.checkValidity()) {
        setState('error', 'Please fill in all required fields with a valid phone number and email.');
        if (form.reportValidity) form.reportValidity();
        return;
      }

      isSubmitting = true;
      setLoading(true);
      setState('idle');

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          setState('success');
        } else {
          return response.json().then(function (data) {
            var message = (data && data.errors && data.errors.length && data.errors[0].message) ?
              'Please check your details: ' + data.errors[0].message :
              DEFAULT_ERROR;
            setState('error', message);
          }).catch(function () {
            setState('error');
          });
        }
      }).catch(function () {
        // Network failure / offline / Formspree unreachable.
        setState('error', 'Could not reach our server. Please check your connection, or WhatsApp us at +91 83681 21845.');
      }).finally(function () {
        isSubmitting = false;
        setLoading(false);
      });
    });
  }

  wireAjaxForm(document.getElementById('quote-form'), 'Something went wrong sending your enquiry. Please try again, or WhatsApp us at +91 83681 21845.');
  wireAjaxForm(document.getElementById('dealer-form'), 'Something went wrong sending your application. Please try again, or WhatsApp us at +91 83681 21845.');

  document.querySelectorAll('.deck-card').forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
      var href = card.getAttribute('data-href');
      if (href) window.location.href = href;
    });
  });

  // ---------- Scroll reveal: slow, delicate, eased entrance for each section ----------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------- Google testimonials: mock data, swap for a live feed later ----------
  // Replace this array with data from a Google Reviews API / widget when ready.
  // Source for now: https://share.google/2QWGIKd05RLraicWB
  var MOCK_REVIEWS = [
    {
      name: 'Ananya Kapoor',
      role: 'Interior Designer, Delhi NCR',
      rating: 5,
      snippet: 'Sent them a spec sheet for three flats and had samples in hand within two days. The UV marble sheets matched the render almost exactly.',
      initials: 'AK',
      avatarColor: '#16264A'
    },
    {
      name: 'Vikram Sethi',
      role: 'Site Contractor, Gurugram',
      rating: 5,
      snippet: 'Ordered blackout blinds for an office fit-out, 40 windows in total. Everything arrived on the date they quoted, no follow-up calls needed.',
      initials: 'VS',
      avatarColor: '#8A5A34'
    },
    {
      name: 'Meera Chandran',
      role: 'Homeowner, South Delhi',
      rating: 4,
      snippet: 'Good range of wallpaper to choose from and the team was patient while we picked. Installation took a little longer than expected but the finish is clean.',
      initials: 'MC',
      avatarColor: '#B4863E'
    }
  ];

  var GOOGLE_REVIEW_URL = 'https://share.google/2QWGIKd05RLraicWB';
  var STAR_PATH = 'M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z';

  function starsMarkup(rating) {
    var out = '';
    for (var i = 0; i < 5; i++) {
      var filled = i < rating;
      out += '<svg viewBox="0 0 20 20" fill="currentColor" style="opacity:' + (filled ? '1' : '.28') + '"><path d="' + STAR_PATH + '"/></svg>';
    }
    return out;
  }

  function reviewCardMarkup(review) {
    return (
      '<article class="review-card">' +
        '<div class="review-stars" aria-label="' + review.rating + ' out of 5 stars">' + starsMarkup(review.rating) + '</div>' +
        '<p class="review-snippet">\u201C' + review.snippet + '\u201D</p>' +
        '<div class="review-person">' +
          '<span class="review-avatar" aria-hidden="true" style="background:' + review.avatarColor + '">' + review.initials + '</span>' +
          '<div>' +
            '<span class="review-name-line">' +
              '<span class="review-name">' + review.name + '</span>' +
              '<svg class="review-verified" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified Google review"><path d="M12 2l2.4 1.2 2.6-.3 1.3 2.3 2.3 1.3-.3 2.6L21.5 11l-1.2 2.4.3 2.6-2.3 1.3-1.3 2.3-2.6-.3L12 21.5l-2.4-1.2-2.6.3-1.3-2.3-2.3-1.3.3-2.6L2.5 11l1.2-2.4-.3-2.6 2.3-1.3 1.3-2.3 2.6.3z"/><path d="M8.5 12.2l2.4 2.4 4.6-5.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>' +
            '<span class="review-meta">' + review.role + '</span>' +
          '</div>' +
        '</div>' +
        '<a class="review-source-link" href="' + GOOGLE_REVIEW_URL + '" target="_blank" rel="noopener noreferrer">Read more on Google</a>' +
      '</article>'
    );
  }

  var reviewGrid = document.getElementById('review-grid');
  if (reviewGrid) {
    reviewGrid.innerHTML = MOCK_REVIEWS.map(reviewCardMarkup).join('');
  }
});

// ---------------------------------------------------------------------------
// Structured Product Cards: zoomable thumbnail lightbox
// ---------------------------------------------------------------------------
(function () {
  var thumbs = document.querySelectorAll('.pc-thumb');
  if (!thumbs.length) return;

  var lightbox = document.createElement('div');
  lightbox.className = 'pc-lightbox';
  lightbox.innerHTML =
    '<button class="pc-lightbox-close" aria-label="Close zoomed image">&times;</button>' +
    '<img alt="">' +
    '<div class="pc-lightbox-caption"></div>';
  document.body.appendChild(lightbox);

  var img = lightbox.querySelector('img');
  var caption = lightbox.querySelector('.pc-lightbox-caption');

  function openLightbox(src, name) {
    img.src = src;
    img.alt = name || '';
    caption.textContent = name || '';
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
  }

  thumbs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      openLightbox(btn.getAttribute('data-zoom-img'), btn.getAttribute('data-zoom-name'));
    });
  });
  lightbox.querySelector('.pc-lightbox-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
})();

// ---------------------------------------------------------------------------
// Structured Product Cards: "Add to Enquiry" checklist, persisted locally
// and shareable via a floating WhatsApp send bar.
// ---------------------------------------------------------------------------
(function () {
  var checkboxes = document.querySelectorAll('.pc-enquiry-checkbox');
  if (!checkboxes.length) return;

  var STORAGE_KEY = 'sdecorsEnquiryList';
  var WHATSAPP_NUMBER = '918368121845';

  function readList() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function writeList(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage unavailable; enquiry list simply won't persist */
    }
  }

  var bar = document.createElement('div');
  bar.className = 'enquiry-bar';
  bar.innerHTML =
    '<span class="eb-count"></span>' +
    '<a class="btn btn-on-dark eb-send" target="_blank" rel="noopener">Send Enquiry</a>' +
    '<button class="eb-clear" type="button">Clear</button>';
  document.body.appendChild(bar);

  var countEl = bar.querySelector('.eb-count');
  var sendEl = bar.querySelector('.eb-send');
  var clearEl = bar.querySelector('.eb-clear');

  function refreshBar() {
    var list = readList();
    if (list.length === 0) {
      bar.classList.remove('visible');
      return;
    }
    bar.classList.add('visible');
    countEl.textContent = list.length + (list.length === 1 ? ' item selected' : ' items selected');
    var names = list.map(function (i) { return i.name + ' (' + i.sku + ')'; }).join(', ');
    var msg = 'Hi, I would like to enquire about the following products: ' + names + '. Could you share pricing and availability?';
    sendEl.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  function syncCheckboxes() {
    var list = readList();
    var skus = list.map(function (i) { return i.sku; });
    checkboxes.forEach(function (cb) {
      var sku = cb.getAttribute('data-sku');
      cb.checked = skus.indexOf(sku) !== -1;
      var card = cb.closest('.product-card');
      if (card) card.classList.toggle('in-enquiry', cb.checked);
    });
  }

  checkboxes.forEach(function (cb) {
    cb.addEventListener('change', function () {
      var list = readList();
      var sku = cb.getAttribute('data-sku');
      var name = cb.getAttribute('data-name');
      var card = cb.closest('.product-card');
      if (cb.checked) {
        if (!list.some(function (i) { return i.sku === sku; })) {
          list.push({ sku: sku, name: name });
        }
      } else {
        list = list.filter(function (i) { return i.sku !== sku; });
      }
      writeList(list);
      if (card) card.classList.toggle('in-enquiry', cb.checked);
      refreshBar();
    });
  });

  clearEl.addEventListener('click', function () {
    writeList([]);
    syncCheckboxes();
    refreshBar();
  });

  syncCheckboxes();
  refreshBar();
})();

// ---------------------------------------------------------------------------
// Faceted Filtering: search + checkbox facets (Product Type, Material,
// Finish, Colour, Application) built dynamically from the product cards
// already on the page, so the sidebar always stays in sync with the grid.
// ---------------------------------------------------------------------------
(function () {
  var grids = document.querySelectorAll('.catalog-layout .product-card-grid');
  if (!grids.length) return;

  var FACETS = ['type', 'material', 'finish', 'color', 'application'];

  grids.forEach(function (grid) {
    var layout = grid.closest('.catalog-layout');
    if (!layout) return;
    var sidebar = layout.querySelector('.filter-sidebar');
    if (!sidebar) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
    var facetValues = {};
    FACETS.forEach(function (f) { facetValues[f] = []; });

    cards.forEach(function (card) {
      FACETS.forEach(function (f) {
        var raw = card.getAttribute('data-' + f) || '';
        raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (v) {
          if (facetValues[f].indexOf(v) === -1) facetValues[f].push(v);
        });
      });
    });

    FACETS.forEach(function (f) {
      var container = sidebar.querySelector('[data-facet-options="' + f + '"]');
      if (!container) return;
      var values = facetValues[f].slice().sort();
      container.innerHTML = values.map(function (v, i) {
        var id = 'pf-' + f + '-' + i + '-' + Math.random().toString(36).slice(2, 7);
        return (
          '<label class="filter-option" for="' + id + '">' +
            '<input type="checkbox" value="' + v.replace(/"/g, '&quot;') + '" data-facet="' + f + '" id="' + id + '">' +
            '<span>' + v + '</span>' +
          '</label>'
        );
      }).join('');
    });

    var searchInput = sidebar.querySelector('#pf-search');
    var resultCount = layout.querySelector('#filter-result-count');
    var emptyNote = sidebar.querySelector('#filter-empty-note');

    function getSelected(f) {
      return Array.prototype.slice.call(sidebar.querySelectorAll('input[data-facet="' + f + '"]:checked'))
        .map(function (cb) { return cb.value; });
    }

    function applyFilters() {
      var selected = {};
      FACETS.forEach(function (f) { selected[f] = getSelected(f); });
      var query = (searchInput ? searchInput.value : '').trim().toLowerCase();
      var visibleCount = 0;

      cards.forEach(function (card) {
        var matches = true;
        FACETS.forEach(function (f) {
          if (!matches || selected[f].length === 0) return;
          var raw = (card.getAttribute('data-' + f) || '').split(',').map(function (s) { return s.trim(); });
          var hit = selected[f].some(function (v) { return raw.indexOf(v) !== -1; });
          if (!hit) matches = false;
        });
        if (matches && query) {
          var haystack = ((card.getAttribute('data-name') || '') + ' ' + (card.getAttribute('data-sku') || '')).toLowerCase();
          if (haystack.indexOf(query) === -1) matches = false;
        }
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      if (resultCount) resultCount.textContent = visibleCount + (visibleCount === 1 ? ' product' : ' products');
      if (emptyNote) emptyNote.hidden = visibleCount !== 0;
    }

    sidebar.addEventListener('change', function (e) {
      if (e.target.matches('input[data-facet]')) applyFilters();
    });
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    var resetBtn = sidebar.querySelector('#filter-reset');
    function resetFilters() {
      sidebar.querySelectorAll('input[data-facet]').forEach(function (cb) { cb.checked = false; });
      if (searchInput) searchInput.value = '';
      applyFilters();
    }
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    var emptyResetBtn = sidebar.querySelector('#filter-empty-reset');
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);

    var toggleBtn = layout.querySelector('#filter-toggle-btn');
    var closeBtn = sidebar.querySelector('#filter-sidebar-close');
    function openSidebar() {
      sidebar.classList.add('open');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    }
    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

    applyFilters();
  });
})();
