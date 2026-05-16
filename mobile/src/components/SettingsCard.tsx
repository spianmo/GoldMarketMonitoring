import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { setSettings as persistSettings } from '@/services/storage';
import { scheduler } from '@/services/scheduler';

const INTERVALS: { value: number; label: string }[] = [
  { value: 2000, label: '2 秒' },
  { value: 5000, label: '5 秒' },
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 300000, label: '5 分钟' },
];

export default function SettingsCard() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (patch: Parameters<typeof persistSettings>[0]) => {
    const next = persistSettings(patch);
    setSettings(next);
    if (patch.intervalMs != null) scheduler.setInterval(next.intervalMs);
  };

  const currentInterval = INTERVALS.find((i) => i.value === settings.intervalMs);
  const intervalLabel = currentInterval?.label ?? `${Math.round(settings.intervalMs / 1000)} 秒`;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Feather name="settings" size={18} color={colors.ink700} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink900 }}>盯盘设置</Text>
      </View>

      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, color: colors.ink900 }}>盯盘频率</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 14, color: colors.ink700 }}>{intervalLabel}</Text>
          <Feather name="chevron-right" size={16} color={colors.ink500} />
        </View>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          marginTop: 4,
          borderTopWidth: 1,
          borderTopColor: colors.ink100,
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 14, color: colors.ink900 }}>Bark 推送</Text>
          <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>
            {settings.barkEnabled && settings.barkUrl
              ? '已启用 · 条件触发时推送到 Bark'
              : '未配置 · 前往设置填写推送地址'}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor:
              settings.barkEnabled && settings.barkUrl ? colors.gold100 : colors.ink100,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color:
                settings.barkEnabled && settings.barkUrl ? colors.gold700 : colors.ink500,
            }}
          >
            {settings.barkEnabled && settings.barkUrl ? '已启用' : '未启用'}
          </Text>
        </View>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          onPress={() => setPickerOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 8,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.ink700,
                padding: 12,
              }}
            >
              选择盯盘频率
            </Text>
            {INTERVALS.map((opt) => {
              const active = opt.value === settings.intervalMs;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    update({ intervalMs: opt.value });
                    setPickerOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: active ? colors.gold50 : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: active ? colors.gold700 : colors.ink900,
                      fontWeight: active ? '600' : '400',
                    }}
                  >
                    {opt.label}
                  </Text>
                  {active && <Feather name="check" size={16} color={colors.gold600} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
