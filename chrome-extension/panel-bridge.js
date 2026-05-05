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

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg?.type) return;
  if (msg.type === 'MEETLEADS_PUSH_STATUS') window.postMessage({ type: 'MEETLEADS_STATUS', payload: msg.payload }, '*');
  if (msg.type === 'MEETLEADS_PUSH_RESULT') window.postMessage({ type: 'MEETLEADS_RESULT', payload: msg.payload }, '*');
  if (msg.type === 'MEETLEADS_PUSH_ERROR') window.postMessage({ type: 'MEETLEADS_ERROR', payload: msg.payload }, '*');
});

window.addEventListener('message', async (event) => {
  if (!event.data?.type) return;

  if (event.data.type === 'MEETLEADS_PING') {
    sendRuntimeMessage(
      { type: 'PING' },
      (resp) => window.postMessage({ type: 'MEETLEADS_STATUS', payload: `extensao conectada v${resp.version}` }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

  if (event.data.type === 'MEETLEADS_GET_STATE') {
    sendRuntimeMessage(
      { type: 'GET_STATE' },
      (resp) => window.postMessage({ type: 'MEETLEADS_STATE', payload: resp.state }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

  if (event.data.type === 'MEETLEADS_GET_KEYS') {
    sendRuntimeMessage(
      { type: 'GET_KEYS' },
      (resp) => window.postMessage({ type: 'MEETLEADS_KEYS', payload: resp.payload }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

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
      () => window.postMessage({ type: 'MEETLEADS_STATUS', payload: 'iniciando gravacao...' }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }

  if (event.data.type === 'MEETLEADS_STOP') {
    sendRuntimeMessage(
      { type: 'STOP_AND_PROCESS' },
      () => window.postMessage({ type: 'MEETLEADS_STATUS', payload: 'processando audio e gerando resumo...' }, '*'),
      (err) => window.postMessage({ type: 'MEETLEADS_ERROR', payload: err }, '*')
    );
  }
});
