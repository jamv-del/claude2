const URL_TEMPLATES = {
  salesNavSearch:      'https://www.linkedin.com/sales/search/company?keywords={name}',
  linkedinCompanyPage: 'https://www.linkedin.com/search/results/companies/?keywords={name}',
  recentHires:         'https://www.linkedin.com/sales/search/people?keywords={name}&recentlyJoined=PAST_90_DAYS',
  marketingContacts:   'https://www.linkedin.com/sales/search/people?keywords={name}&functionIncluded=10',
  allEmployees:        'https://www.linkedin.com/sales/search/people?keywords={name}',
};

const STORAGE_KEY = 'recentCompanies';
const MAX_RECENT = 10;

const input = document.getElementById('companyInput');
const chipsContainer = document.getElementById('chipsContainer');
const recentSection = document.getElementById('recentSection');

function buildUrl(template, company) {
  return template.replace('{name}', encodeURIComponent(company));
}

function openUrl(action) {
  const company = input.value.trim();
  if (!company) return;

  const template = URL_TEMPLATES[action];
  if (!template) return;

  chrome.tabs.create({ url: buildUrl(template, company) });
  saveRecent(company);
}

function saveRecent(company) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    let recents = result[STORAGE_KEY] || [];
    recents = recents.filter((c) => c.toLowerCase() !== company.toLowerCase());
    recents.unshift(company);
    recents = recents.slice(0, MAX_RECENT);
    chrome.storage.local.set({ [STORAGE_KEY]: recents }, () => {
      renderChips(recents);
    });
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
    });
    chipsContainer.appendChild(chip);
  });
}

function loadRecents() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    renderChips(result[STORAGE_KEY] || []);
  });
}

function detectCompany() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: 'getCompany' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded (non-Salesforce page) — leave input blank
        return;
      }
      if (response && response.company) {
        input.value = response.company;
      }
    });
  });
}

// Wire up buttons
document.querySelectorAll('.buttons button').forEach((btn) => {
  btn.addEventListener('click', () => openUrl(btn.dataset.action));
});

// Enter key triggers Sales Nav Search (default action)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') openUrl('salesNavSearch');
});

// Init
detectCompany();
loadRecents();
input.focus();
