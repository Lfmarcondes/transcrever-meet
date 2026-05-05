from app.providers import AIProviders
from app.schema import LeadMeetingSummary

class Pipeline:
    def __init__(self) -> None:
        self.providers = AIProviders()

    async def process_transcript(self, transcript: str, origem: str = 'texto_direto') -> LeadMeetingSummary:
        data = await self.providers.extract_with_fallback(transcript)
        data.setdefault('origem_transcricao', origem)
        data.setdefault('confianca_extracao', 75)
        return LeadMeetingSummary.model_validate(data)

    async def process_audio_file(self, audio_path: str) -> LeadMeetingSummary:
        transcript = self.providers.transcribe_local(audio_path)
        return await self.process_transcript(transcript, origem='faster_whisper_local')
