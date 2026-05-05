chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PING_MEET_TAB') {
    sendResponse({ ok: true, tabUrl: location.href });
  }
});
