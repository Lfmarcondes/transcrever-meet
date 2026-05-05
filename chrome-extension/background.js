let isRecording = false;
const EXT_VERSION = '0.4.1';

const EXTRACTION_PROMPT = `Voce eh um analista comercial do mercado imobiliario.
Recebera a transcricao de uma reuniao com lead.
Retorne APENAS JSON valido no schema solicitado, sem markdown.`;

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Gravar audio da reuniao para resumo comercial' });
}

function runtimeSend(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
      resolve(resp || { ok: false, error: 'sem resposta' });
    });
  });
}

function chooseTabAudioStream(targetTab) {
  return new Promise((resolve, reject) => {
    if (!targetTab || !targetTab.id) return reject(new Error('Nao foi possivel identificar a aba de origem do painel.'));
    chrome.desktopCapture.chooseDesktopMedia(['tab', 'audio'], targetTab, (streamId) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!streamId) return reject(new Error('Selecao cancelada. Escolha a aba do Meet e marque compartilhar audio.'));
      resolve(streamId);
    });
  });
}

function decodeBase64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeJsonParse(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function postToPanel(panelTabId, type, payload) {
  try { await chrome.tabs.sendMessage(panelTabId, { type, payload }); } catch (_) {}
}

async function uploadToAssemblyAI(base64Audio, assemblyKey) {
  const bytes = decodeBase64ToBytes(base64Audio);
  const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST', headers: { authorization: assemblyKey, 'content-type': 'application/octet-stream' }, body: bytes
  });
  if (!uploadResp.ok) throw new Error('Falha upload AssemblyAI');
  const uploadData = await uploadResp.json();
  return uploadData.upload_url;
}

async function transcribeAssemblyAI(uploadUrl, assemblyKey) {
  const createResp = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST', headers: { authorization: assemblyKey, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: uploadUrl, language_code: 'pt' })
  });
  if (!createResp.ok) throw new Error('Falha ao criar transcricao');
  const createData = await createResp.json();

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${createData.id}`, { headers: { authorization: assemblyKey } });
    if (!poll.ok) throw new Error('Falha polling transcricao');
    const p = await poll.json();
    if (p.status === 'completed') return p.text || '';
    if (p.status === 'error') throw new Error(p.error || 'Erro na transcricao');
  }
  throw new Error('Timeout na transcricao');
}

async function extractOpenRouter(transcript, openrouterKey) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openrouterKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{ role: 'system', content: EXTRACTION_PROMPT }, { role: 'user', content: transcript }],
      response_format: { type: 'json_object' }
    })
  });
  if (!resp.ok) throw new Error('Falha OpenRouter');
  const data = await resp.json();
  return safeJsonParse(data.choices?.[0]?.message?.content || '{}');
}

async function extractGrok(transcript, grokKey) {
  const resp = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${grokKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [{ role: 'system', content: EXTRACTION_PROMPT }, { role: 'user', content: transcript }],
      response_format: { type: 'json_object' }
    })
  });
  if (!resp.ok) throw new Error('Falha Grok');
  const data = await resp.json();
  return safeJsonParse(data.choices?.[0]?.message?.content || '{}');
}

async function doStartCapture(panelTabId, targetTab) {
  if (isRecording) throw new Error('ja existe gravacao em andamento');
  const streamId = await chooseTabAudioStream(targetTab);
  await ensureOffscreenDocument();
  const resp = await runtimeSend({ type: 'OFFSCREEN_START', streamId });
  if (!resp.ok) throw new Error(resp.error || 'Falha ao iniciar gravacao');
  isRecording = true;
  await postToPanel(panelTabId, 'MEETLEADS_PUSH_STATUS', 'gravando reuniao');
}

async function stopCaptureOnly() {
  if (!isRecording) throw new Error('nao existe gravacao em andamento');
  const stopResp = await runtimeSend({ type: 'OFFSCREEN_STOP' });
  if (!stopResp.ok) throw new Error(stopResp.error || 'falha ao parar gravacao');
  isRecording = false;
  return stopResp.base64;
}

async function processPipeline(base64Audio, panelTabId) {
  const { assemblyKey, openrouterKey, grokKey } = await chrome.storage.local.get(['assemblyKey', 'openrouterKey', 'grokKey']);
  if (!assemblyKey) throw new Error('Configure AssemblyAI key no painel');
  if (!openrouterKey && !grokKey) throw new Error('Configure OpenRouter ou Grok key no painel');

  await postToPanel(panelTabId, 'MEETLEADS_PUSH_STATUS', 'transcrevendo audio...');
  const uploadUrl = await uploadToAssemblyAI(base64Audio, assemblyKey);
  const transcript = await transcribeAssemblyAI(uploadUrl, assemblyKey);

  await postToPanel(panelTabId, 'MEETLEADS_PUSH_STATUS', 'estruturando resumo...');
  let structured;
  try {
    if (!openrouterKey) throw new Error('sem openrouter');
    structured = await extractOpenRouter(transcript, openrouterKey);
  } catch (_) {
    if (!grokKey) throw new Error('Falha OpenRouter e Grok nao configurado');
    structured = await extractGrok(transcript, grokKey);
  }

  structured.data_reuniao = structured.data_reuniao || new Date().toISOString();
  structured.origem_transcricao = 'assemblyai_desktop_capture';
  if (typeof structured.confianca_extracao !== 'number') structured.confianca_extracao = 75;
  await postToPanel(panelTabId, 'MEETLEADS_PUSH_RESULT', structured);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const panelTabId = sender?.tab?.id;

  if (msg?.type === 'PING') {
    sendResponse({ ok: true, version: EXT_VERSION });
    return;
  }

  if (msg?.type === 'SAVE_KEYS') {
    chrome.storage.local.set({
      assemblyKey: msg.payload?.assembly || '',
      openrouterKey: msg.payload?.openrouter || '',
      grokKey: msg.payload?.grok || ''
    }).then(async () => {
      sendResponse({ ok: true });
      if (panelTabId) await postToPanel(panelTabId, 'MEETLEADS_PUSH_STATUS', 'chaves salvas com sucesso');
    }).catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true;
  }

  if (msg?.type === 'FIND_MEET_TAB_AND_START') {
    sendResponse({ ok: true, accepted: true });
    if (!panelTabId) return false;
    doStartCapture(panelTabId, sender?.tab).catch(async (e) => {
      await postToPanel(panelTabId, 'MEETLEADS_PUSH_ERROR', String(e?.message || e));
    });
    return false;
  }

  if (msg?.type === 'STOP_AND_PROCESS') {
    sendResponse({ ok: true, accepted: true });
    if (!panelTabId) return false;
    (async () => {
      const base64Audio = await stopCaptureOnly();
      await postToPanel(panelTabId, 'MEETLEADS_PUSH_STATUS', 'processando audio e gerando resumo...');
      await processPipeline(base64Audio, panelTabId);
    })().catch(async (e) => {
      await postToPanel(panelTabId, 'MEETLEADS_PUSH_ERROR', String(e?.message || e));
    });
    return false;
  }

  sendResponse({ ok: false, error: 'Mensagem desconhecida.' });
  return false;
});
