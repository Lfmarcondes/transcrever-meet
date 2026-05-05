let mediaRecorder = null;
let chunks = [];
let activeStream = null;

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

async function stopInternal(sendResponse) {
  if (!mediaRecorder) {
    sendResponse({ ok: false, error: 'nao havia gravacao ativa' });
    return;
  }

  mediaRecorder.onstop = async () => {
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const ab = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(ab);
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      activeStream = null;
      chunks = [];
      sendResponse({ ok: true, base64 });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  };

  mediaRecorder.stop();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'OFFSCREEN_START') {
    navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    }).then((stream) => {
      // Mantemos apenas audio para reduzir payload e evitar falhas no STT
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        sendResponse({ ok: false, error: 'Nenhum audio compartilhado. Marque compartilhar audio no seletor.' });
        return;
      }

      const audioOnlyStream = new MediaStream([audioTracks[0]]);
      activeStream = stream;
      chunks = [];
      mediaRecorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start(1000);
      sendResponse({ ok: true });
    }).catch((err) => {
      sendResponse({ ok: false, error: String(err?.message || err) });
    });
    return true;
  }

  if (msg?.type === 'OFFSCREEN_STOP') {
    stopInternal(sendResponse);
    return true;
  }
});

self.addEventListener('error', () => {});
self.addEventListener('unhandledrejection', () => {});
