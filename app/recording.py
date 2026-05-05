from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

class RecorderManager:
    def __init__(self) -> None:
        self.process: Optional[subprocess.Popen] = None
        self.current_file: Optional[Path] = None
        self.out_dir = Path(r"C:\tmp\meet-recordings")
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def start(self, max_minutes: int = 120) -> str:
        if self.process and self.process.poll() is None:
            raise RuntimeError('Ja existe uma gravacao em andamento')

        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.current_file = self.out_dir / f'meet_{stamp}.wav'

        args = [
            'ffmpeg', '-y', '-f', 'wasapi', '-i', 'default',
            '-ac', '1', '-ar', '16000', '-t', str(max_minutes * 60),
            str(self.current_file)
        ]

        self.process = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return str(self.current_file)

    def stop(self) -> str:
        if not self.process or self.process.poll() is not None:
            raise RuntimeError('Nao ha gravacao em andamento')

        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)

        if not self.current_file:
            raise RuntimeError('Arquivo de gravacao nao identificado')

        return str(self.current_file)

    def status(self) -> dict:
        running = bool(self.process and self.process.poll() is None)
        return {
            'recording': running,
            'current_file': str(self.current_file) if self.current_file else ''
        }
