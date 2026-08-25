import { useEffect } from 'react';

// Minimal head manager — no dependency. Updates title + meta + canonical per route.
// All URLs are relative (e.g. "/login", "/og-image.png") by design — no hardcoded domain.
// html lang="en" is set in index.html; we keep it in sync here for completeness.

function upsertMetaByName(name, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function upsertMetaProperty(property, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  if (!href) return;
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', href);
}

/**
 * @param {Object} opts
 * @param {string} [opts.title]        Full document.title
 * @param {string} [opts.description]  meta description + og:description + twitter:description
 * @param {string} [opts.canonical]    Relative canonical path, e.g. "/login" or "/" — written to link[rel=canonical] and og:url
 * @param {boolean}[opts.noIndex]      Adds meta robots noindex when true (auth/app pages)
 */
export function useSeo({ title, description, canonical, noIndex } = {}) {
  useEffect(() => {
    // lang attribution — index.html is lang="en"; keep it authoritative
    if (document.documentElement.lang !== 'en') document.documentElement.lang = 'en';

    if (title) {
      document.title = title;
      upsertMetaProperty('og:title', title);
      upsertMetaByName('twitter:title', title);
    }
    if (description) {
      upsertMetaByName('description', description);
      upsertMetaProperty('og:description', description);
      upsertMetaByName('twitter:description', description);
    }
    if (canonical) {
      upsertCanonical(canonical);
      upsertMetaProperty('og:url', canonical);
    }
    if (noIndex) upsertMetaByName('robots', 'noindex, nofollow');
    else {
      const el = document.querySelector('meta[name="robots"]');
      if (el && el.getAttribute('content') === 'noindex, nofollow') el.remove();
    }
  }, [title, description, canonical, noIndex]);
}
