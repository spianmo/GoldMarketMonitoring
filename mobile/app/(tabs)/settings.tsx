import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';
import { setSettings as persistSettings, clearAll, clearHistoryOnly } from '@/services/storage';
import { scheduler } from '@/services/scheduler';
import type { AppSettings } from '@goldmarket/shared';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const update = (patch: Partial<AppSettings>) => {
    const next = persistSettings(patch);
    setSettings(next);
    if (patch.intervalMs != null) scheduler.setInterval(next.intervalMs);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink900 }}>设置</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900, marginBottom: 14 }}>
            抓取策略
          </Text>

          <Row
            label="盯盘频率(毫秒)"
            hint="最小 1000ms。前台应用激活时按此频率抓取。"
          >
            <TextInput
              value={String(settings.intervalMs)}
              keyboardType="number-pad"
              onChangeText={(t) => {
                const n = Number(t);
                if (Number.isFinite(n) && n >= 1000) update({ intervalMs: n });
              }}
              style={{
                width: 90,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: colors.gold50,
                borderWidth: 1,
                borderColor: colors.gold200,
                fontFamily: 'Menlo',
                fontSize: 14,
                color: colors.ink900,
                textAlign: 'right',
              }}
            />
          </Row>

          <Row label="系统通知" hint="条件触发时显示本地通知">
            <Switch
              value={settings.notificationEnabled}
              onValueChange={(v) => update({ notificationEnabled: v })}
              trackColor={{ true: colors.gold500, false: colors.ink300 }}
              thumbColor={colors.white}
            />
          </Row>

          <Row label="通知声音" hint="通知伴随提示音">
            <Switch
              value={settings.notificationSound}
              onValueChange={(v) => update({ notificationSound: v })}
              trackColor={{ true: colors.gold500, false: colors.ink300 }}
              thumbColor={colors.white}
            />
          </Row>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900, marginBottom: 8 }}>
            数据管理
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink500, marginBottom: 12, lineHeight: 18 }}>
            原始数据存于内存,分钟聚合长期保存到 MMKV(最多保留 10 天)。
          </Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('清空历史数据', '将删除分钟聚合,监视条目与提醒记录保留。', [
                { text: '取消', style: 'cancel' },
                { text: '确定', style: 'destructive', onPress: () => clearHistoryOnly() },
              ]);
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.ink100,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: colors.ink700, fontSize: 14 }}>清空历史数据</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('重置全部数据', '将清空设置、监视条目、提醒记录和历史数据,不可恢复。', [
                { text: '取消', style: 'cancel' },
                {
                  text: '全部重置',
                  style: 'destructive',
                  onPress: () => {
                    clearAll();
                  },
                },
              ]);
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.ink100,
            }}
          >
            <Text style={{ color: colors.red, fontSize: 14 }}>重置全部数据</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 18,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900, marginBottom: 6 }}>
            关于
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink500, lineHeight: 18 }}>
            黄金盯盘 v1.0.0{'\n'}
            数据源:浙商银行公开行情(无需登录){'\n'}
            金价为日金价,当日更新频率较低,折线长时间持平属正常。{'\n'}
            后台抓取受 iOS 系统限制,通常 ≥15 分钟。打开 app 时按设置频率实时刷新。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 14, color: colors.ink900 }}>{label}</Text>
        {hint && (
          <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>{hint}</Text>
        )}
      </View>
      {children}
    </View>
  );
}
