import { ScrollView, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import WatchList from '@/components/WatchList';
import StorageBadge from '@/components/StorageBadge';

export default function WatchesScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink900 }}>监视条目</Text>
        <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 4 }}>
          管理价格阈值与触发提醒
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <WatchList expandedManager />
        <View style={{ height: 14 }} />
        <StorageBadge />
      </ScrollView>
    </View>
  );
}
