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
  if (!text) return text;
  
  // First normalize using NFC
  let normalized = text.normalize('NFC');
  
  // Replace any remaining combining marks that might be separated
  const combiningMarks = /[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  
  // First collect all words with potential combining marks
  const words = normalized.split(/\s+/);
  normalized = words.map(word => {
    // If word contains combining marks, ensure they're properly attached
    if (combiningMarks.test(word)) {
      return word.replace(/(.)([\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]+)/g, 
        (_, char, marks) => (char + marks).normalize('NFC')
      );
    }
    return word;
  }).join(' ');
  
  return normalized.normalize('NFC');
}

// Enhanced bubble positioning for mixed content
// Keep track of current selection for repositioning
let currentSelection = null;

function positionBubble(bubble, selection) {
  // Store selection for scroll handler
  currentSelection = selection;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleWidth = 350;  // Max width from previous implementation
  const bubbleHeight = bubble.offsetHeight;
  const verticalSpacing = 10;
  
  // Horizontal positioning with edge detection (relative to viewport for fixed positioning)
  let leftPosition = rect.left;  // Remove window.scrollX since using fixed positioning
  if (leftPosition + bubbleWidth > viewportWidth) {
    leftPosition = viewportWidth - bubbleWidth - 20;  // 20px padding
  }
  
  // Calculate available space above and below selection
  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;
  
  // Determine vertical position based on available space
  let topPosition;
  const shouldPositionAbove = (spaceBelow < bubbleHeight + verticalSpacing) &&
                             (spaceAbove >= bubbleHeight + verticalSpacing);
  
  if (shouldPositionAbove) {
    // Position above the selection if there's more space above or not enough space below
    topPosition = rect.top - bubbleHeight - verticalSpacing;  // Remove window.scrollY
  } else {
    // Position below the selection (default)
    topPosition = rect.bottom + verticalSpacing;  // Remove window.scrollY
  }
  
  // Apply positions
  bubble.style.left = `${Math.max(0, leftPosition)}px`;
  bubble.style.top = `${topPosition}px`;
  
  // Smooth animation
  bubble.style.opacity = '0';
  bubble.style.display = 'block';
  bubble.style.transition = 'opacity 0.3s ease-in-out';
  
  // Force reflow to enable transition
  bubble.offsetHeight;
  bubble.style.opacity = '1';
}

// Update bubble position on scroll
function updateBubblePosition() {
  if (translationBubble && currentSelection && translationBubble.style.display !== 'none') {
    positionBubble(translationBubble, currentSelection);
  }
}

// Add scroll event listener
window.addEventListener('scroll', updateBubblePosition, { passive: true });

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
  const textGroups = new Map(); // Define textGroups in the correct scope
  
  function collectTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && 
          parent.tagName !== 'SCRIPT' && 
          parent.tagName !== 'STYLE' && 
          node.textContent.trim().length > 1) {
        
        // Get structural path to identify similar content
        let structuralPath = '';
        let current = parent;
        while (current && current !== document.body) {
          structuralPath = current.tagName + (current.className ? '.' + current.className : '') + '>' + structuralPath;
          current = current.parentElement;
        }

        // Handle text content more carefully
        const text = node.textContent;
        const lines = text.split('\n');
        const isMultiline = lines.length > 1;

        const nodeInfo = {
          node: node,
          text: text,
          structuralPath: structuralPath,
          isMultiline: isMultiline,
          originalFormat: {
            lines: lines,
            lineBreaks: text.match(/\n/g)?.length || 0,
            leading: text.match(/^\s+/)?.[0] || '',
            trailing: text.match(/\s+$/)?.[0] || ''
          }
        };

        textNodes.push(nodeInfo);
        
        // Group similar nodes together, but keep multiline content separate
        const groupKey = isMultiline ? structuralPath + '_multiline' : structuralPath;
        if (!textGroups.has(groupKey)) {
          textGroups.set(groupKey, []);
        }
        textGroups.get(groupKey).push(nodeInfo);
      }
    } else {
      for (let child of node.childNodes) {
        collectTextNodes(child);
      }
    }
  }
  collectTextNodes(document.body);

  if (isFullPageTranslated) {
    // Stop dynamic translator before switching back to original
    if (isAutoTranslateEnabled) {
      dynamicTranslator.stop();
      // Clear processed nodes to allow re-translation when switching back
      dynamicTranslator.processedNodes = new WeakSet();
    }

    // Switch back to original
    textNodes.forEach(node => {
      const originalText = contentMemory.originalTexts.get(node.node);
      if (originalText) {
        node.node.textContent = originalText;
      }
    });
    toggleButton.textContent = 'Show Translated';
    isFullPageTranslated = false;
  } else {
    // Switch to translated
    textNodes.forEach(node => {
      if (!contentMemory.originalTexts.has(node.node)) {
        contentMemory.originalTexts.set(node.node, node.node.textContent);
      }
      const translatedText = contentMemory.translatedTexts.get(node.node);
      if (translatedText) {
        node.node.textContent = translatedText;
      }
    });
    toggleButton.textContent = 'Show Original';
    isFullPageTranslated = true;
    
    // Restart dynamic translator after switching to translated
    if (isAutoTranslateEnabled) {
      dynamicTranslator.start();
    }
  }
}

// Translate entire page
async function translateFullPage() {
  console.log('Starting full page translation');
  
  if (isFullPageTranslated) {
    console.log('Page already translated');
    return;
  }

  const loadingIndicator = createLoadingIndicator();
  loadingIndicator.textContent = 'Translating page...';
  document.body.appendChild(loadingIndicator);

  const textNodes = [];
  const textGroups = new Map();
  
  function collectTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && 
          parent.tagName !== 'SCRIPT' && 
          parent.tagName !== 'STYLE' && 
          node.textContent.trim().length > 1) {
        
        // Get structural path
        let structuralPath = '';
        let current = parent;
        let index = 0;
        while (current && current !== document.body) {
          const siblings = Array.from(current.parentElement?.children || []);
          const position = siblings.indexOf(current);
          structuralPath = `${current.tagName}[${position}]>${structuralPath}`;
          current = current.parentElement;
          index++;
        }

        // Create a unique key for each distinct content block
        const contentHash = node.textContent.trim().slice(0, 50);
        const uniqueKey = `${structuralPath}#${contentHash}`;

        // Preserve newlines and structure
        const text = node.textContent;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const lineBreaks = text.match(/\n/g)?.length || 0;
        const originalStructure = text.split('\n').map(line => ({
          content: line.trim(),
          indent: line.match(/^\s*/)[0],
          trailing: line.match(/\s*$/)[0]
        }));

        const nodeInfo = {
          node: node,
          text: text,
          lines: lines,
          structuralPath: structuralPath,
          uniqueKey: uniqueKey,
          originalFormat: {
            structure: originalStructure,
            lineBreaks: lineBreaks,
            leading: text.match(/^\s+/)?.[0] || '',
            trailing: text.match(/\s+$/)?.[0] || '',
            hasNewlines: lineBreaks > 0
          }
        };

        textNodes.push(nodeInfo);
        
        if (!textGroups.has(uniqueKey)) {
          textGroups.set(uniqueKey, []);
        }
        textGroups.get(uniqueKey).push(nodeInfo);
      }
    } else {
      for (let child of node.childNodes) {
        collectTextNodes(child);
      }
    }
  }
  
  collectTextNodes(document.body);
  console.log(`Found ${textNodes.length} text nodes to translate`);

  try {
    for (const [key, nodes] of textGroups) {
      // For each node in the group, preserve its structure
      for (const nodeInfo of nodes) {
        if (!contentMemory.originalTexts.has(nodeInfo.node)) {
          contentMemory.originalTexts.set(nodeInfo.node, nodeInfo.node.textContent);
        }

        // If the text has multiple lines, translate each line separately
        if (nodeInfo.originalFormat.hasNewlines && nodeInfo.lines.length > 0) {
          const response = await chrome.runtime.sendMessage({
            type: 'translate',
            text: nodeInfo.lines.join('\n'),
            mode: 'full-page'
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Split translated text back into lines and clean up any remaining original text
          const translatedLines = response.translation
            .split('\n')
            .map(line => {
              // Remove any remaining original Chinese/Japanese/Korean text
              return line.replace(/[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf]+/g, '').trim();
            })
            .filter(line => line.length > 0); // Remove empty lines after cleanup

          // Reconstruct the text with original formatting
          let finalText = '';
          let translatedIndex = 0;
          
          nodeInfo.originalFormat.structure.forEach((lineFormat, index) => {
            if (translatedIndex < translatedLines.length) {
              if (index > 0) finalText += '\n';
              finalText += lineFormat.indent + translatedLines[translatedIndex].trim() + lineFormat.trailing;
              translatedIndex++;
            }
          });

          // Apply the translation with preserved structure
          finalText = nodeInfo.originalFormat.leading + finalText.trim() + nodeInfo.originalFormat.trailing;
          contentMemory.translatedTexts.set(nodeInfo.node, finalText);
          nodeInfo.node.textContent = finalText;
        } else {
          // Single line translation
          const response = await chrome.runtime.sendMessage({
            type: 'translate',
            text: nodeInfo.text.trim(),
            mode: 'full-page'
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Clean up any remaining original text from the translation
          const cleanTranslation = response.translation
            .replace(/[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf]+/g, '')
            .trim();

          const finalText = nodeInfo.originalFormat.leading + 
                          cleanTranslation + 
                          nodeInfo.originalFormat.trailing;
          
          contentMemory.translatedTexts.set(nodeInfo.node, finalText);
          nodeInfo.node.textContent = finalText;
        }
      }
    }

    isFullPageTranslated = true;
    loadingIndicator.textContent = 'Translation complete';
    
    const toggleButton = createTranslationToggleButton();
    document.body.appendChild(toggleButton);
    
    if (isAutoTranslateEnabled) {
      dynamicTranslator.start();
    }

  } catch (error) {
    console.error('Translation error:', error);
    loadingIndicator.textContent = 'Translation failed: ' + error.message;
  } finally {
    setTimeout(() => {
      loadingIndicator.remove();
    }, 2000);
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
    try {
      // Skip if already processed
      if (this.processedNodes.has(textNode)) return;
      
      // Skip if node is not valid
      if (!textNode || !textNode.textContent) {
        console.debug('Invalid text node encountered');
        return;
      }
      
      // Normalize the input text before sending for translation
      const originalText = normalizeVietnameseText(textNode.textContent.trim());
      if (!originalText) return;

      // Store original text in contentMemory if not already stored
      if (!contentMemory.originalTexts.has(textNode)) {
        contentMemory.originalTexts.set(textNode, textNode.textContent);
      }
      
      // Check cache first
      if (this.translationCache.has(originalText)) {
        const cachedTranslation = this.translationCache.get(originalText);
        if (textNode.parentNode) { // Check parent exists before modifying
          // Store translated text in contentMemory
          contentMemory.translatedTexts.set(textNode, cachedTranslation);
          // Use direct text content update instead of node replacement
          textNode.textContent = normalizeVietnameseText(cachedTranslation);
          this.processedNodes.add(textNode);
        }
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'translate',
        text: originalText,
        mode: 'dynamic'
      });

      if (response.translation) {
        // Verify node is still in document and has parent
        if (!textNode.parentNode) {
          console.debug('Text node no longer in document');
          return;
        }

        // Double-check normalization of the response
        const normalizedTranslation = normalizeVietnameseText(response.translation);
        
        // Store translated text in contentMemory
        contentMemory.translatedTexts.set(textNode, normalizedTranslation);
        // Use direct text content update instead of node replacement
        textNode.textContent = normalizedTranslation;
        this.translationCache.set(originalText, normalizedTranslation);
        this.processedNodes.add(textNode);
      }
    } catch (error) {
      console.error('Dynamic translation error:', {
        error: error.message,
        nodeContent: textNode?.textContent,
        hasParent: !!textNode?.parentNode
      });
    }
  }

  // Recursively find and translate text nodes with debounce
  processNode(node) {
    if (!node) return;

    const processTextNode = async (textNode) => {
      if (this.shouldTranslateText(textNode.textContent)) {
        await this.translateTextNode(textNode);
      }
    };

    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip script and style tags
      const tagName = node.tagName?.toUpperCase();
      if (tagName !== 'SCRIPT' && tagName !== 'STYLE') {
        // Create a static array from childNodes to avoid live NodeList issues
        Array.from(node.childNodes).forEach(childNode => {
          this.processNode(childNode);
        });
      }
    }
  }

  // Main mutation handler with debounce
  handleMutations(mutations) {
    if (!isAutoTranslateEnabled) return;

    // Process mutations with debounce
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          // Skip if node is no longer in document
          if (document.contains(node)) {
            this.processNode(node);
          }
        }
      } else if (mutation.type === 'characterData') {
        // Skip if node is no longer in document
        if (document.contains(mutation.target)) {
          this.processNode(mutation.target);
        }
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
