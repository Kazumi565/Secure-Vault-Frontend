# Secure Vault · Frontend

The React interface for [Secure Vault](https://github.com/Kazumi565/Secure-Vault), with file organization, upload progress, versions, trash, expiring sharing links, and account security controls.

## Development

Requires Node.js 22.12 or later and the matching v2 backend running on port 8000.

```powershell
npm ci
npm start
```

Open http://localhost:3000. Vite proxies `/api` to the backend. For another local API address, set `VAULT_API_TARGET` before starting Vite. No secrets belong in frontend environment variables.

## Checks

```powershell
npm run lint
npm run format:check
npm test
npm run build
npm audit
```

When checked out as the parent repository's `frontend` submodule, browser tests can also start a disposable backend:

```powershell
$env:VAULT_TEST_PYTHON = (Resolve-Path ..\.venv\Scripts\python.exe).Path
npx playwright install chromium
npm run test:e2e
```

The test fixture owns ports 3001 and 8001 and uses a temporary database and sample files. `CHROMIUM_EXECUTABLE_PATH` optionally selects an already installed Chromium executable.

## Build and serve

`npm run build` creates `dist/`. Serve it behind a same-origin `/api` reverse proxy. The included Nginx configuration and Dockerfile are used by the parent repository's Compose stack. `npm run preview` only previews static output; it does not start the backend or provide a production reverse proxy.

Authentication uses HttpOnly cookies and an in-memory CSRF token. localStorage contains theme/language preferences, not session credentials. Preview object URLs are created lazily and revoked on cleanup.

English and Romanian interface labels are available; explanatory copy and API errors currently remain English in some views.

Commit this repository before committing the parent repository's updated submodule pointer. Push this commit before pushing the backend change so that fresh clones can retrieve it.
