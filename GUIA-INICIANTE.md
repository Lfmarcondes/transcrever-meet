# Fluxo Comercial (2 cliques)

## 1) Setup inicial (uma vez)
```powershell
cd "C:\Users\luizf\OneDrive\Documents\New project"
.\01-setup.ps1
```

## 2) Configurar chaves
Abra `C:\Users\luizf\OneDrive\Documents\New project\.env` e preencha as chaves.

## 3) Abrir painel visual
```powershell
cd "C:\Users\luizf\OneDrive\Documents\New project"
.\02-start-painel.ps1
```

## 4) Uso pelo comercial
No navegador (http://127.0.0.1:8080):
1. Entrar na call no Google Meet.
2. Clicar em `Iniciar Gravacao`.
3. Ao final da call, clicar em `Parar e Processar`.
4. Copiar/usar o JSON exibido em tela.

Sem terminal durante a reuniao, so clique no painel.
