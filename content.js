chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'getCompany') return;

  // Company name from title
  const parts = document.title.split('|');
  const first = parts[0].trim();
  const company = (!first || first === 'Salesforce') ? null : first;

  // Domain from the Website field link on the account page.
  // Salesforce renders it as an anchor whose text content matches its own href domain.
  const domain = detectDomain();

  sendResponse({ company, domain });
  return true;
});

function detectDomain() {
  const anchors = document.querySelectorAll('a[href^="http"]');
  for (const a of anchors) {
    const href = a.getAttribute('href');
    const text = a.textContent.trim();
    if (!href || !text) continue;

    try {
      const url = new URL(href);
      // Skip internal Salesforce / common non-company domains
      if (/salesforce\.com|force\.com|google\.|microsoft\.|linkedin\.|facebook\.|twitter\.|instagram\.|youtube\./i.test(url.hostname)) continue;

      const hostname = url.hostname.replace(/^www\./, '');
      const textClean = text.replace(/^www\./, '').replace(/\/$/, '');

      // The website field renders the domain as the link text
      if (textClean === hostname && hostname.includes('.')) {
        return hostname;
      }
    } catch {
      // malformed href — skip
    }
  }
  return null;
}
