import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AppShell from '../AppShell';
import AppProviders from '../../providers/AppProviders';

const renderWithRoutes = (initialEntry: string = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div>Dashboard content</div>} />
            <Route path="employees" element={<div>Employees</div>} />
          </Route>
        </Routes>
      </AppProviders>
    </MemoryRouter>
  );

describe('AppShell accessibility enhancements', () => {
  it('exposes a skip navigation link that moves focus to main content', async () => {
  renderWithRoutes('/employees');

  await userEvent.tab();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveFocus();

  await userEvent.keyboard('{Enter}');

  const mainRegion = screen.getByRole('main');
  expect(mainRegion).toHaveAttribute('id', 'main-content');
  expect(mainRegion).toHaveFocus();
  });

  it('marks the active navigation item with aria-current', () => {
    renderWithRoutes('/employees');

    const activeLink = screen.getByRole('link', { name: /employees/i });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });
});
