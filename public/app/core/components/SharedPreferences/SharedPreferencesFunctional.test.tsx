import { HttpResponse } from 'msw';
import { getSelectParent, selectOptionInTest } from 'test/helpers/selectOptionInTest';
import { act, render, screen, userEvent, waitFor, within } from 'test/test-utils';

import { locationService, setBackendSrv } from '@grafana/runtime';
import { mockComboboxRect } from '@grafana/test-utils';
import { preferencesHandlers } from '@grafana/test-utils/handlers';
import server, { setupMockServer } from '@grafana/test-utils/server';
import { getFolderFixtures } from '@grafana/test-utils/unstable';
import { backendSrv } from 'app/core/services/backend_srv';
import { changeTheme } from 'app/core/services/theme';
import { captureRequests } from 'app/features/alerting/unified/mocks/server/events';

import { SharedPreferencesFunctional } from './SharedPreferencesFunctional';

setBackendSrv(backendSrv);
setupMockServer();

jest.mock('app/core/services/theme', () => ({
  ...jest.requireActual('app/core/services/theme'),
  changeTheme: jest.fn(),
}));

const mockChangeTheme = jest.mocked(changeTheme);

const navigateAway = async () => {
  await act(async () => {
    locationService.push('/dashboards');
  });
};

const getPrefsUpdateRequest = async (requests: Request[]) => {
  const prefsUpdate = requests.find((r) => r.url.match('/preferences') && r.method === 'PATCH');
  return prefsUpdate!.clone().json();
};

const [_, { dashbdD, dashbdE }] = getFolderFixtures();

const selectComboboxOptionInTest = async (input: HTMLElement, optionOrOptions: string | RegExp) => {
  const user = userEvent.setup();
  await user.click(input);
  const option = await screen.findByRole('option', { name: optionOrOptions });
  await user.click(option);
};

const setup = async (historyOptions?: Parameters<typeof render>[1]) => {
  const view = render(<SharedPreferencesFunctional resourceUri="user" preferenceType="user" />, {
    historyOptions: { initialEntries: ['/profile'], ...historyOptions?.historyOptions },
    ...historyOptions,
  });
  const themeSelect = await screen.findByRole('combobox', { name: /Interface theme/ });
  await waitFor(() => expect(themeSelect).not.toBeDisabled());
  return view;
};

const mockReload = jest.fn();
const originalLocation = window.location;

beforeEach(() => {
  mockReload.mockClear();
  mockChangeTheme.mockClear();
});

beforeAll(() => {
  jest.spyOn(window, 'location', 'get').mockReturnValue({ ...originalLocation, reload: mockReload });
  mockComboboxRect();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('SharedPreferencesFunctional', () => {
  it('renders the theme preference', async () => {
    await setup();
    const themeSelect = await screen.findByRole('combobox', { name: /Interface theme/ });
    await waitFor(() => expect(themeSelect).toHaveValue('Light'));
  });

  it('renders the home dashboard preference', async () => {
    await setup();
    const dashboardSelect = getSelectParent(screen.getByLabelText('Home Dashboard'));
    await waitFor(() => {
      expect(dashboardSelect).toHaveTextContent(dashbdD.item.title);
    });
  });

  it('renders the timezone preference', async () => {
    await setup();
    const tzSelect = getSelectParent(screen.getByLabelText('Timezone'));
    expect(tzSelect).toHaveTextContent('Browser Time');
  });

  it('renders the week start preference', async () => {
    await setup();
    const weekSelect = await screen.findByRole('combobox', { name: 'Week start' });
    expect(weekSelect).toHaveValue('Monday');
  });

  it('renders the default language preference', async () => {
    await setup();
    const langSelect = await screen.findByRole('combobox', { name: /language/i });
    expect(langSelect).toHaveValue('Default');
  });

  it('does not render the pseudo-locale', async () => {
    const { user } = await setup();
    const langSelect = await screen.findByRole('combobox', { name: /language/i });

    // Open the combobox and wait for the options to be rendered
    await user.click(langSelect);
    expect((await screen.findAllByRole('option'))[0]).toBeInTheDocument();

    await user.clear(langSelect);
    await user.type(langSelect, 'Pseudo', {
      // Don't click on the element again when typing as this would just re-set the value
      skipClick: true,
    });

    const option = screen.queryByRole('option', { name: 'Pseudo-locale' });
    expect(option).not.toBeInTheDocument();
  });

  it('saves the users new preferences', async () => {
    const dashboardToSelect = dashbdE.item;
    const capture = captureRequests();
    const { user } = await setup();

    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: /Interface theme/ }), 'Dark');
    await selectComboboxOptionInTest(
      await screen.findByRole('combobox', { name: /home dashboard/i }),
      new RegExp(dashboardToSelect.title)
    );
    await selectOptionInTest(screen.getByLabelText('Timezone'), 'Sydney');
    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: 'Week start' }), 'Saturday');
    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: /language/i }), 'Français');

    await user.click(screen.getByText('Save preferences'));

    const requests = await capture;
    const newPreferences = await getPrefsUpdateRequest(requests);

    expect(newPreferences).toEqual({
      spec: {
        timezone: 'Australia/Sydney',
        weekStart: 'saturday',
        theme: 'dark',
        homeDashboardUID: dashboardToSelect.uid,
        queryHistory: { homeTab: '' },
        language: 'fr-FR',
        navbar: { bookmarkUrls: [] },
      },
    });
  });

  it('saves an experimental theme preference', async () => {
    const capture = captureRequests();
    const { user } = await setup();

    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: /Interface theme/ }), 'Gilded grove');

    await user.click(screen.getByText('Save preferences'));

    const requests = await capture;
    const newPreferences = await getPrefsUpdateRequest(requests);

    expect(newPreferences).toMatchObject({
      spec: { theme: 'gildedgrove' },
    });
  });

  it('saves the users default preferences', async () => {
    const capture = captureRequests();
    const { user } = await setup();
    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: /Interface theme/ }), 'Default');

    // there's no default option in this dropdown - there's a clear selection button
    // get the parent container, and find the "Clear value" button
    const dashboardSelect = screen.getByTestId('User preferences home dashboard drop down');
    await user.click(within(dashboardSelect).getByRole('button', { name: 'Clear value' }));

    await selectOptionInTest(screen.getByLabelText('Timezone'), 'Default');
    await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: 'Week start' }), 'Default');
    await selectComboboxOptionInTest(screen.getByRole('combobox', { name: /language/i }), 'Default');

    await user.click(screen.getByText('Save preferences'));
    const requests = await capture;
    const newPreferences = await getPrefsUpdateRequest(requests);

    expect(newPreferences).toEqual({
      spec: {
        timezone: '',
        weekStart: '',
        theme: '',
        homeDashboardUID: '',
        queryHistory: { homeTab: '' },
        language: '',
        navbar: { bookmarkUrls: [] },
      },
    });
  });

  it('refreshes the page after saving preferences', async () => {
    const { user } = await setup();
    await user.click(screen.getByText('Save preferences'));
    expect(mockReload).toHaveBeenCalled();
  });
  it('shows an error alert when preferences fail to load', async () => {
    server.use(
      preferencesHandlers.listPreferencesHandler(HttpResponse.json({ message: 'Server error' }, { status: 500 }))
    );
    render(<SharedPreferencesFunctional resourceUri="user" preferenceType="user" />);
    expect(await screen.findByText('Error loading preferences')).toBeInTheDocument();
  });
  it('shows an error alert when saving preferences fails', async () => {
    server.use(
      preferencesHandlers.updatePreferencesHandler(HttpResponse.json({ message: 'Server error' }, { status: 500 }))
    );
    const { user } = await setup();
    await user.click(screen.getByText('Save preferences'));

    expect(await screen.findByText('Error updating preferences')).toBeInTheDocument();
  });
  it('does not save when onConfirm returns false', async () => {
    const onConfirm = jest.fn().mockResolvedValue(false);
    const capture = captureRequests((r) => r.url.includes('/preferences') && r.method === 'PATCH');

    render(<SharedPreferencesFunctional resourceUri="user" preferenceType="user" onConfirm={onConfirm} />);
    const themeSelect = await screen.findByRole('combobox', { name: /Interface theme/ });
    await waitFor(() => expect(themeSelect).not.toBeDisabled());

    await userEvent.setup().click(screen.getByText('Save preferences'));

    const requests = await capture;
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(0);
    expect(mockReload).not.toHaveBeenCalled();
  });
  it('renders all form fields as disabled when disabled prop is true', async () => {
    render(<SharedPreferencesFunctional resourceUri="user" preferenceType="user" disabled />);
    const themeSelect = await screen.findByRole('combobox', { name: /Interface theme/ });
    await waitFor(() => expect(themeSelect).toBeDisabled());

    expect(screen.getByText('Save preferences').closest('button')).not.toBeDisabled();
  });

  describe('unsaved changes navigation', () => {
    it('allows navigation without a prompt when preferences are unchanged', async () => {
      await setup();

      await navigateAway();

      expect(screen.queryByRole('heading', { name: 'Leave page?' })).not.toBeInTheDocument();
      expect(locationService.getLocation().pathname).toBe('/dashboards');
    });

    it('blocks navigation and shows a prompt when preferences are dirty', async () => {
      const { user } = await setup();

      await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: 'Week start' }), 'Saturday');
      await navigateAway();

      expect(await screen.findByRole('heading', { name: 'Leave page?' })).toBeInTheDocument();
      expect(locationService.getLocation().pathname).toBe('/profile');
      expect(await screen.findByRole('combobox', { name: 'Week start' })).toHaveValue('Saturday');

      await user.click(screen.getByRole('button', { name: 'Continue editing' }));
      expect(screen.queryByRole('heading', { name: 'Leave page?' })).not.toBeInTheDocument();
      expect(locationService.getLocation().pathname).toBe('/profile');
      expect(await screen.findByRole('combobox', { name: 'Week start' })).toHaveValue('Saturday');
    });

    it('discards unsaved changes, restores previewed theme, and navigates away', async () => {
      const { user } = await setup();

      await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: /Interface theme/ }), 'Dark');
      await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: 'Week start' }), 'Saturday');
      await navigateAway();

      expect(await screen.findByRole('heading', { name: 'Leave page?' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Discard unsaved changes' }));

      await waitFor(() => {
        expect(locationService.getLocation().pathname).toBe('/dashboards');
      });
      expect(await screen.findByRole('combobox', { name: /Interface theme/ })).toHaveValue('Light');
      expect(await screen.findByRole('combobox', { name: 'Week start' })).toHaveValue('Monday');
      expect(mockChangeTheme).toHaveBeenCalledWith('light', true);
    });

    it('does not show a prompt while preferences are loading', async () => {
      render(<SharedPreferencesFunctional resourceUri="user" preferenceType="user" />, {
        historyOptions: { initialEntries: ['/profile'] },
      });

      await navigateAway();

      expect(screen.queryByRole('heading', { name: 'Leave page?' })).not.toBeInTheDocument();
      expect(locationService.getLocation().pathname).toBe('/dashboards');
    });

    it('blocks navigation when user has no saved preferences yet', async () => {
      server.use(
        preferencesHandlers.listPreferencesHandler(
          HttpResponse.json({
            metadata: {},
            items: [],
          })
        )
      );

      const { user } = await setup();

      await selectComboboxOptionInTest(await screen.findByRole('combobox', { name: 'Week start' }), 'Saturday');
      await navigateAway();

      expect(await screen.findByRole('heading', { name: 'Leave page?' })).toBeInTheDocument();
      expect(locationService.getLocation().pathname).toBe('/profile');

      await user.click(screen.getByRole('button', { name: 'Discard unsaved changes' }));

      await waitFor(() => {
        expect(locationService.getLocation().pathname).toBe('/dashboards');
      });
      expect(await screen.findByRole('combobox', { name: 'Week start' })).toHaveValue('Default');
    });
  });
});
