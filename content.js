const GENERIC_TITLE_SEGMENTS = new Set([
  'salesforce', 'lightning experience', 'accounts', 'contacts',
  'leads', 'opportunities', 'cases', 'home', 'chatter',
]);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'getCompany') return;

  const company = detectCompany();
  const domain  = detectDomain();

  sendResponse({ company, domain });
  return true;
});

function detectCompany() {
  const segments = document.title.split('|').map((s) => s.trim());
  for (const seg of segments) {
    if (seg && !GENERIC_TITLE_SEGMENTS.has(seg.toLowerCase())) {
      return seg;
    }
  }
  return null;
}

function detectDomain() {
  const anchors = document.querySelectorAll('a[href^="http"]');
  for (const a of anchors) {
    const href = a.getAttribute('href');
    const text = a.textContent.trim();
    if (!href || !text) continue;

    try {
      const url = new URL(href);
      if (/salesforce\.com|force\.com|google\.|microsoft\.|linkedin\.|facebook\.|twitter\.|instagram\.|youtube\./i.test(url.hostname)) continue;

      const hostname = url.hostname.replace(/^www\./, '');
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
