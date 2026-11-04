import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./pages/js/LogIn', () => ({
  authAPI: { verify: jest.fn().mockResolvedValue(false) },
}));

test('shows the sign-in page for an unauthenticated visitor', async () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Войти' })).toBeInTheDocument();
});
