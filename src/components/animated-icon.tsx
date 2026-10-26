import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useSettings } from '@/components/settings-context';
import { BrandCanvas } from '@/constants/theme';

const DURATION = 600;

export function AnimatedSplashOverlay() {
  const { hydrated } = useSettings();
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const [laidOut, setLaidOut] = useState(false);

  useEffect(() => {
    if (!hydrated || !laidOut || animate) {
      return;
    }
    SplashScreen.hideAsync().finally(() => setAnimate(true));
  }, [animate, hydrated, laidOut]);

  if (!visible) {
    return null;
  }

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const emblem = (
    <Image
      source={require('../../assets/brand/atlasjfx-emblem.png')}
      style={styles.emblem}
      contentFit="contain"
      accessibilityLabel="ATLASJFX"
    />
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {emblem}
    </Animated.View>
  ) : (
    <View onLayout={() => setLaidOut(true)} style={styles.splashOverlay}>
      {emblem}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BrandCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  emblem: {
    width: 180,
    height: 180,
  },
});
