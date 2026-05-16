import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ToggleSwitch from '@/components/ToggleSwitch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useAppStore } from '@/store/useAppStore';
import { setSettings as persistSettings, clearAll, clearHistoryOnly } from '@/services/storage';
import { scheduler } from '@/services/scheduler';
import { isValidBarkUrl, pushToBark, type AppSettings } from '@goldmarket/shared';

type BarkLevel = AppSettings['barkLevel'];
const BARK_LEVEL_OPTIONS: { value: BarkLevel; label: string }[] = [
  { value: 'active', label: '普通' },
  { value: 'timeSensitive', label: '即时' },
  { value: 'passive', label: '静默' },
  { value: 'critical', label: '紧急' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [barkInput, setBarkInput] = useState(settings.barkUrl);
  const [barkResult, setBarkResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [barkTesting, setBarkTesting] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    const next = persistSettings(patch);
    setSettings(next);
    if (patch.intervalMs != null) scheduler.setInterval(next.intervalMs);
  };

  const saveBarkUrl = () => {
    const trimmed = barkInput.trim();
    if (trimmed && !isValidBarkUrl(trimmed)) {
      setBarkResult({ ok: false, message: 'URL 格式不合法,需如 https://api.day.app/<DeviceKey>/' });
      return;
    }
    update({ barkUrl: trimmed });
    setBarkResult({ ok: true, message: trimmed ? '已保存' : '已清空' });
  };

  const testBark = async () => {
    const url = barkInput.trim() || settings.barkUrl;
    if (!url) {
      setBarkResult({ ok: false, message: '请先填写 Bark URL' });
      return;
    }
    setBarkTesting(true);
    setBarkResult(null);
    try {
      const r = await pushToBark(
        { url },
        {
          title: '黄金盯盘 · 测试推送',
          body: `这是一条来自手机端的测试消息 · ${new Date().toLocaleTimeString('zh-CN')}`,
          level: settings.barkLevel,
          sound: settings.barkSound || undefined,
          group: '黄金盯盘',
        },
      );
      setBarkResult({
        ok: r.ok,
        message: r.ok ? '推送成功,请查看 Bark App' : `失败:${r.message ?? `HTTP ${r.status}`}`,
      });
    } finally {
      setBarkTesting(false);
    }
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
                fontVariant: ['tabular-nums'],
                fontSize: 14,
                color: colors.ink900,
                textAlign: 'right',
              }}
            />
          </Row>

          <View
            style={{
              backgroundColor: colors.gold50,
              borderRadius: 8,
              padding: 10,
              borderWidth: 1,
              borderColor: colors.gold200,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.gold700, lineHeight: 18 }}>
              ⓘ 本机已不申请本地通知权限。条件触发后,通过下方「远程推送 (Bark)」推送到 iOS。
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900 }}>
              远程推送 (Bark)
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://bark.day.app/')}
            >
              <Text style={{ fontSize: 12, color: colors.gold600 }}>获取 Bark App ↗</Text>
            </TouchableOpacity>
          </View>

          <Row
            label="启用 Bark 推送"
            hint="条件触发时,通过 Bark 推送到手机(可跨设备)"
          >
            <ToggleSwitch
              value={settings.barkEnabled}
              onValueChange={(v) => update({ barkEnabled: v })}
            />
          </Row>

          <View style={{ marginTop: 12, marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: colors.ink500, marginBottom: 6 }}>
              推送地址(完整 URL)
            </Text>
            <TextInput
              value={barkInput}
              onChangeText={(t) => {
                setBarkInput(t);
                setBarkResult(null);
              }}
              placeholder="https://api.day.app/<DeviceKey>/"
              placeholderTextColor={colors.ink500}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: colors.gold50,
                borderWidth: 1,
                borderColor: colors.gold200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 13,
                color: colors.ink900,
                fontVariant: ['tabular-nums'],
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                onPress={saveBarkUrl}
                style={{
                  flex: 1,
                  backgroundColor: colors.gold500,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600' }}>
                  保存
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={barkTesting}
                onPress={testBark}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.ink100,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: barkTesting ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.ink700, fontSize: 13 }}>
                  {barkTesting ? '推送中…' : '发送测试'}
                </Text>
              </TouchableOpacity>
            </View>
            {barkResult && (
              <Text
                style={{
                  fontSize: 12,
                  marginTop: 8,
                  color: barkResult.ok ? colors.green : colors.red,
                }}
              >
                {barkResult.message}
              </Text>
            )}
            <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 6, lineHeight: 17 }}>
              从 Bark App 中复制完整 URL,例如 https://api.day.app/rYc7etuCgSdknHRWvnMtGV/。支持自建服务器。
            </Text>
          </View>

          <Row label="通知级别" hint="critical 可穿透静音,需在 Bark App 内授权">
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.ink100,
                borderRadius: 8,
                padding: 2,
              }}
            >
              {BARK_LEVEL_OPTIONS.map((opt) => {
                const active = opt.value === settings.barkLevel;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => update({ barkLevel: opt.value })}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      backgroundColor: active ? colors.white : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: active ? colors.gold700 : colors.ink500,
                        fontWeight: active ? '600' : '400',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Row>

          <Row label="自定义铃声" hint="Bark App 内置铃声名,留空使用默认">
            <TextInput
              value={settings.barkSound}
              onChangeText={(t) => update({ barkSound: t })}
              placeholder="例如 bell"
              placeholderTextColor={colors.ink500}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                width: 130,
                backgroundColor: colors.gold50,
                borderWidth: 1,
                borderColor: colors.gold200,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                fontSize: 13,
                color: colors.ink900,
              }}
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
