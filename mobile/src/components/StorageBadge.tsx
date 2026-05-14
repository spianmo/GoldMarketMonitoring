import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export default function StorageBadge() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
      }}
    >
      <Feather name="check-circle" size={14} color={colors.green} />
      <Text style={{ fontSize: 12, color: colors.ink500 }}>数据已自动保存到 MMKV</Text>
    </View>
  );
}
