// Service Worker for Manifest V3
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Initialize storage
  chrome.storage.local.set({ 
    enabled: true,
    apiKey: '',
    settings: {}
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  switch (message.action) {
    case 'FETCH_DATA':
      fetchData(message.url)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error }));
      return true; // Keep message channel open for async response
    
    case 'GET_TAB_INFO':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ tab: tabs[0] });
      });
      return true;
    
    case 'SHOW_NOTIFICATION':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: message.title,
        message: message.message
      });
      break;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    // Handle shortcut
    console.log('Extension activated via shortcut');
  }
});

// Tab management
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Tab finished loading
    console.log('Tab loaded:', tab.url);
  }
});

// Example API call function
async function fetchData(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
}
