// Handle translation requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'translate') {
    handleTranslation(message.text, message.mode)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Required for async response
  }
});

// Perform translation using QTEngine Server
async function handleTranslation(text, mode = 'selection') {
  const settings = await chrome.storage.sync.get(['serverUrl']);
  if (!settings.serverUrl) {
    throw new Error('QTEngine server URL not configured');
  }

  try {
    const response = await fetch(`${settings.serverUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        options: {
          mode: mode,
          source_lang: 'zh',
          target_lang: 'en'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Translation request failed');
    }

    const data = await response.json();
    return {
      translation: data.translated_text,
      metadata: data.metadata,
      mode: mode
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to connect to QTEngine server');
  }
}

// Handle full page translation
async function initiateFullPageTranslation(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'start-full-page-translation' });
  } catch (error) {
    console.error('Failed to send translation message:', error);
    throw error;
  }
}

// Listener for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'full-page-translate') {
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        console.error('No active tab found');
        sendResponse({ error: 'No active tab found' });
        return;
      }

      try {
        await initiateFullPageTranslation(tabs[0].id);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Translation failed:', error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Keep the message channel open for async response
  }
});

// Add command listener
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'full_page_translate':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'start-full-page-translation' });
        }
      });
      break;

    case 'show_keyboard_help':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'show-keyboard-help' });
        }
      });
      break;
  }
});
