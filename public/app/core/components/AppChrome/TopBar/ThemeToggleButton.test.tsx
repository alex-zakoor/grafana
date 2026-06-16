import userEvent from '@testing-library/user-event';

import { createTheme, ThemeContext } from '@grafana/data';
import { render, screen } from 'test/test-utils';

import { toggleTheme } from '../../../services/theme';

import { ThemeToggleButton } from './ThemeToggleButton';

jest.mock('../../../services/theme', () => ({
  toggleTheme: jest.fn(),
}));

const renderWithTheme = (mode: 'light' | 'dark') =>
  render(
    <ThemeContext.Provider value={createTheme({ colors: { mode } })}>
      <ThemeToggleButton />
    </ThemeContext.Provider>
  );

describe('ThemeToggleButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a moon icon in light mode', () => {
    renderWithTheme('light');

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
  });

  it('renders a sun icon in dark mode', () => {
    renderWithTheme('dark');

    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-sun')).toBeInTheDocument();
  });

  it('toggles the persisted theme when clicked', async () => {
    renderWithTheme('light');

    await userEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(toggleTheme).toHaveBeenCalledWith(false);
  });
});
