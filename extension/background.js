/**
 * Background service worker.
 *
 * Responsibilities:
 * - Toggle annotation mode on the active tab when the extension icon is clicked
 * - Capture visible tab as PNG when the content script requests a screenshot
 * - Bridge messages between the staging-site content script and the dashboard
 */

// Toggle annotation overlay on the active tab.
// The content script is already injected on all URLs via manifest content_scripts,
// so we just send the toggle message directly.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'ba:toggle' });
  } catch {
    // Content script may not be available on restricted pages (chrome://, arc://, etc.)
    console.warn('[BA] Could not toggle — content script not available on this page.');
  }
});

// Handle messages from content scripts.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ba:capture-tab') {
    // Capture the visible area of the sender's tab.
    chrome.tabs.captureVisibleTab(sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
    }).then((dataUrl) => {
      sendResponse({ ok: true, dataUrl });
    }).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // async response
  }

  if (msg.type === 'ba:send-to-dashboard') {
    // Find the dashboard tab and forward the screenshot.
    chrome.tabs.query({ url: ['http://localhost:4002/*', 'https://blendedagents.com/*', 'https://www.blendedagents.com/*'] }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'ba:screenshot-from-extension',
            dataUrl: msg.dataUrl,
          }).catch(() => { /* dashboard tab may not have content script */ });
        }
      }
      sendResponse({ ok: true, dashboardTabs: tabs.length });
    });
    return true; // async
  }
});

// Handle messages from the dashboard web page via externally_connectable.
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ba:ping') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (msg.type === 'ba:capture-active-tab') {
    chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
      format: 'png',
    }).then((dataUrl) => {
      sendResponse({ ok: true, dataUrl });
    }).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }
});
