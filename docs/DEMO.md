# Interactive demo

The GitHub Pages demo runs the existing interface with a separate browser-only data adapter. It is intended for exploring the project without creating an account or operating a server.

## What visitors can try

- Sample folders, file search, tag filtering, sorting, and editable file details.
- Local file selection with simulated progress, cancellation, a 5 MiB per-file limit, and a 32 MiB total memory quota.
- File versions, restoring earlier contents, local downloads, and supported media previews.
- Trash, restoration, permanent deletion, and activity history.
- Sharing previews with a fixed optional demo code (`123456`), expiration, download limits, and revocation.
- A sample profile, simulated session revocation and two-factor state, light/dark themes, and mobile layouts.

Files and changes live in memory in the current tab. Refreshing or closing the tab discards them. Reset demo also returns to the file list. Theme and language preferences use the existing local preference storage. Different tabs have independent vaults.

Preview sharing links work only through the **Open local preview** button in the same tab. They do not publish files or grant access to another person. No real passwords should be entered: the preview uses the fixed code above. Encryption, authentication, email, public sharing, and administrator operations require the real backend and are not active here.

The sample workspace image is the project's existing documentation screenshot. All other sample files are small fictitious documents supplied with the demo.

## Local checks

Requires Node.js 22.12 or later. No Python server is needed.

```powershell
npm ci
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:demo
```

The browser suite builds the static demo and serves it at `/Secure-Vault-Frontend/` on port 3002. It checks local-only file workflows, cancellation, exact downloaded bytes, sharing restrictions, refresh behavior, mobile layout, and absence of API requests. `CHROMIUM_EXECUTABLE_PATH` optionally selects an existing Chromium binary.

## Publish with GitHub Pages

1. In **Kazumi565/Secure-Vault-Frontend → Settings → Pages**, select **GitHub Actions** as the build source. This is the frontend repository, not the parent backend repository.
2. Merge the demo changes into the frontend's `main` after its checks pass.
3. Watch the **Deploy interactive demo** workflow. It validates the code and browser workflows, builds `dist-demo/`, and publishes only that output.
4. Open **https://kazumi565.github.io/Secure-Vault-Frontend/**.

If Pages was enabled after the merge, run the workflow manually from Actions or use:

```powershell
gh workflow run pages.yml --repo Kazumi565/Secure-Vault-Frontend --ref main
```

Publishing updates follows the same workflow on later pushes to `main`. Deployment runs only from `main`, uses GitHub's `github-pages` environment, and respects its protection rules. Pull requests run the demo tests without publishing.

The workflow uses GitHub's reported base path, so a custom domain or fork can supply the appropriate path automatically. For a different local path, set `VAULT_DEMO_BASE` before building and previewing. The browser suite always tests the original project subpath.

## Build separation

- `npm run build`: normal backend-connected application in `dist/`.
- `npm run build:demo`: standalone showcase in `dist-demo/`.
- `npm run demo`: development server with the demo adapter.
- `npm run preview:demo`: static preview of the demo build.

Demo mode is selected by Vite's build mode, not a URL parameter or visitor preference. The demo API adapter never falls back to the backend for an unsupported operation. Hash-based routing keeps in-app links and refreshes working on GitHub Pages. The regular application continues to use browser routing and its existing same-origin API.

GitHub's [custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and Vite's [static deployment guide](https://vite.dev/guide/static-deploy.html) describe the hosting setup.
