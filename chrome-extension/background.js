let mediaRecorder = null;
let chunks = [];

function findMeetTab(callback) {
  chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      callback(null);
      return;
    }
    callback(tabs[0]);
  });
}

function startCapture(tabId, sendResponse) {
  chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
    if (chrome.runtime.lastError || !stream) {
      sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'falha ao capturar audio' });
      return;
    }

    chunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.start(1000);
    sendResponse({ ok: true, tabId });
  });
}

function stopCaptureAndBuildMock(sendResponse) {
  if (!mediaRecorder) {
    sendResponse({ ok: false, error: 'nao existe gravacao em andamento' });
    return;
  }

  mediaRecorder.onstop = async () => {
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
      proximos_passos: ['Validar transcricao automatica na proxima versao'],
      resumo_geral: 'MVP de interface validado. Falta plugar transcricao real da extensao.',
      origem_transcricao: 'chrome_tab_capture_mvp',
      confianca_extracao: 20
    };

    mediaRecorder = null;
    chunks = [];
    sendResponse({ ok: true, payload: result });
  };

  mediaRecorder.stop();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FIND_MEET_TAB_AND_START') {
    findMeetTab((tab) => {
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'Nenhuma aba do Google Meet aberta' });
        return;
      }
      startCapture(tab.id, sendResponse);
    });
    return true;
  }

  if (msg?.type === 'STOP_AND_PROCESS') {
    stopCaptureAndBuildMock(sendResponse);
    return true;
  }
});
