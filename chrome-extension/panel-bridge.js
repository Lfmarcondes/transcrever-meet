function sendRuntimeMessage(message, onOk, onError) {
  chrome.runtime.sendMessage(message, (resp) => {
    if (chrome.runtime.lastError) {
      onError(chrome.runtime.lastError.message || 'Erro de comunicacao com extensao');
      return;
    }
    if (!resp?.ok) {
      onError(resp?.error || 'Falha ao processar comando');
      return;
    }
    onOk(resp);
  });
}

window.addEventListener('message', async (event) => {
  if (!event.data?.type) return;

  if (event.data.type === 'MEETLEADS_SAVE_KEYS') {
    sendRuntimeMessage(
      { type: 'SAVE_KEYS', payload: event.data.payload || {} },
      () => window.postMessage({ type: 'MEETLEADS_STATUS', payload: 'chaves salvas com sucesso' }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

  if (event.data.type === 'MEETLEADS_START') {
    sendRuntimeMessage(
      { type: 'FIND_MEET_TAB_AND_START' },
      () => window.postMessage({ type: 'MEETLEADS_STATUS', payload: 'gravando reuniao' }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

  if (event.data.type === 'MEETLEADS_STOP') {
    sendRuntimeMessage(
      { type: 'STOP_AND_PROCESS' },
      (resp) => window.postMessage({ type: 'MEETLEADS_RESULT', payload: resp.payload }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }
});
