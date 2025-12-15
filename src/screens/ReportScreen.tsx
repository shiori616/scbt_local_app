import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import { getDailyConditionLog } from '../services/db/database';

type DayCell = {
  date: Date;
  inMonth: boolean;
};

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
function formatJpMonth(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
function formatJpDate(d: Date): string {
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）`;
}

function buildMonthGrid(base: Date): DayCell[] {
  const first = startOfMonth(base);
  const firstWeekday = first.getDay(); // 0..6
  const gridStart = addDays(first, -firstWeekday);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    cells.push({ date, inMonth: date.getMonth() === base.getMonth() });
  }
  return cells;
}

function computeStatusColor(v: number | undefined): string | null {
  if (v == null) return null;
  if (v >= 150) return '#335187'; // Deep Neuro Blue
  if (v >= 100) return '#8CB6DB'; // mid
  if (v >= 50) return '#DDE3EE'; // light
  return '#868C96'; // gray (bad)
}

export default function ReportScreen() {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay()); // 日曜始まり
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [weekLogs, setWeekLogs] = useState<Array<{ date: Date; log: any | null }>>([]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  useEffect(() => {
    (async () => {
      const log = await getDailyConditionLog(toIsoDate(selected));
      setSelectedLog(log);
    })();
  }, [selected]);

  useEffect(() => {
    (async () => {
      const arr: Array<{ date: Date; log: any | null }> = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const log = await getDailyConditionLog(toIsoDate(d));
        arr.push({ date: d, log });
      }
      setWeekLogs(arr);
    })();
  }, [weekStart]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => setMonth(addDays(month, -28))}>
            <Text style={styles.arrow}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.monthText}>{formatJpMonth(month)}</Text>
          <Pressable onPress={() => setMonth(addDays(month, 28))}>
            <Text style={styles.arrow}>{'›'}</Text>
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {weekdays.map(w => (
            <Text key={w} style={styles.weekday}>
              {w}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((cell, idx) => {
            const iso = toIsoDate(cell.date);
            const isSel = iso === toIsoDate(selected);
            const inMonth = cell.inMonth;
            const day = cell.date.getDate();
            // Dot color from selectedLog-like rule is unknown beforehand;
            // here we fetch per cell lazily could be heavy; for now simple heuristic:
            // mark only selected day; improvement: prefetch in parallel.
            const dotColor = isSel ? Colors.deepNeuroBlue : null;
            return (
              <Pressable
                key={idx}
                onPress={() => setSelected(cell.date)}
                style={[
                  styles.cell,
                  !inMonth && styles.cellDim,
                  isSel && styles.cellSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.dayDim,
                    isSel && styles.daySelected,
                  ]}
                >
                  {day}
                </Text>
                <View style={styles.dotSlot}>
                  {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#335187' }]} />
            <Text style={styles.legendText}>不調</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8CB6DB' }]} />
            <Text style={styles.legendText}>注意</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DDE3EE' }]} />
            <Text style={styles.legendText}>普通</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#335187' }]} />
            <Text style={styles.legendText}>良好</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{formatJpDate(selected)}</Text>
        {selectedLog ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>頭痛</Text>
              <Badge value={selectedLog.headacheLevel} />
              <Text style={styles.label}>てんかん</Text>
              <Badge value={selectedLog.seizureLevel} />
              <Text style={styles.label}>右半身</Text>
              <Badge value={selectedLog.rightSideLevel} />
              <Text style={styles.label}>左半身</Text>
              <Badge value={selectedLog.leftSideLevel} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>言語</Text>
              <Badge value={selectedLog.speechImpairmentLevel} />
              <Text style={styles.label}>記憶</Text>
              <Badge value={selectedLog.memoryImpairmentLevel} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>体調</Text>
              <Bar value={selectedLog.physicalCondition} />
              <Text style={styles.valueText}>{selectedLog.physicalCondition}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>気持ち</Text>
              <Bar value={selectedLog.mentalCondition} />
              <Text style={styles.valueText}>{selectedLog.mentalCondition}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>血圧</Text>
              <Text style={styles.valueText}>
                最高 {selectedLog.bloodPressureSystolic ?? '-'} 最低{' '}
                {selectedLog.bloodPressureDiastolic ?? '-'}
              </Text>
            </View>
            {selectedLog.memo ? (
              <View style={styles.memoBox}>
                <Text style={styles.memoText}>{selectedLog.memo}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.legendText}>この日の記録はありません</Text>
        )}
      </View>

      <View style={styles.detailCard}>
        <View style={styles.weekHeader}>
          <Pressable onPress={() => setWeekStart(addDays(weekStart, -7))}>
            <Text style={styles.arrow}>{'‹'}</Text>
          </Pressable>
        <Text style={styles.detailTitle}>
          週次 {formatJpDate(weekStart)} 〜 {formatJpDate(addDays(weekStart, 6))}
        </Text>
          <Pressable onPress={() => setWeekStart(addDays(weekStart, 7))}>
            <Text style={styles.arrow}>{'›'}</Text>
          </Pressable>
        </View>
        {weekLogs.map(({ date, log }, idx) => (
          <View key={idx} style={styles.weekRow}>
            <Text style={[styles.weekDate, toIsoDate(date) === toIsoDate(selected) && { color: Colors.deepNeuroBlue, fontWeight: '700' }]}>
              {`${date.getMonth() + 1}/${date.getDate()}(${['日','月','火','水','木','金','土'][date.getDay()]})`}
            </Text>
            <View style={styles.weekBadges}>
              <Badge value={log?.headacheLevel ?? '-'} />
              <Badge value={log?.seizureLevel ?? '-'} />
              <Badge value={log?.rightSideLevel ?? '-'} />
              <Badge value={log?.leftSideLevel ?? '-'} />
            </View>
            <View style={styles.weekBars}>
              <Bar value={log?.physicalCondition ?? 0} />
              <Bar value={log?.mentalCondition ?? 0} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Badge({ value }: { value: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{value}</Text>
    </View>
  );
}

function Bar({ value }: { value: number }) {
  const color = computeStatusColor(value) ?? Colors.softBlueGradient;
  return (
    <View style={styles.barWrap}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(200, value)) / 2}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: Colors.lightBlueWash,
  },
  calendarCard: {
    width: '96%',
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrow: {
    fontSize: 20,
    color: Colors.deepInkBrown,
    width: 24,
    textAlign: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.deepInkBrown,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: Colors.grayBlue,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellDim: {
    opacity: 0.4,
  },
  cellSelected: {
    backgroundColor: '#EEF3FB',
    borderRadius: 8,
  },
  dayText: {
    color: Colors.deepInkBrown,
  },
  dayDim: {
    color: Colors.grayBlue,
  },
  daySelected: {
    fontWeight: '700',
    color: Colors.deepNeuroBlue,
  },
  dotSlot: {
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: Colors.grayBlue,
    fontSize: 12,
  },
  detailCard: {
    width: '96%',
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  detailTitle: {
    color: Colors.deepNeuroBlue,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  label: {
    color: Colors.deepInkBrown,
    width: 48,
    textAlign: 'right',
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#DDE3EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.deepNeuroBlue,
    fontWeight: '700',
  },
  barWrap: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#EEF3FB',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  valueText: {
    width: 40,
    textAlign: 'right',
    color: Colors.deepInkBrown,
  },
  memoBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
  },
  memoText: {
    color: Colors.deepInkBrown,
    lineHeight: 18,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekRow: {
    marginBottom: 10,
  },
  weekDate: {
    color: Colors.deepInkBrown,
    marginBottom: 4,
  },
  weekBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  weekBars: {
    gap: 6,
  },
});


