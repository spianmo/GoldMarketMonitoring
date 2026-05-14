import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { colors } from '@/theme/colors';

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

const TRACK_W = 50;
const TRACK_H = 28;
const THUMB = 22;
const PAD = 3;
const TRANSLATE = TRACK_W - THUMB - PAD * 2;

export default function ToggleSwitch({ value, onValueChange, disabled }: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.ink300, colors.gold500],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRANSLATE],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          backgroundColor: trackColor,
          padding: PAD,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: colors.white,
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <View />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
