import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OPERATOR_LABEL, type WatchItem, type WatchMode, type WatchOperator } from '@goldmarket/shared';
import { colors } from '@/theme/colors';
import { createWatch, listWatches, updateWatch, deleteWatch } from '@/services/storage';
import { useAppStore } from '@/store/useAppStore';

const OPERATORS: WatchOperator[] = [
  'priceGte',
  'priceLte',
  'pctChangeGte',
  'pctChangeLte',
  'deltaGte',
];

const UNIT: Record<WatchOperator, string> = {
  priceGte: '元',
  priceLte: '元',
  pctChangeGte: '%',
  pctChangeLte: '%',
  deltaGte: '元',
};

export default function WatchEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = useAppStore((s) => s.currentTick?.price ?? null);
  const setWatches = useAppStore((s) => s.setWatches);

  const isNew = id === 'new';
  const existing = useMemo<WatchItem | null>(() => {
    if (isNew) return null;
    const numId = Number(id);
    return listWatches().find((w) => w.id === numId) ?? null;
  }, [id, isNew]);

  const [name, setName] = useState(existing?.name ?? '');
  const [operator, setOperator] = useState<WatchOperator>(existing?.operator ?? 'priceGte');
  const [threshold, setThreshold] = useState(
    existing?.threshold != null
      ? String(existing.threshold)
      : current != null
      ? current.toFixed(2)
      : '',
  );
  const [mode, setMode] = useState<WatchMode>(existing?.mode ?? 'oneShot');
  const [enabled, setEnabled] = useState<boolean>(existing?.enabled ?? true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setErr(null), [operator, threshold]);

  const submit = () => {
    const t = Number(threshold);
    if (!name.trim()) return setErr('请填写条目名称');
    if (!Number.isFinite(t)) return setErr('请填写有效的阈值数字');
    if (isNew) {
      createWatch({
        name: name.trim(),
        operator,
        threshold: t,
        mode,
        enabled,
        triggered: false,
        lastTriggeredAt: null,
        createdAt: Date.now(),
      });
    } else if (existing?.id != null) {
      updateWatch(existing.id, {
        name: name.trim(),
        operator,
        threshold: t,
        mode,
        enabled,
        triggered: false,
        lastTriggeredAt: null,
      });
    }
    setWatches(listWatches());
    router.back();
  };

  const remove = () => {
    if (!existing?.id) return;
    Alert.alert('删除监视条目', `确定删除 "${existing.name}"?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteWatch(existing.id!);
          setWatches(listWatches());
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Field label="名称">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="例如:突破1050"
            placeholderTextColor={colors.ink500}
            style={styles.input}
          />
        </Field>

        <Field label="条件">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {OPERATORS.map((op) => {
              const active = op === operator;
              return (
                <TouchableOpacity
                  key={op}
                  onPress={() => setOperator(op)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? colors.gold500 : colors.ink100,
                    backgroundColor: active ? colors.gold50 : colors.card,
                  }}
                >
                  <Text style={{ color: active ? colors.gold700 : colors.ink700, fontSize: 13 }}>
                    {OPERATOR_LABEL[op]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="阈值">
          <View style={{ position: 'relative' }}>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              placeholder={operator === 'pctChangeGte' || operator === 'pctChangeLte' ? '例如 0.8' : '例如 1050'}
              placeholderTextColor={colors.ink500}
              style={[styles.input, { fontVariant: ['tabular-nums'], paddingRight: 36 }]}
            />
            <Text style={{ position: 'absolute', right: 12, top: 12, color: colors.ink500, fontSize: 12 }}>
              {UNIT[operator]}
            </Text>
          </View>
        </Field>

        <Field label="提醒模式">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['oneShot', 'continuous'] as WatchMode[]).map((m) => {
              const active = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? colors.gold500 : colors.ink100,
                    backgroundColor: active ? colors.gold50 : colors.card,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: active ? colors.gold700 : colors.ink700, fontSize: 14 }}>
                    {m === 'oneShot' ? '单次提醒' : '持续提醒'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <TouchableOpacity
          onPress={() => setEnabled((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: enabled ? colors.gold500 : colors.ink300,
              backgroundColor: enabled ? colors.gold500 : 'transparent',
              marginRight: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {enabled && <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ color: colors.ink700, fontSize: 14 }}>创建后立即启用</Text>
        </TouchableOpacity>

        {err && (
          <Text style={{ color: colors.red, fontSize: 13, marginTop: 4 }}>{err}</Text>
        )}

        <TouchableOpacity
          onPress={submit}
          style={{
            marginTop: 24,
            backgroundColor: colors.gold500,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>
            {isNew ? '创建监视' : '保存修改'}
          </Text>
        </TouchableOpacity>

        {!isNew && (
          <TouchableOpacity
            onPress={remove}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.ink100,
            }}
          >
            <Text style={{ color: colors.red, fontSize: 14 }}>删除此条目</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = {
  input: {
    backgroundColor: colors.gold50,
    borderWidth: 1,
    borderColor: colors.gold200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink900,
  } as const,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, color: colors.ink500, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}
