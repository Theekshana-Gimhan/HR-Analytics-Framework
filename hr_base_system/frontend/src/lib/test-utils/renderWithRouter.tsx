import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

interface RenderWithRouterOptions {
  route?: string;
}

const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/', ...renderOptions }: RenderWithRouterOptions = {}
) => {
  window.history.pushState({}, 'Test page', route);

  return render(ui, { wrapper: MemoryRouter, ...renderOptions });
};

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { renderWithRouter };
