chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'getCompany') return;

  const parts = document.title.split('|');
  const first = parts[0].trim();

  if (!first || first === 'Salesforce') {
    sendResponse({ company: null });
  } else {
    sendResponse({ company: first });
  }

  return true;
});
