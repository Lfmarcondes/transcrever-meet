import json
import os
from typing import Optional
import httpx
from faster_whisper import WhisperModel
from app.prompts import PROMPT_EXTRACAO

class AIProviders:
    def __init__(self) -> None:
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
        self.grok_key = os.getenv('GROK_API_KEY', '')
        self.assembly_key = os.getenv('ASSEMBLYAI_API_KEY', '')
        self.openrouter_model = os.getenv('DEFAULT_MODEL_OPENROUTER', 'openrouter/auto')
        self.grok_model = os.getenv('DEFAULT_MODEL_GROK', 'grok-3-mini')

    def transcribe_local(self, audio_path: str) -> str:
        model = WhisperModel('small', device='cuda', compute_type='float16')
        segments, _ = model.transcribe(audio_path, language='pt')
        return '\n'.join(s.text.strip() for s in segments if s.text)

    async def transcribe_assemblyai(self, audio_url: str) -> str:
        if not self.assembly_key:
            raise RuntimeError('ASSEMBLYAI_API_KEY ausente')
        headers = {'authorization': self.assembly_key, 'content-type': 'application/json'}
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post('https://api.assemblyai.com/v2/transcript', headers=headers, json={
                'audio_url': audio_url,
                'language_code': 'pt'
            })
            r.raise_for_status()
            tid = r.json()['id']
            while True:
                s = await client.get(f'https://api.assemblyai.com/v2/transcript/{tid}', headers=headers)
                s.raise_for_status()
                data = s.json()
                if data['status'] == 'completed':
                    return data.get('text', '')
                if data['status'] == 'error':
                    raise RuntimeError(data.get('error', 'erro assemblyai'))

    async def _openrouter_extract(self, transcript: str) -> dict:
        if not self.openrouter_key:
            raise RuntimeError('OPENROUTER_API_KEY ausente')
        headers = {
            'Authorization': f'Bearer {self.openrouter_key}',
            'Content-Type': 'application/json'
        }
        body = {
            'model': self.openrouter_model,
            'messages': [
                {'role': 'system', 'content': PROMPT_EXTRACAO},
                {'role': 'user', 'content': transcript}
            ],
            'response_format': {'type': 'json_object'}
        }
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=body)
            r.raise_for_status()
            content = r.json()['choices'][0]['message']['content']
            return json.loads(content)

    async def _grok_extract(self, transcript: str) -> dict:
        if not self.grok_key:
            raise RuntimeError('GROK_API_KEY ausente')
        headers = {
            'Authorization': f'Bearer {self.grok_key}',
            'Content-Type': 'application/json'
        }
        body = {
            'model': self.grok_model,
            'messages': [
                {'role': 'system', 'content': PROMPT_EXTRACAO},
                {'role': 'user', 'content': transcript}
            ],
            'response_format': {'type': 'json_object'}
        }
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post('https://api.x.ai/v1/chat/completions', headers=headers, json=body)
            r.raise_for_status()
            content = r.json()['choices'][0]['message']['content']
            return json.loads(content)

    async def extract_with_fallback(self, transcript: str) -> dict:
        try:
            return await self._openrouter_extract(transcript)
        except Exception:
            return await self._grok_extract(transcript)
