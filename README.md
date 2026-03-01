# AI Exam Coach (Deploy Ready)

## What was improved
- Security-first API flow:
  - **Netlify (recommended):** DeepSeek key stays server-side in a Netlify Function.
  - **GitHub Pages fallback:** optional session-only API key (not persisted).
- Exposed API key removed from client code.
- Security headers + CSP added.
- New **Practice Workspace** panel:
  - quizzes/coding/flashcards are no longer dumped inside chat;
  - chat stays clean and readable;
  - current practice stays pinned while you continue asking questions.
- Added **Kazakh language** support (Қазақша) in UI + AI responses.
- Input composer is pinned at the bottom for better usability.

## Netlify deployment (secure)
1. Push this folder to GitHub.
2. Import the repo in Netlify.
3. In Netlify project settings, add environment variable:
   - `DEEPSEEK_API_KEY=your_real_key_here`
4. Deploy.

`netlify.toml` and `netlify/functions/deepseek-proxy.js` are already included.

## GitHub Pages deployment (fallback)
- You can deploy static files normally.
- Open the app and click **Set Session API Key** in sidebar security section.
- Key is stored in `sessionStorage` only (cleared when session ends).

> Note: GitHub Pages cannot fully hide API keys (no server-side runtime).

## Debug in VS Code (local, no Netlify required)
1. Open this folder in VS Code.
2. Go to **Run and Debug**.
3. Start **Debug AI Exam Coach (Edge)** or **Debug AI Exam Coach (Chrome)**.
4. VS Code will automatically run a local HTTP server on port `5500` and open the app.
5. In local mode, if proxy is unavailable, use **Set Session API Key** in the sidebar.

Files added for debugging:
- `.vscode/launch.json`
- `.vscode/tasks.json`
