import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
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
      <CheckCircle2 size={14} color={colors.green} strokeWidth={1.8} />
      <Text style={{ fontSize: 12, color: colors.ink500 }}>数据已自动保存到 MMKV</Text>
    </View>
  );
}
