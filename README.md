# AI Exam Coach

Static HTML/CSS/JavaScript frontend and one Vercel function. No build step, database, framework, or runtime packages to install.

## Deploy to Vercel

1. Import this repository. Select **Other** as the framework, leave Build Command unset, and use the repository root as the output directory.
2. Add `DEEPSEEK_API_KEY` in the Vercel project's environment variables, then deploy or redeploy.
3. Open `/`. The previous `/main.html` URL redirects to the same application.

`vercel.json` configures the API function for 60 seconds. The upstream request stops after 55 seconds and responses are capped at 4096 tokens. This duration fits [Vercel's Hobby function limits](https://vercel.com/docs/functions/limitations). DeepSeek usage is separate from Vercel hosting; free Vercel hosting does not supply AI credits.

## Workspace controls

- Drag the divider between chat and practice to resize. Arrow keys adjust it when focused; double-click or Home resets it. Width is saved in this browser.
- **Focus** expands practice; **Split view** or Escape returns to the conversation alongside it.
- The navigation button hides the desktop sidebar and opens the mobile/tablet drawer.
- On phones, **Chat / Practice** tabs switch views. Each pane scrolls independently, including long coding descriptions and wide code examples.
- Select previous exercises from the practice dropdown or **Open practice** in chat. **Clear** hides the exercise without deleting it from history.
- **Stop** cancels waiting for an answer. Changing sessions also cancels the pending request, preventing answers from appearing in the wrong chat. Browser cancellation does not guarantee that upstream AI billing stops.
- Sessions, quiz answers, material, and layout are stored locally in the browser. Export important sessions as Markdown; clearing browser storage removes local history.

## Local checks

```sh
python -m http.server 5500 --bind 127.0.0.1
node --check app.js
node tests/regression.cjs
```

The static server previews the interface only. Real AI requests require Vercel or `vercel dev` with `DEEPSEEK_API_KEY` configured.

`/tests/preview.html` is a manual fixture with a long coding problem and a quiz. **Use it only on a disposable local origin:** it replaces local session data for that origin. It never calls AI automatically and is excluded from Vercel deployments. Check mobile tabs, overflow, panel resizing, Focus, Clear, and quiz submission there.

PDF/DOCX/XLSX parsing remains in the browser using the existing CDN scripts. The CSP allows the PDF worker to load from that same CDN. Uploaded text is sent to the AI only as part of a request.
