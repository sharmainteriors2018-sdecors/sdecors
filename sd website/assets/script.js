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

  // Quote form -> Formspree (real emails, no fake "thank you" overlay)
  var form = document.getElementById('quote-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('form-success');
      var errorNote = document.getElementById('form-error');
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (errorNote) errorNote.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          form.style.display = 'none';
          if (note) note.style.display = 'block';
        } else {
          response.json().then(function (data) {
            if (errorNote) {
              errorNote.textContent = (data && data.errors) ?
                'Something went wrong. Please WhatsApp us instead.' :
                'Something went wrong. Please WhatsApp us instead.';
              errorNote.style.display = 'block';
            }
          }).catch(function () {
            if (errorNote) errorNote.style.display = 'block';
          });
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        }
      }).catch(function () {
        if (errorNote) errorNote.style.display = 'block';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      });
    });
  }

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
