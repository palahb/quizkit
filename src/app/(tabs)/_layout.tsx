import { Tabs } from 'expo-router/tabs';

import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

export default function TabsLayout() {
  const t = useT();
  const theme = useTheme();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: theme.primary, tabBarInactiveTintColor: theme.textMuted }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.library'),
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'books.vertical', android: 'library_books' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'clock.arrow.circlepath', android: 'history' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Icon name={{ ios: 'gearshape', android: 'settings' }} color={color} />,
        }}
      />
    </Tabs>
  );
}
