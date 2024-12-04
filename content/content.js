let isAutoTranslateEnabled = false;
let translationBubble = null;
let isFullPageTranslated = false;

// Store original and translated content
const contentMemory = {
  originalTexts: new Map(),
  translatedTexts: new Map()
};

console.log('QTEngineEx Content Script Loaded');

// Color palette for dark theme
const UI_COLORS = {
  background: '#121212',     // Very dark background
  surface: '#1E1E1E',       // Slightly lighter surface
  primary: '#4CAF50',       // Material Design Green
  onPrimary: '#000000',     // Text on primary
  text: '#E0E0E0',          // Light gray text
  textSecondary: '#B0B0B0', // Softer gray
  border: '#333333',        // Dark border
  shadow: 'rgba(0,0,0,0.3)' // Subtle shadow
};

// Create translation bubble element
function createTranslationBubble() {
  if (document.getElementById('qt-translation-bubble')) {
    return document.getElementById('qt-translation-bubble');
  }
  
  const bubble = document.createElement('div');
  bubble.id = 'qt-translation-bubble';
  bubble.style.cssText = `
    display: none;
    position: fixed;
    background: ${UI_COLORS.surface};
    border: 1px solid ${UI_COLORS.border};
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 10px ${UI_COLORS.shadow};
    max-width: 350px;
    min-width: 250px;
    z-index: 2147483647;
    font-size: 16px;
    line-height: 1.6;
    color: ${UI_COLORS.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    pointer-events: auto;
  `;
  
  // Create a container for the bubble to ensure it stays on top
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;
  
  container.appendChild(bubble);
  document.body.appendChild(container);
  return bubble;
}

// Normalize Vietnamese text
function normalizeVietnameseText(text) {
  // Normalize combining diacritical marks
  text = text.normalize('NFC');
  
  // Fix common spacing issues with Vietnamese diacritics
  const diacriticRegex = /\p{Mark}+/gu;
  text = text.replace(diacriticRegex, (match) => match.trim());
  
  return text;
}

// Enhanced bubble positioning for mixed content
function positionBubble(bubble, selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleWidth = 350;  // Max width from previous implementation
  const bubbleHeight = bubble.offsetHeight;
  
  // Horizontal positioning with edge detection
  let leftPosition = rect.left + window.scrollX;
  if (leftPosition + bubbleWidth > viewportWidth) {
    leftPosition = viewportWidth - bubbleWidth - 20;  // 20px padding
  }
  
  // Vertical positioning with smarter placement
  const verticalSpacing = 10;
  const topPosition = rect.bottom + window.scrollY + verticalSpacing;
  const bottomPosition = rect.top + window.scrollY - bubbleHeight - verticalSpacing;
  
  const shouldPositionAbove = 
    (topPosition + bubbleHeight > viewportHeight + window.scrollY) ||
    (bottomPosition > 0);
  
  bubble.style.left = `${Math.max(0, leftPosition)}px`;
  bubble.style.top = shouldPositionAbove 
    ? `${bottomPosition}px`
    : `${topPosition}px`;
  
  // Smooth animation
  bubble.style.opacity = '0';
  bubble.style.display = 'block';
  bubble.style.transition = 'opacity 0.3s ease-in-out';
  
  // Force reflow to enable transition
  bubble.offsetHeight;
  bubble.style.opacity = '1';
}

// Enhanced accessibility and keyboard navigation
function setupAccessibilityFeatures() {
  // Keyboard shortcut for translation toggle
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+T for translation toggle
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      togglePageTranslation();
    }
    
    // Ctrl+Shift+H for help/guide
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
      showUserGuide();
    }
  });
}

// First-time user onboarding guide
function showUserGuide() {
  const guideOverlay = document.createElement('div');
  guideOverlay.id = 'qt-user-guide';
  guideOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 20000;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const guideContent = document.createElement('div');
  guideContent.style.cssText = `
    background: ${UI_COLORS.surface};
    color: ${UI_COLORS.text};
    padding: 30px;
    border-radius: 10px;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  `;
  
  guideContent.innerHTML = `
    <h2>Welcome to QTEngineEx Translation</h2>
    <p>Quick keyboard shortcuts:</p>
    <ul style="list-style-type: none; padding: 0;">
      <li><strong>Ctrl+Shift+T</strong>: Toggle Full Page Translation</li>
      <li><strong>Select Text</strong>: Instant Translation Bubble</li>
      <li><strong>Ctrl+Shift+H</strong>: Show This Guide</li>
    </ul>
    <button id="close-guide" style="
      background: ${UI_COLORS.primary};
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      margin-top: 20px;
      cursor: pointer;
    ">Got It!</button>
  `;
  
  guideOverlay.appendChild(guideContent);
  document.body.appendChild(guideOverlay);
  
  const closeButton = document.getElementById('close-guide');
  closeButton.addEventListener('click', () => {
    document.body.removeChild(guideOverlay);
  });
}

// Create translation toggle button
function createTranslationToggleButton() {
  const button = document.createElement('div');
  button.id = 'qt-translation-toggle';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${UI_COLORS.primary};
    color: ${UI_COLORS.onPrimary};
    padding: 12px 20px;
    border-radius: 4px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 2px 5px ${UI_COLORS.shadow};
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: background 0.3s ease;
  `;
  
  button.textContent = isFullPageTranslated ? 'Show Original' : 'Show Translated';

  button.addEventListener('mouseenter', () => {
    button.style.background = '#45a049'; // Darker green on hover
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = UI_COLORS.primary;
  });

  button.addEventListener('click', togglePageTranslation);
  
  return button;
}

// Create a loading indicator with dark theme
function createLoadingIndicator() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'qt-translation-loading';
  loadingIndicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${UI_COLORS.surface};
    color: ${UI_COLORS.text};
    padding: 15px 25px;
    border-radius: 4px;
    border: 1px solid ${UI_COLORS.border};
    z-index: 10000;
    box-shadow: 0 2px 5px ${UI_COLORS.shadow};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  // Add a spinning animation
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 20px;
    height: 20px;
    border: 3px solid ${UI_COLORS.primary};
    border-top: 3px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  // Add spinning keyframes
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);

  loadingIndicator.appendChild(spinner);
  return loadingIndicator;
}

// Toggle page translation
function togglePageTranslation() {
  const toggleButton = document.getElementById('qt-translation-toggle');
  
  if (!toggleButton) return;

  const textNodes = [];
  function collectTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && 
          parent.tagName !== 'SCRIPT' && 
          parent.tagName !== 'STYLE') {
        textNodes.push(node);
      }
    } else {
      for (let child of node.childNodes) {
        collectTextNodes(child);
      }
    }
  }
  collectTextNodes(document.body);

  if (isFullPageTranslated) {
    // Switch back to original
    textNodes.forEach(node => {
      const originalText = contentMemory.originalTexts.get(node);
      if (originalText) {
        node.textContent = originalText;
      }
    });
    
    toggleButton.textContent = 'Show Translated';
    isFullPageTranslated = false;
  } else {
    // Switch to translated
    textNodes.forEach(node => {
      // Store original text if not already stored
      if (!contentMemory.originalTexts.has(node)) {
        contentMemory.originalTexts.set(node, node.textContent);
      }
      
      const translatedText = contentMemory.translatedTexts.get(node);
      if (translatedText) {
        node.textContent = translatedText;
      }
    });
    
    toggleButton.textContent = 'Show Original';
    isFullPageTranslated = true;
  }
}

// Translate entire page
async function translateFullPage() {
  console.log('Starting full page translation');
  
  // Prevent multiple translations
  if (isFullPageTranslated) {
    console.log('Page already translated');
    return;
  }

  // Create a loading indicator with new dark theme style
  const loadingIndicator = createLoadingIndicator();
  loadingIndicator.textContent = 'Translating page...';
  document.body.appendChild(loadingIndicator);

  const textNodes = [];
  function collectTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && 
          parent.tagName !== 'SCRIPT' && 
          parent.tagName !== 'STYLE' && 
          node.textContent.trim().length > 1) {
        textNodes.push(node);
      }
    } else {
      for (let child of node.childNodes) {
        collectTextNodes(child);
      }
    }
  }
  collectTextNodes(document.body);

  const textToTranslate = textNodes
    .map(node => node.textContent)
    .filter(text => text.trim().length > 0)
    .join('\n');

  console.log(`Found ${textNodes.length} text nodes to translate`);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'translate',
      text: textToTranslate,
      mode: 'full-page'
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const translatedTexts = response.translation.split('\n');
    let translatedIndex = 0;

    textNodes.forEach(node => {
      // Store original text
      if (!contentMemory.originalTexts.has(node)) {
        contentMemory.originalTexts.set(node, node.textContent);
      }

      // Store and apply translated text
      if (translatedIndex < translatedTexts.length) {
        const translatedText = translatedTexts[translatedIndex];
        contentMemory.translatedTexts.set(node, translatedText);
        node.textContent = translatedText;
        translatedIndex++;
      }
    });

    isFullPageTranslated = true;
    loadingIndicator.textContent = 'Translation complete';
    
    // Create and add translation toggle button
    const toggleButton = createTranslationToggleButton();
    
    // Log additional debugging information
    console.log('Attempting to append toggle button to document body', {
      bodyExists: !!document.body,
      buttonExists: !!toggleButton
    });
    
    // Ensure button is added even if it seems not to be
    if (document.body && toggleButton) {
      document.body.appendChild(toggleButton);
      console.log('Toggle button appended to body');
    } else {
      console.error('Could not append toggle button - body or button is missing');
    }

    setTimeout(() => loadingIndicator.remove(), 2000);
  } catch (error) {
    console.error('Full page translation failed:', error);
    loadingIndicator.textContent = `Translation failed: ${error.message}`;
    setTimeout(() => loadingIndicator.remove(), 3000);
  }
}

// Handle text selection
function handleTextSelection(event) {
  console.log('Mouse up event triggered', {
    event: event,
    autoTranslateEnabled: isAutoTranslateEnabled,
    isFullPageTranslated: isFullPageTranslated,
    selectedText: window.getSelection().toString().trim()
  });

  // Always show translation bubble if page is NOT fully translated
  if (isFullPageTranslated) {
    console.log('Page already translated. Skipping bubble.');
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    console.log('Selection is empty or collapsed');
    if (translationBubble) {
      translationBubble.style.display = 'none';
    }
    return;
  }

  const selectedText = selection.toString().trim();
  console.log('Selected text details:', {
    text: selectedText,
    length: selectedText.length
  });

  if (!selectedText || selectedText.length <= 1) {
    console.log('Selected text is empty or too short');
    return;
  }

  if (!translationBubble) {
    translationBubble = createTranslationBubble();
  }

  translationBubble.textContent = 'Translating...';
  positionBubble(translationBubble, selection);

  chrome.runtime.sendMessage({
    type: 'translate',
    text: selectedText,
    mode: 'selection'
  }, (response) => {
    console.log('Translation response received:', {
      response: response,
      type: typeof response
    });
    
    if (response && response.error) {
      console.error('Translation error:', response.error);
      translationBubble.textContent = 'Translation failed';
      return;
    }

    if (response && response.translation) {
      translationBubble.textContent = response.translation;
    } else {
      console.error('Unexpected response format:', response);
      translationBubble.textContent = 'Unexpected translation result';
    }
  });
}

// Attach event listener with logging
function attachTextSelectionListener() {
  console.log('Attaching text selection listener');
  document.addEventListener('mouseup', handleTextSelection);
  console.log('Event listener added. Current listeners:', 
    document.querySelectorAll('*').length
  );
}

// Remove event listener with logging
function removeTextSelectionListener() {
  console.log('Removing text selection listener');
  document.removeEventListener('mouseup', handleTextSelection);
}

// Check if current domain is ignored
async function isDomainIgnored() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['ignoredDomains'], function(result) {
      const ignoredDomains = result.ignoredDomains || [];
      const currentDomain = window.location.hostname
        .replace(/^www\./, '')
        .toLowerCase();
      
      const isIgnored = ignoredDomains.some(domain => 
        currentDomain === domain.toLowerCase() || 
        currentDomain.endsWith('.' + domain.toLowerCase())
      );
      
      resolve(isIgnored);
    });
  });
}

// Dynamic Content Translation Observer
class DynamicContentTranslator {
  constructor() {
    this.observer = null;
    this.translationCache = new Map();
    this.processedNodes = new WeakSet();
    this.config = {
      childList: true,
      subtree: true,
      characterData: true
    };
  }

  // Efficiently check if text needs translation
  shouldTranslateText(text) {
    // Only check for empty or very short text
    return text && text.trim().length > 1;
  }

  // Translate a single text node
  async translateTextNode(textNode) {
    if (this.processedNodes.has(textNode)) return;
    
    const originalText = textNode.textContent.trim();
    if (!originalText) return;
    
    // Check cache first
    if (this.translationCache.has(originalText)) {
      textNode.textContent = this.translationCache.get(originalText);
      this.processedNodes.add(textNode);
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'translate',
        text: originalText,
        mode: 'dynamic'
      });

      if (response.translation) {
        // Normalize Vietnamese text before setting
        const normalizedTranslation = normalizeVietnameseText(response.translation);
        textNode.textContent = normalizedTranslation;
        this.translationCache.set(originalText, normalizedTranslation);
        this.processedNodes.add(textNode);
      }
    } catch (error) {
      console.error('Dynamic translation error:', error);
    }
  }

  // Recursively find and translate text nodes
  async processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (this.shouldTranslateText(node.textContent)) {
        await this.translateTextNode(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip script and style tags
      if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
        for (const childNode of node.childNodes) {
          await this.processNode(childNode);
        }
      }
    }
  }

  // Main mutation handler
  async handleMutations(mutations) {
    if (!isAutoTranslateEnabled) return;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          await this.processNode(node);
        }
      } else if (mutation.type === 'characterData') {
        await this.processNode(mutation.target);
      }
    }
  }

  // Start observing dynamic content
  start() {
    if (this.observer) {
      this.stop();
    }

    // Initialize a retry counter
    let retryCount = 0;
    const maxRetries = 3;

    const initializeObserver = () => {
      try {
        this.observer = new MutationObserver((mutations) => {
          // Use requestIdleCallback to avoid blocking the main thread
          if (window.requestIdleCallback) {
            window.requestIdleCallback(() => this.handleMutations(mutations));
          } else {
            setTimeout(() => this.handleMutations(mutations), 0);
          }
        });

        // Start with a smaller batch of mutations
        const observerConfig = {
          ...this.config,
          characterDataOldValue: true
        };

        this.observer.observe(document.body, observerConfig);
        console.log('Dynamic Content Translator started successfully');

        // Initial scan of existing content
        this.processNode(document.body);
      } catch (error) {
        console.error('Failed to start observer:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initializeObserver, 1000 * retryCount);
        }
      }
    };

    // Wait for document to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeObserver);
    } else {
      initializeObserver();
    }
  }

  // Stop observing
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log('Dynamic Content Translator stopped');
    }
  }
}

// Global dynamic translator instance
const dynamicTranslator = new DynamicContentTranslator();

// Initialize auto-translate state
async function initializeAutoTranslate() {
  try {
    const domainIgnored = await isDomainIgnored();
    
    if (domainIgnored) {
      console.log('Domain is ignored. Skipping auto-translation.');
      return;
    }

    chrome.storage.sync.get(['autoTranslate'], (settings) => {
      console.log('Loaded auto-translate settings:', {
        settings: settings,
        autoTranslate: settings.autoTranslate
      });
      
      isAutoTranslateEnabled = settings.autoTranslate || false;
      console.log('Initial auto-translate state:', isAutoTranslateEnabled);
      
      // Always attach text selection listener
      attachTextSelectionListener();
      
      if (isAutoTranslateEnabled) {
        // Start dynamic translator
        dynamicTranslator.start();

        // Existing full page translation logic
        if (document.readyState === 'complete') {
          translateFullPage();
        } else {
          window.addEventListener('load', translateFullPage);
        }
      }
    });
  } catch (error) {
    console.error('Error checking domain ignore status:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Received message in content script:', {
    message: message,
    sender: sender
  });

  if (message.type === 'toggleAutoTranslate') {
    isAutoTranslateEnabled = message.enabled;
    
    if (isAutoTranslateEnabled) {
      dynamicTranslator.start();
    } else {
      dynamicTranslator.stop();
    }
  } else if (message.type === 'start-full-page-translation') {
    await translateFullPage();
  } else if (message.type === 'show-keyboard-help') {
    showUserGuide();
  } else if (message.action === 'checkTranslation') {
    const domainIgnored = await isDomainIgnored();
    
    sendResponse({
      domainIgnored: domainIgnored,
      canTranslate: !domainIgnored && isAutoTranslateEnabled
    });
    return true;
  }
});

// Call setup functions
setupAccessibilityFeatures();

// First-time user experience
chrome.storage.local.get(['firstTimeUser'], (result) => {
  if (result.firstTimeUser !== false) {
    showUserGuide();
    chrome.storage.local.set({ firstTimeUser: false });
  }
});

// Initialize when script loads
initializeAutoTranslate();
