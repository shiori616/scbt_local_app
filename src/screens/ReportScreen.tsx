import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Colors } from '../theme/colors';
import { getDailyConditionLogsInRange, ensureDefaultLogsForPastYear, DailyConditionLog } from '../services/db/database';
import { useFocusEffect } from '@react-navigation/native';

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

// カレンダードット用の3色（5段階ボタンの 1,2,4 に対応）
const DOT_COLORS = {
  poor: '#D64545',    // 1 のカラー
  caution: '#F3B0B0', // 2 のカラー
  good: Colors.deepNeuroBlue,    // 5 のカラー（5択ボタンの5と同色）
} as const;

// 5択ボタンの色（LogCreateScreenと同じ）
const LEVEL_COLORS: Record<number, string> = {
  1: '#D64545',           // 赤
  2: '#F3B0B0',           // 薄い赤
  3: '#DDE3EE',           // 中立（グレー）
  4: '#B7CCEE',           // 薄い青
  5: Colors.deepNeuroBlue // 濃い青
};

type StatusKind = 'poor' | 'caution' | 'good';

function computeStatusKindFromLog(log: any): StatusKind {
  const fiveLevels = [
    Number(log?.headacheLevel ?? 0),
    Number(log?.seizureLevel ?? 0),
    Number(log?.rightSideLevel ?? 0),
    Number(log?.leftSideLevel ?? 0),
    Number(log?.speechImpairmentLevel ?? 0),
    Number(log?.memoryImpairmentLevel ?? 0),
  ];
  const physical = Number(log?.physicalCondition ?? 0);
  const mental = Number(log?.mentalCondition ?? 0);

  const allAre = (vals: number[], allowed: number[]) =>
    vals.every(v => allowed.includes(v));

  // 良好: 5択がすべて5 かつ 体調・気持ちがどちらも 100 以上
  if (allAre(fiveLevels, [5]) && physical >= 100 && mental >= 100) {
    return 'good';
  }
  // 注意: 5択がすべて3または4、あるいは 体調・気持ちのいずれかが 50〜99
  const anyBetween50And99 =
    (physical >= 50 && physical < 100) || (mental >= 50 && mental < 100);
  if (allAre(fiveLevels, [3, 4]) || anyBetween50And99) {
    return 'caution';
  }
  // それ以外は不調
  return 'poor';
}

// 1回にロードする日数
const DAYS_PER_LOAD = 7;

export default function ReportScreen() {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [dayDots, setDayDots] = useState<Record<string, string | null>>({});
  const [seedTick, setSeedTick] = useState(0);
  
  // 日次レポートリスト用
  const [dailyLogs, setDailyLogs] = useState<Array<{ date: Date; log: DailyConditionLog | null }>>([]);
  const [oldestLoadedDate, setOldestLoadedDate] = useState<Date>(new Date());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const cardPositions = useRef<Record<string, number>>({});

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  // 初回に過去1年の未記録日をデフォルトで作成
  useEffect(() => {
    (async () => {
      await ensureDefaultLogsForPastYear();
      setSeedTick(x => x + 1);
    })();
  }, []);

  // 月のグリッドに含まれる全日付のドット色（データ有無）を事前取得
  const loadMonthDots = async () => {
    const cells = buildMonthGrid(month);
    const entries: Record<string, string | null> = {};
    
    const startDate = toIsoDate(cells[0].date);
    const endDate = toIsoDate(cells[cells.length - 1].date);
    
    const logsMap = await getDailyConditionLogsInRange(startDate, endDate);
    
    for (const c of cells) {
      const iso = toIsoDate(c.date);
      const log = logsMap.get(iso);
      if (!log) {
        entries[iso] = null;
        continue;
      }
      const kind = computeStatusKindFromLog(log);
      const color =
        kind === 'good' ? DOT_COLORS.good : kind === 'caution' ? DOT_COLORS.caution : DOT_COLORS.poor;
      entries[iso] = color;
    }
    setDayDots(entries);
  };

  useEffect(() => {
    void loadMonthDots();
  }, [month, seedTick]);

  // 初期ロード: 今日から1週間分のデータを降順で取得
  const loadInitialDailyLogs = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = addDays(today, -(DAYS_PER_LOAD - 1));
    
    const endDateStr = toIsoDate(today);
    const startDateStr = toIsoDate(startDate);
    
    const logsMap = await getDailyConditionLogsInRange(startDateStr, endDateStr);
    
    const arr: Array<{ date: Date; log: DailyConditionLog | null }> = [];
    // 降順で追加（今日から過去へ）
    for (let i = 0; i < DAYS_PER_LOAD; i++) {
      const d = addDays(today, -i);
      const iso = toIsoDate(d);
      const log = logsMap.get(iso) ?? null;
      arr.push({ date: new Date(d), log });
    }
    
    setDailyLogs(arr);
    setOldestLoadedDate(startDate);
    setHasMoreData(true);
  }, []);

  useEffect(() => {
    void loadInitialDailyLogs();
  }, [loadInitialDailyLogs, seedTick]);

  // 追加ロード: 過去のデータを取得
  const loadMoreDailyLogs = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return;
    
    setIsLoadingMore(true);
    
    const endDate = addDays(oldestLoadedDate, -1);
    const startDate = addDays(endDate, -(DAYS_PER_LOAD - 1));
    
    // 1年以上前のデータは読み込まない
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (endDate < oneYearAgo) {
      setHasMoreData(false);
      setIsLoadingMore(false);
      return;
    }
    
    const endDateStr = toIsoDate(endDate);
    const startDateStr = toIsoDate(startDate);
    
    const logsMap = await getDailyConditionLogsInRange(startDateStr, endDateStr);
    
    const arr: Array<{ date: Date; log: DailyConditionLog | null }> = [];
    // 降順で追加
    for (let i = 0; i < DAYS_PER_LOAD; i++) {
      const d = addDays(endDate, -i);
      const iso = toIsoDate(d);
      const log = logsMap.get(iso) ?? null;
      arr.push({ date: new Date(d), log });
    }
    
    setDailyLogs(prev => [...prev, ...arr]);
    setOldestLoadedDate(startDate);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreData, oldestLoadedDate]);

  // スクロール時に追加データをロード
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      void loadMoreDailyLogs();
    }
  }, [loadMoreDailyLogs]);

  // 画面に戻ってきたら最新を再取得
  useFocusEffect(
    useCallback(() => {
      void loadMonthDots();
      void loadInitialDailyLogs();
    }, [month, loadInitialDailyLogs])
  );

  // カレンダーで日付を選択したとき
  const handleSelectDate = useCallback((date: Date) => {
    setSelected(date);
    
    // 選択された日付のカードにスクロール
    const iso = toIsoDate(date);
    const position = cardPositions.current[iso];
    if (position !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: position, animated: true });
    }
  }, []);

  // カードの位置を記録
  const handleCardLayout = useCallback((date: Date, y: number) => {
    const iso = toIsoDate(date);
    cardPositions.current[iso] = y;
  }, []);

  return (
    <View style={styles.container}>
      {/* カレンダー（固定表示） */}
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
            const dotColor = dayDots[iso] ?? null;
            return (
              <Pressable
                key={idx}
                onPress={() => handleSelectDate(cell.date)}
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
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.poor }]} />
            <Text style={styles.legendText}>不調</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.caution }]} />
            <Text style={styles.legendText}>注意</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOT_COLORS.good }]} />
            <Text style={styles.legendText}>良好</Text>
          </View>
        </View>
      </View>

      {/* 日次レポートリスト（スクロール可能） */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {dailyLogs.map(({ date, log }, idx) => (
          <DailyReportCard 
            key={toIsoDate(date)} 
            date={date} 
            log={log} 
            isSelected={toIsoDate(date) === toIsoDate(selected)}
            onLayout={(y) => handleCardLayout(date, y)}
          />
        ))}
        
        {isLoadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={Colors.deepNeuroBlue} />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        )}
        
        {!hasMoreData && (
          <Text style={styles.noMoreData}>これ以上のデータはありません</Text>
        )}
      </ScrollView>
    </View>
  );
}

// 日次レポートカードコンポーネント
function DailyReportCard({ 
  date, 
  log, 
  isSelected,
  onLayout 
}: { 
  date: Date; 
  log: DailyConditionLog | null; 
  isSelected: boolean;
  onLayout: (y: number) => void;
}) {
  return (
    <View 
      style={[styles.detailCard, isSelected && styles.detailCardSelected]}
      onLayout={(event) => onLayout(event.nativeEvent.layout.y)}
    >
      <Text style={styles.detailTitle}>{formatJpDate(date)}</Text>
      <View style={styles.divider} />
      {log ? (
        <>
          {/* 症状セクション - 表形式（1行3項目） */}
          <Text style={styles.sectionTitle}>症状</Text>
          <View style={styles.symptomTable}>
            <View style={styles.symptomRow}>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>頭痛</Text>
                <Badge value={log.headacheLevel} />
              </View>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>てんかん</Text>
                <Badge value={log.seizureLevel} />
              </View>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>右半身</Text>
                <Badge value={log.rightSideLevel} />
              </View>
            </View>
            <View style={styles.symptomRow}>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>左半身</Text>
                <Badge value={log.leftSideLevel} />
              </View>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>言語</Text>
                <Badge value={log.speechImpairmentLevel} />
              </View>
              <View style={styles.symptomCell}>
                <Text style={styles.symptomLabel} numberOfLines={1}>記憶</Text>
                <Badge value={log.memoryImpairmentLevel} />
              </View>
            </View>
          </View>

          {/* 体調・気持ちセクション（横並び） */}
          <View style={styles.conditionRow}>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>体調</Text>
              <Text style={styles.conditionValue}>{log.physicalCondition}</Text>
              <Bar value={log.physicalCondition} />
            </View>
            <View style={styles.conditionItem}>
              <Text style={styles.conditionLabel}>気持ち</Text>
              <Text style={styles.conditionValue}>{log.mentalCondition}</Text>
              <Bar value={log.mentalCondition} />
            </View>
          </View>

          {/* 血圧セクション */}
          <Text style={styles.sectionTitle}>血圧</Text>
          <View style={styles.bloodPressureRow}>
            <Text style={styles.bpLabel}>最低</Text>
            <Text style={styles.bpValue}>{log.bloodPressureDiastolic ?? '-'}</Text>
            <Text style={styles.bpLabel}>最高</Text>
            <Text style={styles.bpValue}>{log.bloodPressureSystolic ?? '-'}</Text>
          </View>

          {log.memo ? (
            <View style={styles.memoBox}>
              <Text style={styles.memoText}>{log.memo}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.legendText}>この日の記録はありません</Text>
      )}
    </View>
  );
}

function Badge({ value }: { value: number }) {
  const bgColor = LEVEL_COLORS[value] ?? '#DDE3EE';
  // 1, 2, 5 は白文字、3, 4 は濃い色の文字
  const textColor = value === 1 || value === 2 || value === 5 
    ? Colors.pureWhite 
    : Colors.deepNeuroBlue;
  
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function Bar({ value }: { value: number }) {
  // LogCreateScreenと同じ色を使用
  return (
    <View style={styles.barWrap}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(200, value)) / 2}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBlueWash,
  },
  calendarCard: {
    width: '96%',
    alignSelf: 'center',
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
  scrollArea: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: '2%',
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  detailCardSelected: {
    borderWidth: 2,
    borderColor: Colors.deepNeuroBlue,
  },
  detailTitle: {
    color: Colors.deepNeuroBlue,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 4,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.softBlueGradient,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.deepInkBrown,
    fontWeight: '600',
    fontSize: 15,
    marginTop: 12,
    marginBottom: 12,
  },
  symptomTable: {
    marginBottom: 8,
  },
  symptomRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  symptomCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomLabel: {
    color: Colors.deepInkBrown,
    fontSize: 14,
    width: 64,
    textAlign: 'left',
  },
  conditionRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
    gap: 16,
  },
  conditionItem: {
    flex: 1,
  },
  conditionLabel: {
    color: Colors.deepInkBrown,
    fontSize: 14,
    marginBottom: 4,
  },
  conditionValue: {
    color: Colors.deepInkBrown,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 4,
  },
  bloodPressureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bpLabel: {
    color: Colors.deepInkBrown,
    fontSize: 14,
  },
  bpValue: {
    color: Colors.deepInkBrown,
    fontWeight: '600',
    fontSize: 16,
    marginRight: 16,
  },
  badge: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#DDE3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.deepNeuroBlue,
    fontWeight: '700',
  },
  barWrap: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#C5D3E8',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.softBlueGradient,
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
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: Colors.grayBlue,
    fontSize: 14,
  },
  noMoreData: {
    textAlign: 'center',
    color: Colors.grayBlue,
    fontSize: 12,
    paddingVertical: 16,
  },
});
