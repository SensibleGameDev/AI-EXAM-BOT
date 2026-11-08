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

## Quizzes, review and chat context

- Quizzes open one question at a time. Use Previous/Next, numbered buttons, or Show all. Answers, the current question, display mode and Return later flags survive reloads.
- Retry mistakes creates a fresh local attempt using only submitted incorrect or partially correct answers. It preserves the original attempt and makes no AI request. Statistics count submitted answers across attempts.
- Save as difficult adds a question to the browser's shared collection. Open Difficult questions in the sidebar to practice it across sessions. Single-answer and multiple-answer questions keep their own scoring rules in mixed collections. Remove a saved question with the same star button.
- Explanations and correct-answer highlighting appear only after submission.
- Include active exercise attaches the current question and selected answer to ordinary chat and /explain requests. It does not attach to new exercise generation or /summary. Ask about this selects an exact question, coding problem or flashcard and prepares a message without sending it.
- Context attachments omit quiz solutions before submission and unrevealed flashcard answers. Each request captures its own context, so changing the selected exercise while waiting does not change an in-flight request. Uncheck Include active exercise for unrelated topics.
- English, Russian and Kazakh apply to navigation, practice controls, tooltips and errors. Switching language preserves progress. Existing generated learning content and messages retain their original language; future AI responses use the selected language.

## Local checks

```sh
python -m http.server 5500 --bind 127.0.0.1
node --check app.js
node --check practice.js
node --check locales.js
node tests/regression.cjs
```

The static server previews the interface only. Real AI requests require Vercel or `vercel dev` with `DEEPSEEK_API_KEY` configured.

`/tests/preview.html` is a manual fixture with a long coding problem and a quiz. **Use it only on a disposable local origin:** it replaces local session data for that origin. All AI calls on this fixture page are mocked and captured in its hidden requestCapture element; no external AI call is made. Regenerate the fixture after markup changes with `python tests/make-preview.py`. The tests directory is excluded from Vercel deployments. Check mobile tabs, overflow, panel resizing, Focus, Clear, and quiz submission there.

PDF/DOCX/XLSX parsing remains in the browser using the existing CDN scripts. The CSP allows the PDF worker to load from that same CDN. Uploaded text is sent to the AI only as part of a request.
