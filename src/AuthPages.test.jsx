import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from './AuthPages';
import { Provider } from './context';

it('submits the actual sign-in form and shows an actionable error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url === '/api/auth/session'
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify({ detail: 'Incorrect email, password, or authentication code' }), {
            status: 401,
          }),
    ),
  );
  render(
    <MemoryRouter>
      <Provider>
        <AuthPage />
      </Provider>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'WrongPassword123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Incorrect email'));
  expect(localStorage.getItem('token')).toBeNull();
  vi.unstubAllGlobals();
});
