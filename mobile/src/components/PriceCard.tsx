import { Text, View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { formatPrice } from '@goldmarket/shared';

export default function PriceCard() {
  const tick = useAppStore((s) => s.currentTick);
  const dayOpen = useAppStore((s) => s.dayOpenPrice);
  const todayHigh = useAppStore((s) => s.todayHigh);
  const todayLow = useAppStore((s) => s.todayLow);
  const yClose = useAppStore((s) => s.yesterdayClose);

  const price = tick?.price ?? null;
  const base = dayOpen;
  const delta = price != null && base != null ? price - base : null;
  const pct =
    price != null && base != null && base !== 0 ? ((price - base) / base) * 100 : null;
  const isUp = (delta ?? 0) >= 0;
  const deltaColor = (delta ?? 0) === 0 ? colors.ink500 : isUp ? colors.green : colors.red;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        shadowColor: '#1F2937',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* Left column: title / price / delta */}
        <View style={{ flex: 1.25, paddingRight: 8, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink900 }}>
              浙商金价
            </Text>
            <Text style={{ fontSize: 12, color: colors.ink500, marginLeft: 3 }}>(¥/克)</Text>
            <View
              style={{
                marginLeft: 8,
                backgroundColor: colors.gold100,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.gold700, fontWeight: '500' }}>
                {tick ? '实时' : '等待'}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '600',
                color: colors.gold600,
                letterSpacing: -0.4,
                lineHeight: 36,
                fontVariant: ['tabular-nums'],
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {price != null ? formatPrice(price) : '—.—'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.ink500, marginLeft: 6 }}>元/克</Text>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: deltaColor,
              fontWeight: '500',
              fontVariant: ['tabular-nums'],
              marginTop: 6,
            }}
            numberOfLines={1}
          >
            {delta != null
              ? `${isUp && delta > 0 ? '+' : ''}${delta.toFixed(2)}${
                  pct != null ? `  ${isUp && pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : ''
                }`
              : '—'}
          </Text>
        </View>

        {/* Right column: 2x2 stats grid aligned to left/right rows */}
        <View style={{ flex: 1, justifyContent: 'space-between', paddingTop: 2 }}>
          <View style={{ flexDirection: 'row' }}>
            <Stat label="今日最高" value={todayHigh} />
            <Stat label="今日最低" value={todayLow} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Stat label="开盘" value={dayOpen} />
            <Stat label="昨收" value={yClose} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.ink500, marginBottom: 3 }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.ink900,
          fontVariant: ['tabular-nums'],
        }}
        numberOfLines={1}
      >
        {value != null
          ? value.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '—'}
      </Text>
    </View>
  );
}
