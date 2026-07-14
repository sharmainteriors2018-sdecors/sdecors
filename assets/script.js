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
