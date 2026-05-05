# Meet Sales Intelligence (MVP)

Pipeline automatico para reunioes no Google Meet:

1. Captura de audio (bot/gravacao automatica)
2. Transcricao (faster-whisper local, com fallback AssemblyAI)
3. Extracao de insights (OpenRouter, fallback Grok)
4. Saida estruturada em JSON para CRM

## Stack
- Python 3.13
- FastAPI
- faster-whisper
- OpenRouter + xAI (Grok) + AssemblyAI

## Estrutura
- `app/main.py`: API principal
- `app/pipeline.py`: orquestracao
- `app/providers.py`: adaptadores de IA (fallback)
- `app/schema.py`: schema do resultado
- `app/prompts.py`: prompt de extracao

## Rodar local
```powershell
cd "C:\Users\luizf\OneDrive\Documents\New project"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

## Endpoints
- `GET /health`
- `POST /process-transcript` (entrada: transcript bruto)
- `POST /transcribe-file` (entrada: caminho arquivo local)

## Proximo passo operacional (sem comercial)
- Servico scheduler monitora agenda e aciona bot de reuniao.
- Bot salva audio em pasta monitorada.
- Worker chama `/transcribe-file` automaticamente.
