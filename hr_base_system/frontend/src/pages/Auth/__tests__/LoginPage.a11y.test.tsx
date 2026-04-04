import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import LoginPage from '../LoginPage';
import AppProviders from '../../../app/providers/AppProviders';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AppProviders>
        <LoginPage />
      </AppProviders>
    </MemoryRouter>
  );

describe('Login accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = renderLogin();
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
