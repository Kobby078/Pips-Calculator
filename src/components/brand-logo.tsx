import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import css from '@/components/brand-logo.module.css';
import { BrandCanvas } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-theme';

const sources = {
  emblem: require('../../assets/brand/atlasjfx-emblem.png'),
  complete: require('../../assets/brand/atlasjfx-logo.png'),
} as const;

const aspects = {
  emblem: 1,
  complete: 1024 / 682,
} as const;

type BrandLogoProps = {
  variant: keyof typeof sources;
  height: number;
};

/** Official artwork. Light surfaces sit it on the charcoal brand field. */
export function BrandLogo({ variant, height }: BrandLogoProps) {
  const scheme = useResolvedColorScheme();
  const lightPlate = scheme === 'light';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="ATLASJFX"
      style={[styles.frame, lightPlate ? styles.plate : null]}
      {...(Platform.OS === 'web' ? { className: css.plate } : {})}>
      <Image
        source={sources[variant]}
        contentFit="contain"
        accessible={false}
        style={{ height, width: Math.round(height * aspects[variant]) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'flex-start',
  },
  plate: {
    backgroundColor: BrandCanvas,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
