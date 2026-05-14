import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { listAlerts } from '@/services/storage';
import { formatDateTime, formatPrice, type AlertRecord } from '@goldmarket/shared';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    const load = () => setAlerts(listAlerts(200));
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink900 }}>提醒记录</Text>
        <Text style={{ fontSize: 13, color: colors.ink500, marginTop: 4 }}>
          条件触发的历史记录(共 {alerts.length} 条)
        </Text>
      </View>
      {alerts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
          <Text style={{ fontSize: 14, color: colors.ink500 }}>暂无提醒记录</Text>
          <Text style={{ fontSize: 12, color: colors.ink500, marginTop: 4 }}>
            条件触发后会显示在这里
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900 }}>
                  {item.watchName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Menlo',
                    color: colors.green,
                    fontWeight: '600',
                  }}
                >
                  {formatPrice(item.priceAtTrigger)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.ink500, marginTop: 6 }}>
                {item.message}
              </Text>
              <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 6 }}>
                {formatDateTime(item.ts)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
