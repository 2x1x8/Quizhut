document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['enabled', 'apiKey', 'settings'], (result) => {
    document.getElementById('toggleEnabled').checked = result.enabled || false;
    document.getElementById('apiKey').value = result.apiKey || '';
  });
  
  // Toggle extension
  document.getElementById('toggleEnabled').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'TOGGLE_EXTENSION', 
        enabled 
      });
    });
  });
  
  // Save API key
  document.getElementById('apiKey').addEventListener('change', (e) => {
    chrome.storage.local.set({ apiKey: e.target.value });
    showStatus('API key saved!', 'success');
  });
  
  // Execute action
  document.getElementById('executeBtn').addEventListener('click', () => {
    const action = document.getElementById('actionSelect').value;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: action.toUpperCase(),
        data: { apiKey: document.getElementById('apiKey').value }
      }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.success) {
          showStatus('Action completed successfully!', 'success');
        }
      });
    });
  });
  
  // Open options page
  document.getElementById('optionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Refresh page
  document.getElementById('refreshBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.reload(tabs[0].id);
    });
  });
  
  // Get current page info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      document.getElementById('pageTitle').textContent = 
        tabs[0].title || 'No title';
    }
  });
});

function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}
