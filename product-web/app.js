const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveKeysBtn = document.getElementById('saveKeysBtn');

function setStatus(msg){ statusEl.textContent = `Status: ${msg}`; }

saveKeysBtn.onclick = () => {
  const payload = {
    assembly: document.getElementById('assemblyKey').value.trim(),
    openrouter: document.getElementById('openrouterKey').value.trim(),
    grok: document.getElementById('grokKey').value.trim()
  };
  window.postMessage({ type: 'MEETLEADS_SAVE_KEYS', payload }, '*');
};

startBtn.onclick = async () => {
  setStatus('enviando comando para extensao...');
  window.postMessage({ type: 'MEETLEADS_START' }, '*');
};

stopBtn.onclick = async () => {
  setStatus('finalizando reuniao...');
  window.postMessage({ type: 'MEETLEADS_STOP' }, '*');
};

window.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'MEETLEADS_STATUS') {
    setStatus(event.data.payload || 'ok');
  }

  if (event.data.type === 'MEETLEADS_RESULT') {
    outputEl.textContent = JSON.stringify(event.data.payload, null, 2);
    setStatus('resumo gerado');
  }

  if (event.data.type === 'MEETLEADS_ERROR') {
    setStatus(`erro: ${event.data.payload}`);
  }
});
