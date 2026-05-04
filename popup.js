const URL_TEMPLATES = {
  salesNavSearch:      'https://www.linkedin.com/sales/search/company?keywords={name}',
  linkedinCompanyPage: 'https://www.linkedin.com/search/results/companies/?keywords={name}',
  recentHires:         'https://www.linkedin.com/sales/search/people?keywords={name}&recentlyJoined=PAST_90_DAYS',
  marketingContacts:   'https://www.linkedin.com/sales/search/people?keywords={name}&functionIncluded=10',
  allEmployees:        'https://www.linkedin.com/sales/search/people?keywords={name}',
};

const STORAGE_KEY = 'recentCompanies';
const API_KEY_STORAGE = 'apolloApiKey';
const MAX_RECENT = 10;

// Elements — main view
const input         = document.getElementById('companyInput');
const directBtn     = document.getElementById('directSalesNav');
const directLabel   = document.getElementById('directLabel');
const chipsContainer = document.getElementById('chipsContainer');
const recentSection = document.getElementById('recentSection');
const settingsBtn   = document.getElementById('settingsBtn');

// Elements — settings view
const mainView    = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const backBtn     = document.getElementById('backBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn     = document.getElementById('saveBtn');
const saveMsg     = document.getElementById('saveMsg');

// ── URL helpers ──────────────────────────────────────────────────────────────

function buildUrl(template, company) {
  return template.replace('{name}', encodeURIComponent(company));
}

function extractLinkedInSlug(linkedinUrl) {
  if (!linkedinUrl) return null;
  const match = linkedinUrl.match(/linkedin\.com\/company\/([^/?#]+)/);
  return match ? match[1] : null;
}

function buildDirectSalesNavUrl(org) {
  // Prefer numeric UID for an exact match
  if (org.linkedin_uid) {
    return `https://www.linkedin.com/sales/company/${org.linkedin_uid}`;
  }
  const slug = extractLinkedInSlug(org.linkedin_url);
  if (slug) {
    return `https://www.linkedin.com/sales/company/${slug}`;
  }
  return null;
}

// ── Apollo enrichment ────────────────────────────────────────────────────────

async function enrichWithApollo({ domain, name }, apiKey) {
  // Domain lookup is more reliable than name; fall back to name if no domain
  const payload = domain ? { domain } : { name };
  try {
    const res = await fetch('https://api.apollo.io/v1/organizations/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.organization || null;
  } catch {
    return null;
  }
}

function setDirectBtnLoading() {
  directBtn.hidden = false;
  directBtn.disabled = true;
  directBtn.className = 'direct-btn';
  directLabel.textContent = 'Searching Apollo…';
}

function setDirectBtnReady(url) {
  directBtn.disabled = false;
  directBtn.className = 'direct-btn';
  directLabel.textContent = '↗ Open Company in Sales Nav';
  directBtn.onclick = () => {
    chrome.tabs.create({ url });
    saveRecent(input.value.trim());
  };
}

function setDirectBtnNotFound() {
  directBtn.disabled = true;
  directBtn.className = 'direct-btn not-found';
  directLabel.textContent = 'Company not found in Apollo';
}

function setDirectBtnHidden() {
  directBtn.hidden = true;
}

async function tryEnrich({ name, domain }) {
  chrome.storage.local.get([API_KEY_STORAGE], async (result) => {
    const apiKey = result[API_KEY_STORAGE];
    if (!apiKey) {
      setDirectBtnHidden();
      return;
    }

    setDirectBtnLoading();
    const org = await enrichWithApollo({ domain, name }, apiKey);

    if (!org) {
      setDirectBtnNotFound();
      return;
    }

    const url = buildDirectSalesNavUrl(org);
    if (url) {
      setDirectBtnReady(url);
    } else {
      setDirectBtnNotFound();
    }
  });
}

// ── Search buttons ───────────────────────────────────────────────────────────

function openSearchUrl(action) {
  const company = input.value.trim();
  if (!company) return;
  const template = URL_TEMPLATES[action];
  if (!template) return;
  chrome.tabs.create({ url: buildUrl(template, company) });
  saveRecent(company);
}

document.querySelectorAll('.buttons button').forEach((btn) => {
  btn.addEventListener('click', () => openSearchUrl(btn.dataset.action));
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') openSearchUrl('salesNavSearch');
});

// Re-run enrichment if user manually overrides the company name (no domain available)
input.addEventListener('change', () => {
  const company = input.value.trim();
  if (company) tryEnrich({ name: company, domain: null });
  else setDirectBtnHidden();
});

// ── Recent companies ─────────────────────────────────────────────────────────

function saveRecent(company) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    let recents = result[STORAGE_KEY] || [];
    recents = recents.filter((c) => c.toLowerCase() !== company.toLowerCase());
    recents.unshift(company);
    recents = recents.slice(0, MAX_RECENT);
    chrome.storage.local.set({ [STORAGE_KEY]: recents }, () => renderChips(recents));
  });
}

function renderChips(recents) {
  chipsContainer.innerHTML = '';
  if (!recents || recents.length === 0) {
    recentSection.classList.remove('visible');
    return;
  }
  recentSection.classList.add('visible');
  recents.forEach((company) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = company;
    chip.title = company;
    chip.addEventListener('click', () => {
      input.value = company;
      input.focus();
      tryEnrich({ name: company, domain: null });
    });
    chipsContainer.appendChild(chip);
  });
}

function loadRecents() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    renderChips(result[STORAGE_KEY] || []);
  });
}

// ── Settings view ────────────────────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  mainView.hidden = true;
  settingsView.hidden = false;
  chrome.storage.local.get([API_KEY_STORAGE], (result) => {
    apiKeyInput.value = result[API_KEY_STORAGE] || '';
  });
  apiKeyInput.focus();
});

backBtn.addEventListener('click', () => {
  settingsView.hidden = true;
  mainView.hidden = false;
  input.focus();
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  chrome.storage.local.set({ [API_KEY_STORAGE]: key }, () => {
    saveMsg.hidden = false;
    setTimeout(() => { saveMsg.hidden = true; }, 1800);
    // Re-run enrichment with new key if a company is already in the input
    const company = input.value.trim();
    if (company && key) tryEnrich({ name: company, domain: null });
  });
});

// ── Init ─────────────────────────────────────────────────────────────────────

function detectCompany() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: 'getCompany' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (!response) return;
      if (response.company) input.value = response.company;
      // Enrich using domain if found, otherwise fall back to company name
      const name = response.company;
      const domain = response.domain;
      if (name || domain) tryEnrich({ name, domain });
    });
  });
}

detectCompany();
loadRecents();
input.focus();
