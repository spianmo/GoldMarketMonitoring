import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { formatTime } from '@goldmarket/shared';

export default function HeaderBar() {
  const router = useRouter();
  const status = useAppStore((s) => s.status);
  const tick = useAppStore((s) => s.currentTick);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const isError = !!status?.lastError && (status?.consecutiveFailures ?? 0) > 0;
  const dotColor = isError ? colors.red : colors.green;
  const statusText = isError ? '抓取异常' : '实时监控中';
  const timeText = tick ? `更新时间 ${formatTime(tick.ts)}` : '尚未更新';

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.ink900,
              letterSpacing: 0.2,
            }}
          >
            黄金盯盘
          </Text>
          <Text style={{ fontSize: 22 }}>🥇</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColor,
            }}
          />
          <Text style={{ fontSize: 12, color: colors.ink700, fontWeight: '500' }}>{statusText}</Text>
          <Text style={{ fontSize: 12, color: colors.ink500, marginLeft: 4 }}>{timeText}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <RoundButton onPress={() => router.push('/(tabs)/history')}>
          <View>
            <Feather name="bell" size={18} color={colors.ink700} />
            <View
              style={{
                position: 'absolute',
                top: -1,
                right: -1,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.red,
                borderWidth: 1,
                borderColor: colors.card,
              }}
            />
          </View>
        </RoundButton>
        <RoundButton onPress={() => router.push({ pathname: '/watch/[id]', params: { id: 'new' } })}>
          <Feather name="plus" size={20} color={colors.ink700} />
        </RoundButton>
      </View>
    </View>
  );
}

function RoundButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.ink100,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
}
