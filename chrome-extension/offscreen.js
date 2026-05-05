let mediaRecorder = null;
let chunks = [];
let activeStream = null;
let audioContext = null;
let analyser = null;
let analyserTimer = null;
let rmsPeak = 0;

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

function resetAudioMeter() {
  rmsPeak = 0;
  if (analyserTimer) {
    clearInterval(analyserTimer);
    analyserTimer = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  analyser = null;
}

function startAudioMeter(stream) {
  resetAudioMeter();
  try {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    analyserTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (rms > rmsPeak) rmsPeak = rms;
    }, 200);
  } catch (_) {}
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
      const peak = rmsPeak;
      resetAudioMeter();
      mediaRecorder = null;
      activeStream = null;
      chunks = [];
      sendResponse({ ok: true, base64, audioPeak: peak, bytes: ab.byteLength });
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
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        sendResponse({ ok: false, error: 'Nenhum audio compartilhado. Marque compartilhar audio no seletor.' });
        return;
      }

      const audioOnlyStream = new MediaStream([audioTracks[0]]);
      activeStream = stream;
      chunks = [];
      startAudioMeter(audioOnlyStream);
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
