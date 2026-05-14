import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { describeCondition, formatPrice, type WatchItem } from '@goldmarket/shared';
import { deleteWatch, listWatches } from '@/services/storage';

interface Props {
  expandedManager?: boolean;
}

export default function WatchList({ expandedManager }: Props) {
  const router = useRouter();
  const watches = useAppStore((s) => s.watches);
  const currentPrice = useAppStore((s) => s.currentTick?.price ?? null);
  const setWatches = useAppStore((s) => s.setWatches);
  const dayOpen = useAppStore((s) => s.dayOpenPrice);
  const [editing, setEditing] = useState(false);

  const remove = (id: number, name: string) => {
    Alert.alert('删除监视条目', `确定删除 "${name}"?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          deleteWatch(id);
          setWatches(listWatches());
        },
      },
    ]);
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink900 }}>监视条目</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {watches.length > 0 && (
            <TouchableOpacity onPress={() => setEditing((v) => !v)}>
              <Text style={{ color: colors.gold600, fontSize: 14, fontWeight: '500' }}>
                {editing ? '完成' : '编辑'}
              </Text>
            </TouchableOpacity>
          )}
          {expandedManager && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/watch/[id]', params: { id: 'new' } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: colors.gold50,
                gap: 3,
              }}
            >
              <Plus size={14} color={colors.gold700} />
              <Text style={{ color: colors.gold700, fontSize: 12 }}>新增</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {watches.length === 0 ? (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/watch/[id]', params: { id: 'new' } })}
          style={{
            paddingVertical: 24,
            alignItems: 'center',
          }}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: colors.gold50,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Plus size={20} color={colors.gold600} strokeWidth={2} />
          </View>
          <Text style={{ color: colors.ink500, fontSize: 13 }}>暂无监视条目,点击新增</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 10 }}>
          {watches.map((w) => (
            <WatchRow
              key={w.id}
              item={w}
              currentPrice={currentPrice}
              dayOpen={dayOpen}
              editing={editing}
              onPress={() => router.push({ pathname: '/watch/[id]', params: { id: String(w.id) } })}
              onDelete={() => w.id != null && remove(w.id, w.name)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface RowProps {
  item: WatchItem;
  currentPrice: number | null;
  dayOpen: number | null;
  editing: boolean;
  onPress: () => void;
  onDelete: () => void;
}

function WatchRow({ item, currentPrice, dayOpen, editing, onPress, onDelete }: RowProps) {
  const tickValueDisplay = (() => {
    if (item.operator === 'pctChangeGte' || item.operator === 'pctChangeLte') {
      if (currentPrice == null || dayOpen == null || dayOpen === 0) return '—';
      const pct = ((currentPrice - dayOpen) / dayOpen) * 100;
      const sign = pct > 0 ? '+' : '';
      return `${sign}${pct.toFixed(2)}%`;
    }
    return currentPrice != null ? formatPrice(currentPrice) : '—';
  })();
  const triggered = item.triggered;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.ink100,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.gold50,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={16} color={colors.gold600} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.ink900, fontWeight: '500' }}>{item.name}</Text>
        <Text style={{ fontSize: 11, color: colors.ink500, marginTop: 2 }}>
          {describeCondition(item)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: triggered ? colors.red : colors.green,
            fontFamily: 'Menlo',
          }}
        >
          {tickValueDisplay}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: triggered ? colors.red : colors.ink300,
              marginRight: 4,
            }}
          />
          <Text style={{ fontSize: 11, color: triggered ? colors.red : colors.ink500 }}>
            {triggered ? '已触发' : '未触发'}
          </Text>
        </View>
      </View>
      {editing ? (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            padding: 8,
          }}
        >
          <Trash2 size={16} color={colors.red} strokeWidth={1.8} />
        </TouchableOpacity>
      ) : (
        <ChevronRight size={16} color={colors.ink500} strokeWidth={1.5} />
      )}
    </TouchableOpacity>
  );
}
