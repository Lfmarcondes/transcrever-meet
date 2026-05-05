# Deploy Sem Terminal para Comercial

## Objetivo
Usuario final so usa navegador:
1. Acessa painel web
2. Clica iniciar
3. Clica parar
4. Vê resultado

## Publicar o painel no GitHub Pages
1. Criar repositorio no GitHub.
2. Subir pasta `product-web` como raiz do site.
3. Em Settings > Pages:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
4. URL final: `https://SEU_USUARIO.github.io/SEU_REPO/`

## Instalar extensao no Chrome (time interno)
1. Abrir `chrome://extensions`.
2. Ativar `Modo do desenvolvedor`.
3. Clicar `Carregar sem compactacao`.
4. Selecionar pasta `chrome-extension`.

## Uso operacional
1. Abrir Google Meet.
2. Abrir painel web publicado no GitHub Pages.
3. Clicar `Iniciar reuniao`.
4. Ao final, clicar `Parar e gerar resumo`.

## Situacao atual do MVP
- UX pronta (sem PowerShell para comercial).
- Captura de audio da aba pronta na extensao.
- Resultado ainda esta mockado no `background.js` para validar jornada.

## Proxima entrega (real)
- Substituir mock por transcricao local no browser (Whisper WebAssembly) e extracao JSON.
- Continuar 100% gratuito e sem servidor pago.
