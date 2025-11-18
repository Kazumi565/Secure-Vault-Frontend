# Secure Vault Frontend

React frontend for the Secure Vault file storage platform. The app consumes the Secure Vault API and supports login, registration, verification, secure token handling, file management, admin audit controls, and rich profile management (including avatar uploads).

## Prerequisites

- Node.js 20+
- npm 10+
- Access to a running Secure Vault backend API

## Environment configuration

Copy the provided example file and adjust it to match your deployment:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `REACT_APP_API_URL` | Base URL of the backend API (e.g., `https://api.securevault.local`). |
| `REACT_APP_USE_HTTP_ONLY_COOKIE` | `true` when the backend issues an HTTP-only cookie for auth. Set to `false` only when using token fallback storage. |
| `REACT_APP_DEMO_EMAIL` | Optional email address that will be pre-filled when clicking the “Use demo account” button. |
| `REACT_APP_DEMO_PASSWORD` | Optional demo password. |

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Runs the development server with hot reload. |
| `npm run build` | Produces a production build inside `build/`. |
| `npm run lint` | Runs ESLint on the `src/` directory. |
| `npm test` | Executes the Jest and React Testing Library test suites in CI-friendly mode. |

## Security & auth model

- **HTTP-only cookie mode (recommended):** set `REACT_APP_USE_HTTP_ONLY_COOKIE=true`. The frontend will never store tokens locally and will rely on backend cookies plus `fetch` requests that include credentials.
- **Token fallback mode:** set the flag to `false` only when the backend cannot issue cookies. Tokens are stored in memory with a localStorage fallback and the app automatically logs out whenever an authenticated request fails.
- All API requests go through the centralized `apiClient`, which injects the base URL, credentials, and logout-on-401 handling.

## Demo / test account

Clicking “Use demo account” on the login screen pre-fills the credentials defined in `.env`. Update `REACT_APP_DEMO_EMAIL` and `REACT_APP_DEMO_PASSWORD` with the test account you provision on the backend. See `README.md` for usage notes and disable the demo account in production environments.

## Login, registration & verification flow

1. Registration (`/register`) calls `POST /register` and redirects to `/verified?pending=true` to remind users to confirm their email.
2. Verification links from the backend should redirect to `/verified?token=<token>`; the page will call `POST /verify-email` and display the result.
3. Login (`/`) calls `POST /login`. If the API responds with `requires_verification`, the user is redirected back to `/verified?pending=true`.

## Profile management

- Profile details (full name, avatar, verification status) are loaded from `GET /me`.
- Avatar uploads are cropped client-side and uploaded via `PATCH /me/profile-picture` using `multipart/form-data`.
- Additional actions include name change, password change, resend verification email, and account deletion.

## File dashboard & admin tools

- The dashboard uses the API wrapper for all file operations, including uploads, downloads, previews, search, and storage usage.
- Admins can review logs, export CSV files, and delete uploaded files from the audit screen.

## Docker deployment

A production-ready container is provided:

```bash
docker build -t secure-vault-frontend .
docker run -p 8080:80 --env-file .env secure-vault-frontend
```

The bundled `nginx.conf` enforces HTTPS redirection (when behind a proxy) and sends HSTS headers. The default server also exposes `/healthz` for liveness checks.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) run `npm ci`, `npm run lint`, `npm test`, and `npm run build` on every push and pull request targeting `main`.

## Testing

- Unit tests cover the auth UI, the API client, and the profile upload helper (`npm test`).
- ESLint ensures code quality (`npm run lint`).
- For end-to-end testing you can layer Cypress on top of this setup; install it as a dev dependency and extend the CI workflow as needed.
