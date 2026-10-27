import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type Name = ComponentProps<typeof SymbolView>['name'];

/** SF Symbol on iOS, Material symbol on Android. */
export function Icon({ name, color, size = 22 }: { name: Name; color: ColorValue; size?: number }) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}
