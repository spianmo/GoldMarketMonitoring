import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import HeaderBar from '@/components/HeaderBar';
import PriceCard from '@/components/PriceCard';
import PriceChartCard from '@/components/PriceChartCard';
import SettingsCard from '@/components/SettingsCard';
import WatchList from '@/components/WatchList';
import StorageBadge from '@/components/StorageBadge';

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <HeaderBar />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <PriceCard />
        <View style={{ height: 14 }} />
        <PriceChartCard />
        <View style={{ height: 14 }} />
        <SettingsCard />
        <View style={{ height: 14 }} />
        <WatchList />
        <View style={{ height: 18 }} />
        <StorageBadge />
      </ScrollView>
    </View>
  );
}
