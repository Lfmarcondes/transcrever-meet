let isRecording = false;
let activeTabId = null;

async function ensureOffscreenDocument() {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url]
  });
  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Gravar audio da aba do Google Meet para gerar resumo comercial'
  });
}

function findMeetTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
      resolve((tabs && tabs[0]) || null);
    });
  });
}

function runtimeSend(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(resp || { ok: false, error: 'sem resposta' });
    });
  });
}

async function startCapture() {
  if (isRecording) return { ok: false, error: 'ja existe gravacao em andamento' };

  const tab = await findMeetTab();
  if (!tab?.id) return { ok: false, error: 'Nenhuma aba do Google Meet aberta' };

  await ensureOffscreenDocument();

  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  const resp = await runtimeSend({ type: 'OFFSCREEN_START', streamId });
  if (!resp.ok) return resp;

  isRecording = true;
  activeTabId = tab.id;
  return { ok: true };
}

async function stopCaptureAndBuildMock() {
  if (!isRecording) return { ok: false, error: 'nao existe gravacao em andamento' };

  const stopResp = await runtimeSend({ type: 'OFFSCREEN_STOP' });
  if (!stopResp.ok) return stopResp;

  isRecording = false;

  const result = {
    lead_nome: '',
    data_reuniao: new Date().toISOString(),
    perfil_lead: {
      tipo: 'indeciso',
      nivel_experiencia: 'iniciante',
      ticket_estimado: '',
      prazo_decisao: ''
    },
    interesses: [],
    objecoes: [],
    dores_identificadas: [],
    gatilhos_que_mais_reagiu: [],
    nivel_engajamento: 0,
    probabilidade_fechamento: 0,
    proximos_passos: ['Fluxo de captura corrigido. Proximo passo: plugar transcricao real no audio capturado.'],
    resumo_geral: 'Captura start/stop da extensao funcionando com offscreen document.',
    origem_transcricao: 'chrome_tab_capture_mvp',
    confianca_extracao: 40
  };

  return { ok: true, payload: result };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FIND_MEET_TAB_AND_START') {
    startCapture().then(sendResponse).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg?.type === 'STOP_AND_PROCESS') {
    stopCaptureAndBuildMock().then(sendResponse).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});
