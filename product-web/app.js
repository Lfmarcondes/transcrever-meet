const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveKeysBtn = document.getElementById('saveKeysBtn');
const assemblyInput = document.getElementById('assemblyKey');
const openrouterInput = document.getElementById('openrouterKey');
const groqInput = document.getElementById('groqKey');

function setStatus(msg){ statusEl.textContent = `Status: ${msg}`; }
function loadLocalKeys() {
  assemblyInput.value = localStorage.getItem('meetleads_assembly') || '';
  openrouterInput.value = localStorage.getItem('meetleads_openrouter') || '';
  groqInput.value = localStorage.getItem('meetleads_groq') || localStorage.getItem('meetleads_grok') || '';
}
function saveLocalKeys(payload) {
  localStorage.setItem('meetleads_assembly', payload.assembly || '');
  localStorage.setItem('meetleads_openrouter', payload.openrouter || '');
  localStorage.setItem('meetleads_groq', payload.groq || ''); localStorage.setItem('meetleads_grok', payload.groq || '');
}
function pingExtension() { window.postMessage({ type: 'MEETLEADS_PING' }, '*'); }
function pullState() { window.postMessage({ type: 'MEETLEADS_GET_STATE' }, '*'); }

saveKeysBtn.onclick = () => {
  const payload = {
    assembly: assemblyInput.value.trim(),
    openrouter: openrouterInput.value.trim(),
    groq: groqInput.value.trim()
  };
  saveLocalKeys(payload);
  setStatus('salvando chaves...');
  window.postMessage({ type: 'MEETLEADS_SAVE_KEYS', payload }, '*');
};

startBtn.onclick = async () => {
  setStatus('abra o seletor e escolha a aba do Meet com audio');
  window.postMessage({ type: 'MEETLEADS_START' }, '*');
};

stopBtn.onclick = async () => {
  setStatus('finalizando reuniao e processando (pode levar 1-3 min)...');
  window.postMessage({ type: 'MEETLEADS_STOP' }, '*');
};

window.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;
  if (event.data.type === 'MEETLEADS_STATUS') setStatus(event.data.payload || 'ok');
  if (event.data.type === 'MEETLEADS_RESULT') {
    outputEl.textContent = JSON.stringify(event.data.payload, null, 2);
    setStatus('resumo gerado com sucesso');
  }
  if (event.data.type === 'MEETLEADS_STATE') {
    const st = event.data.payload || {};
    if (st.status) setStatus(st.status);
    if (st.result) outputEl.textContent = JSON.stringify(st.result, null, 2);
    if (st.error) setStatus(`erro: ${st.error}`);
  }
  if (event.data.type === 'MEETLEADS_ERROR') setStatus(`erro: ${event.data.payload}`);
});

loadLocalKeys();
setStatus('conectando extensao...');
setTimeout(pingExtension, 200);
setInterval(pullState, 1500);
setTimeout(() => {
  if (statusEl.textContent.includes('conectando')) {
    setStatus('extensao nao conectada. Atualize em edge://extensions e recarregue a pagina.');
  }
}, 2000);

