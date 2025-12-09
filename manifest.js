{
  "manifest_version": 3,
  "name": "My Awesome Extension",
  "version": "1.0.0",
  "description": "A powerful browser extension",
  "author": "Your Name",
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "Click to open popup",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  },
  
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "tabs",
    "notifications"
  ],
  
  "host_permissions": [
    "https://api.example.com/*",
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  
  "options_page": "options.html",
  
  "web_accessible_resources": [
    {
      "resources": ["injected.js", "styles.css"],
      "matches": ["<all_urls>"]
    }
  ],
  
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      }
    }
  }
}
