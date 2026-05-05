async function getMeetTabId() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_MEET_TAB' }, (resp) => {
      resolve(resp?.tabId || null);
    });
  });
}

window.addEventListener('message', async (event) => {
  if (!event.data?.type) return;

  if (event.data.type === 'MEETLEADS_START') {
    chrome.runtime.sendMessage({ type: 'FIND_MEET_TAB_AND_START' }, (resp) => {
      if (!resp?.ok) {
        window.postMessage({ type: 'MEETLEADS_ERROR', payload: resp?.error || 'nao foi possivel iniciar' }, '*');
        return;
      }
      window.postMessage({ type: 'MEETLEADS_STATUS', payload: 'gravando reuniao' }, '*');
    });
  }

  if (event.data.type === 'MEETLEADS_STOP') {
    chrome.runtime.sendMessage({ type: 'STOP_AND_PROCESS' }, (resp) => {
      if (!resp?.ok) {
        window.postMessage({ type: 'MEETLEADS_ERROR', payload: resp?.error || 'nao foi possivel parar' }, '*');
        return;
      }
      window.postMessage({ type: 'MEETLEADS_RESULT', payload: resp.payload }, '*');
    });
  }
});
