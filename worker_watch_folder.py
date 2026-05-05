import asyncio
import json
from pathlib import Path
from app.pipeline import Pipeline

WATCH_DIR = Path(r'C:\tmp\meet-recordings')
OUT_DIR = Path(r'C:\tmp\meet-results')
SUPPORTED = {'.mp3', '.wav', '.m4a', '.mp4'}

async def main():
    WATCH_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pipeline = Pipeline()

    while True:
        for p in WATCH_DIR.iterdir():
            if p.suffix.lower() not in SUPPORTED:
                continue
            done = OUT_DIR / f'{p.stem}.json'
            if done.exists():
                continue
            try:
                result = await pipeline.process_audio_file(str(p))
                done.write_text(json.dumps(result.model_dump(), ensure_ascii=False, indent=2), encoding='utf-8')
                print(f'Processado: {p.name}')
            except Exception as e:
                print(f'Falha em {p.name}: {e}')
        await asyncio.sleep(10)

if __name__ == '__main__':
    asyncio.run(main())
