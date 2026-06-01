import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const palette = ['#0f62fe', '#24a148', '#8a3ffc', '#da1e28', '#f1c21b'];

type AvatarProps = {
  label?: string | null;
  size?: number;
  toneIndex?: number;
};

export function Avatar({ label, size = 38, toneIndex = 0 }: AvatarProps) {
  const initial = (label?.trim().charAt(0) || 'F').toUpperCase();
  const backgroundColor = palette[Math.abs(toneIndex) % palette.length];

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <ThemedText
        type="captionBold"
        style={{ color: '#ffffff', fontSize: Math.max(11, size * 0.36) }}
      >
        {initial}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderColor: '#ffffff',
    borderWidth: 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
