document.addEventListener('DOMContentLoaded', function() {
  const autoTranslateCheckbox = document.getElementById('autoTranslate');
  const translateButton = document.getElementById('translatePage');
  const settingsIcon = document.getElementById('settingsIcon');
  const settingsPanel = document.getElementById('settingsPanel');
  const serverUrlInput = document.getElementById('serverUrlInput');
  const saveSettingsButton = document.getElementById('saveSettingsButton');
  const checkServerButton = document.getElementById('checkServerButton');
  const serverStatusIndicator = document.getElementById('serverStatusIndicator');
  const domainInput = document.getElementById('domain-input');
  const addDomainBtn = document.getElementById('add-domain-btn');
  const ignoredDomainsList = document.getElementById('ignored-domains-list');

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabs = document.querySelectorAll('.tab');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');

      // Remove active class from all buttons and tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabs.forEach(tab => tab.classList.remove('active'));

      // Add active class to clicked button and corresponding tab
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Load settings
  chrome.storage.sync.get(['autoTranslate', 'serverUrl', 'ignoredDomains'], function(result) {
    autoTranslateCheckbox.checked = result.autoTranslate || false;
    if (result.serverUrl) {
      serverUrlInput.value = result.serverUrl;
    }
    loadIgnoredDomains();
  });

  // Handle settings icon click
  settingsIcon.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent event from bubbling up
    settingsPanel.classList.toggle('visible');
  });

  // Close settings when clicking outside
  document.addEventListener('click', function(event) {
    if (!settingsPanel.contains(event.target) && 
        !settingsIcon.contains(event.target) && 
        settingsPanel.classList.contains('visible')) {
      settingsPanel.classList.remove('visible');
    }
  });

  // Prevent clicks inside settings panel from closing it
  settingsPanel.addEventListener('click', function(event) {
    event.stopPropagation();
  });

  // Handle server status check
  async function checkServerStatus(url) {
    try {
      // Show checking status
      serverStatusIndicator.className = 'server-status-indicator checking';

      const response = await fetch(`${url}/ping`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          serverStatusIndicator.className = 'server-status-indicator success';
          return true;
        }
      }
      serverStatusIndicator.className = 'server-status-indicator error';
      return false;
    } catch (error) {
      console.error('Server check failed:', error);
      serverStatusIndicator.className = 'server-status-indicator error';
      return false;
    }
  }

  // Handle check server button click
  checkServerButton.addEventListener('click', async function() {
    const serverUrl = serverUrlInput.value.trim();
    if (!serverUrl) {
      serverStatusIndicator.className = 'server-status-indicator error';
      return;
    }
    await checkServerStatus(serverUrl);
  });

  // Handle save settings button
  saveSettingsButton.addEventListener('click', function() {
    const serverUrl = serverUrlInput.value.trim();
    
    if (!serverUrl) {
      alert('Please enter a valid server URL');
      return;
    }

    // Save server URL
    chrome.storage.sync.set({ serverUrl: serverUrl }, function() {
      alert('Server URL saved successfully!');
      settingsPanel.classList.remove('visible');
    });
  });

  // Handle auto-translate toggle
  autoTranslateCheckbox.addEventListener('change', function() {
    const isEnabled = this.checked;
    chrome.storage.sync.set({ autoTranslate: isEnabled });

    // Send message to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'toggleAutoTranslate',
          enabled: isEnabled
        });
      });
    });
  });

  // Handle translate button click
  translateButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'start-full-page-translation'
      });
    });
  });

  // Domain Management
  // Load and display ignored domains
  function loadIgnoredDomains() {
    chrome.storage.sync.get(['ignoredDomains'], function(result) {
      const domains = result.ignoredDomains || [];
      ignoredDomainsList.innerHTML = domains.length > 0 
        ? domains.map(domain => `<p>${domain} <button class="remove-domain-btn" data-domain="${domain}">✕</button></p>`).join('')
        : '<p>No domains ignored</p>';
      
      // Add event listeners to remove domain buttons
      document.querySelectorAll('.remove-domain-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const domainToRemove = this.getAttribute('data-domain');
          chrome.storage.sync.get(['ignoredDomains'], function(result) {
            const updatedDomains = (result.ignoredDomains || []).filter(d => d !== domainToRemove);
            chrome.storage.sync.set({ ignoredDomains: updatedDomains }, loadIgnoredDomains);
          });
        });
      });
    });
  }

  // Add domain to ignore list
  addDomainBtn.addEventListener('click', function() {
    const domain = domainInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Basic domain validation
    if (domain && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      chrome.storage.sync.get(['ignoredDomains'], function(result) {
        const domains = result.ignoredDomains || [];
        if (!domains.includes(domain)) {
          domains.push(domain);
          chrome.storage.sync.set({ ignoredDomains: domains }, function() {
            domainInput.value = ''; // Clear input
            loadIgnoredDomains(); // Refresh list
          });
        } else {
          alert(`${domain} is already in the ignore list`);
        }
      });
    } else {
      alert('Please enter a valid domain (e.g., example.com)');
    }
  });

  // Keyboard Shortcuts Toggle
  const keyboardShortcuts = document.getElementById('keyboardShortcuts');
  const keyboardShortcutsToggle = document.getElementById('keyboardShortcutsToggle');
  const showKeyboardShortcutsBtn = document.getElementById('showKeyboardShortcutsBtn');

  // Load keyboard shortcuts visibility from storage
  chrome.storage.local.get(['keyboardShortcutsVisible'], function(result) {
    const isVisible = result.keyboardShortcutsVisible !== false; // Default to true
    updateKeyboardShortcutsVisibility(isVisible);
  });

  // Function to update keyboard shortcuts visibility
  function updateKeyboardShortcutsVisibility(isVisible) {
    keyboardShortcuts.classList.toggle('visible', isVisible);
    keyboardShortcutsToggle.textContent = isVisible ? 'Hide Shortcuts' : 'Show Shortcuts';
    showKeyboardShortcutsBtn.style.display = isVisible ? 'none' : 'flex';
  }

  // Toggle keyboard shortcuts visibility
  keyboardShortcutsToggle.addEventListener('click', function() {
    const isCurrentlyVisible = keyboardShortcuts.classList.contains('visible');
    
    updateKeyboardShortcutsVisibility(!isCurrentlyVisible);
    
    // Save visibility state
    chrome.storage.local.set({ 
      keyboardShortcutsVisible: !isCurrentlyVisible 
    });
  });

  // Show keyboard shortcuts button
  showKeyboardShortcutsBtn.addEventListener('click', function() {
    updateKeyboardShortcutsVisibility(true);
    chrome.storage.local.set({ keyboardShortcutsVisible: true });
  });

  // Keyboard Shortcuts for Translation
  document.addEventListener('keydown', function(event) {
    // Alt + T for full page translation
    if (event.altKey && event.key === 't') {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'start-full-page-translation'
        });
      });
    }

    // Alt + K to show keyboard shortcuts
    if (event.altKey && event.key === 'k') {
      updateKeyboardShortcutsVisibility(true);
      chrome.storage.local.set({ keyboardShortcutsVisible: true });
    }
  });
});
