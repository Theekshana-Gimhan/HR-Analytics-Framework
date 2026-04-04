import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import AppProviders from './app/providers/AppProviders';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders login screen for unauthenticated users', async () => {
    // App includes its own Router, so avoid wrapping with a test router to prevent nested Router errors
    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    expect(
      await screen.findByRole('heading', { name: /welcome back/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /^sign in$/i })
    ).toBeInTheDocument();
  });
});
