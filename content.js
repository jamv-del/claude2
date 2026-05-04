const GENERIC_TITLE_SEGMENTS = new Set([
  'salesforce', 'lightning experience', 'accounts', 'contacts',
  'leads', 'opportunities', 'cases', 'home', 'chatter',
]);

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'getCompany') return;

  const { company, domain } = detect();
  sendResponse({ company, domain });
  return true;
});

function detect() {
  const segments = document.title.split('|').map((s) => s.trim()).filter(Boolean);

  let company = null;
  let domain  = null;

  for (const seg of segments) {
    if (GENERIC_TITLE_SEGMENTS.has(seg.toLowerCase())) continue;

    if (DOMAIN_RE.test(seg)) {
      // Title segment looks like a domain (e.g. "stasherbag.com | Accounts | Salesforce")
      if (!domain) domain = seg.toLowerCase();
    } else {
      // Normal company name segment
      if (!company) company = seg;
    }
  }

  // Also try to find the domain from the Website field link on the page,
  // which is more authoritative when it has loaded
  const pageDomain = detectDomainFromAnchors();
  if (pageDomain) domain = pageDomain;

  return { company, domain };
}

function detectDomainFromAnchors() {
  const anchors = document.querySelectorAll('a[href^="http"]');
  for (const a of anchors) {
    const href = a.getAttribute('href');
    const text = a.textContent.trim();
    if (!href || !text) continue;

    try {
      const url = new URL(href);
      if (/salesforce\.com|force\.com|google\.|microsoft\.|linkedin\.|facebook\.|twitter\.|instagram\.|youtube\./i.test(url.hostname)) continue;

      const hostname  = url.hostname.replace(/^www\./, '');
      const textClean = text.replace(/^www\./, '').replace(/\/$/, '');

      if (textClean === hostname && hostname.includes('.')) {
        return hostname;
      }
    } catch {
      // malformed href — skip
    }
  }
  return null;
}
