import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from app.pipeline import Pipeline
from app.recording import RecorderManager

load_dotenv()
app = FastAPI(title='Meet Sales Intelligence API')
pipeline = Pipeline()
recorder = RecorderManager()

class TranscriptInput(BaseModel):
    transcript: str

class AudioInput(BaseModel):
    audio_path: str

@app.get('/health')
def health():
    return {'ok': True}

@app.get('/', response_class=HTMLResponse)
def home():
    with open('app/templates/index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.get('/recording/status')
def recording_status():
    return recorder.status()

@app.post('/recording/start')
def recording_start():
    try:
        path = recorder.start()
        return {'ok': True, 'audio_path': path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/recording/stop-and-process')
async def recording_stop_and_process():
    try:
        audio_path = recorder.stop()
        result = await pipeline.process_audio_file(audio_path)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/process-transcript')
async def process_transcript(payload: TranscriptInput):
    try:
        result = await pipeline.process_transcript(payload.transcript)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/transcribe-file')
async def transcribe_file(payload: AudioInput):
    if not os.path.exists(payload.audio_path):
        raise HTTPException(status_code=400, detail='Arquivo nao encontrado')
    try:
        result = await pipeline.process_audio_file(payload.audio_path)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
