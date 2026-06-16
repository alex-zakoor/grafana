import { t } from '@grafana/i18n';
import { ToolbarButton, useTheme2 } from '@grafana/ui';
import { toggleTheme } from 'app/core/services/theme';

export function ThemeToggleButton() {
  const theme = useTheme2();

  return (
    <ToolbarButton
      iconOnly
      icon={theme.isDark ? 'sun' : 'moon'}
      aria-label={t('navigation.theme-toggle.aria-label', 'Toggle theme')}
      tooltip={t('navigation.theme-toggle.tooltip', 'Toggle theme')}
      onClick={() => void toggleTheme(false)}
    />
  );
}
