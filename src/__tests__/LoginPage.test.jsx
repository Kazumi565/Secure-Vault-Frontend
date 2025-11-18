import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '../LoginPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, ...rest }) => <a {...rest}>{children}</a>
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str) => str,
    i18n: { language: 'en', changeLanguage: jest.fn() }
  })
}));

jest.mock('../api/client', () => ({
  post: jest.fn()
}));

jest.mock('../api/tokenService', () => ({
  setToken: jest.fn(),
  getToken: jest.fn(),
  logout: jest.fn(),
  onUnauthorized: () => () => {}
}));

jest.mock('../config', () => ({
  DEMO_EMAIL: 'demo@example.com',
  DEMO_PASSWORD: 'DemoPass123',
  USE_HTTP_ONLY_COOKIE: false
}));

const apiClient = require('../api/client');
const tokenService = require('../api/tokenService');

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores token and navigates to dashboard on successful login', async () => {
    apiClient.post.mockResolvedValue({ access_token: 'abc' });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'demo@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(tokenService.setToken).toHaveBeenCalledWith('abc');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('redirects to verification screen when backend requests verification', async () => {
    apiClient.post.mockResolvedValue({ requires_verification: true });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'demo@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/verified?pending=true'));
    expect(tokenService.setToken).not.toHaveBeenCalled();
  });
});
