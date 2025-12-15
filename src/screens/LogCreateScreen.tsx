import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, PanResponder, GestureResponderEvent, PanResponderGestureState, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { getDailyConditionLog, saveDailyConditionLog } from '../services/db/database';

const LEVEL_COLORS: Record<number, string> = {
  // 赤 → 白 → 青 のグラデーション
  1: '#D64545',           // 赤
  2: '#F3B0B0',           // 薄い赤
  3: '#DDE3EE',           // 中立（枠線と同じ薄いグレー）
  4: '#B7CCEE',           // 薄い青
  5: Colors.deepNeuroBlue // 濃い青
};

function formatJpDate(date: Date): string {
  const w = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][date.getDay()];
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(
    date.getDate()
  ).padStart(2, '0')}日${w}`;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function LevelPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const levels = [1, 2, 3, 4, 5];
  return (
    <View style={styles.levelRow}>
      {levels.map((n, idx) => {
        const isActive = value === n;
        const color = LEVEL_COLORS[n];
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.levelBtn,
              idx < levels.length - 1 && styles.levelBtnDivider,
              isActive && { backgroundColor: color },
            ]}
          >
            <Text style={[styles.levelText, { color: isActive ? Colors.pureWhite : color }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ReportScreenと同様のカスタムバースライダー
function BarSlider({
  value,
  onChange,
  min = 0,
  max = 200,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const barRef = useRef<View>(null);
  
  const calculateValue = useCallback((pageX: number) => {
    if (barWidth === 0) return value;
    
    barRef.current?.measure((x, y, width, height, pageXOffset) => {
      const relativeX = pageX - pageXOffset;
      const clampedX = Math.max(0, Math.min(barWidth, relativeX));
      const newValue = Math.round((clampedX / barWidth) * (max - min) + min);
      onChange(newValue);
    });
  }, [barWidth, min, max, onChange, value]);
  
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        calculateValue(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        calculateValue(evt.nativeEvent.pageX);
      },
    }), [calculateValue]);
  
  const percentage = ((value - min) / (max - min)) * 100;
  const thumbPosition = (barWidth * (value - min)) / (max - min) - 12; // 12 = thumb半径
  const bubblePosition = Math.max(0, thumbPosition);
  
  return (
    <View style={styles.barSliderContainer}>
      {/* 数値バブル（つまみの上に表示） */}
      <View style={[styles.barSliderBubble, { left: bubblePosition }]}>
        <Text style={styles.barSliderBubbleText}>{value}</Text>
      </View>
      <View
        ref={barRef}
        style={styles.barSliderTrack}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.barSliderFill, { width: `${percentage}%` }]} />
        <View style={[styles.barSliderThumb, { left: Math.max(0, thumbPosition) }]} />
      </View>
    </View>
  );
}

export default function LogCreateScreen() {
  console.log('===== LogCreateScreen RENDER =====');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const recordedDate = useMemo(() => toIsoDate(currentDate), [currentDate]);
  
  console.log('[LogCreateScreen] Initial recordedDate:', recordedDate);

  // スクロール用ref
  const scrollViewRef = useRef<ScrollView>(null);
  const formCardY = useRef<number>(0);
  const inputPositions = useRef<Record<string, number>>({});

  // formCardの位置を記録
  const handleFormCardLayout = useCallback((y: number) => {
    formCardY.current = y;
  }, []);

  // 入力フィールドの位置を記録
  const handleInputLayout = useCallback((key: string, y: number) => {
    inputPositions.current[key] = y;
  }, []);

  // 入力フィールドにフォーカスが当たった時に自動スクロール
  const scrollToInput = useCallback((key: string) => {
    const y = inputPositions.current[key];
    if (y !== undefined && scrollViewRef.current) {
      // formCardの位置 + 入力フィールドの相対位置
      let scrollY = formCardY.current + y;
      
      // メモの場合はテキストボックス全体が見えるように調整（キーボードの上に表示）
      if (key === 'memo') {
        // メモのテキストエリアは高さ96px + 余白を考慮して、上に少しだけ余白を残す
        scrollY = scrollY - 50;
      } else {
        // その他の入力フィールドは上に余白を持たせる
        scrollY = scrollY - 100;
      }
      
      scrollViewRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true });
    }
  }, []);

  // ラベル最大幅を測定して、右端を基準に全行の配置をそろえる
  const [labelMaxWidth, setLabelMaxWidth] = useState(0);
  const onMeasureLabel = (w: number) => {
    setLabelMaxWidth(prev => (w > prev ? w : prev));
  };

  const [headache, setHeadache] = useState(5);
  const [seizure, setSeizure] = useState(5);
  const [rightSide, setRightSide] = useState(5);
  const [leftSide, setLeftSide] = useState(5);
  const [speech, setSpeech] = useState(5);
  const [memory, setMemory] = useState(5);

  const [physical, setPhysical] = useState<number>(100);
  const [mental, setMental] = useState<number>(100);
  const [bpSys, setBpSys] = useState<string>('');
  const [bpDia, setBpDia] = useState<string>('');
  const [memo, setMemo] = useState<string>('');

  // データロード中かどうか（ロード中は自動保存をスキップ）
  const [isLoading, setIsLoading] = useState(true);
  // 初回ロード完了したかどうか
  const hasInitializedRef = useRef(false);
  // 現在表示中の日付を追跡
  const currentRecordedDateRef = useRef(recordedDate);

  // 変更があれば自動保存（デバウンス）
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保留中の変更があるかどうか
  const hasPendingChangesRef = useRef(false);
  // 現在保存中かどうか（重複保存防止）
  const isSavingRef = useRef(false);
  // アンマウント時に保存するための現在のフォーム値
  const formDataRef = useRef({
    memo: '',
    headache: 5,
    seizure: 5,
    rightSide: 5,
    leftSide: 5,
    speech: 5,
    memory: 5,
    physical: 100,
    mental: 100,
    bpSys: '',
    bpDia: '',
  });

  const doSave = useCallback(async (targetDate: string, data: {
    memo: string;
    headache: number;
    seizure: number;
    rightSide: number;
    leftSide: number;
    speech: number;
    memory: number;
    physical: number;
    mental: number;
    bpSys: string;
    bpDia: string;
  }) => {
    await saveDailyConditionLog({
      recordedDate: targetDate,
      memo: data.memo,
      headacheLevel: data.headache,
      seizureLevel: data.seizure,
      rightSideLevel: data.rightSide,
      leftSideLevel: data.leftSide,
      speechImpairmentLevel: data.speech,
      memoryImpairmentLevel: data.memory,
      physicalCondition: Math.max(0, Math.min(200, Number(data.physical) || 0)),
      mentalCondition: Math.max(0, Math.min(200, Number(data.mental) || 0)),
      bloodPressureSystolic: data.bpSys ? Number(data.bpSys) : null,
      bloodPressureDiastolic: data.bpDia ? Number(data.bpDia) : null,
    });
  }, []);

  // アンマウント時に未実行の保存をフラッシュ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      // 保留中の変更があり、かつ現在保存中でなければ即座に保存
      if (hasPendingChangesRef.current && !isSavingRef.current) {
        console.log('[LogCreateScreen] Flushing pending changes on unmount');
        const data = formDataRef.current;
        const targetDate = currentRecordedDateRef.current;
        saveDailyConditionLog({
          recordedDate: targetDate,
          memo: data.memo,
          headacheLevel: data.headache,
          seizureLevel: data.seizure,
          rightSideLevel: data.rightSide,
          leftSideLevel: data.leftSide,
          speechImpairmentLevel: data.speech,
          memoryImpairmentLevel: data.memory,
          physicalCondition: Math.max(0, Math.min(200, Number(data.physical) || 0)),
          mentalCondition: Math.max(0, Math.min(200, Number(data.mental) || 0)),
          bloodPressureSystolic: data.bpSys ? Number(data.bpSys) : null,
          bloodPressureDiastolic: data.bpDia ? Number(data.bpDia) : null,
        }).catch(err => console.error('[LogCreateScreen] Error flushing on unmount:', err));
        hasPendingChangesRef.current = false;
      }
    };
  }, []);

  // フォーム値変更時の自動保存（ロード中はスキップ、日付変更時もスキップ）
  useEffect(() => {
    // まだ初期化されていない場合はスキップ
    if (!hasInitializedRef.current) {
      console.log('[LogCreateScreen] Auto-save skipped: not initialized');
      return;
    }
    // ロード中は保存しない
    if (isLoading) {
      console.log('[LogCreateScreen] Auto-save skipped: loading');
      return;
    }

    // 現在の日付と一致しているか確認
    if (currentRecordedDateRef.current !== recordedDate) {
      console.log('[LogCreateScreen] Auto-save skipped: date mismatch', {
        current: currentRecordedDateRef.current,
        recorded: recordedDate,
      });
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const targetDate = recordedDate;
    
    // フォーム値をrefに保存（アンマウント時のフラッシュ用）
    formDataRef.current = {
      memo,
      headache,
      seizure,
      rightSide,
      leftSide,
      speech,
      memory,
      physical,
      mental,
      bpSys,
      bpDia,
    };
    hasPendingChangesRef.current = true;
    
    console.log('[LogCreateScreen] Scheduling auto-save for date:', targetDate);
    autoSaveTimerRef.current = setTimeout(async () => {
      // 再度日付を確認（日付が変更されていたら保存しない）
      if (currentRecordedDateRef.current !== targetDate) {
        console.log('[LogCreateScreen] Auto-save cancelled: date changed during delay');
        return;
      }
      console.log('[LogCreateScreen] Executing auto-save for date:', targetDate);
      isSavingRef.current = true;
      try {
        await doSave(targetDate, {
          memo,
          headache,
          seizure,
          rightSide,
          leftSide,
          speech,
          memory,
          physical,
          mental,
          bpSys,
          bpDia,
        });
        hasPendingChangesRef.current = false;
        isSavingRef.current = false;
      } catch (err) {
        console.error('[LogCreateScreen] Auto-save error:', err);
        isSavingRef.current = false;
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    headache,
    seizure,
    rightSide,
    leftSide,
    speech,
    memory,
    physical,
    mental,
    bpSys,
    bpDia,
    memo,
    isLoading,
    recordedDate,
  ]);

  // 日付変更時にデータを読み込み
  useEffect(() => {
    console.log('[LogCreateScreen] useEffect triggered for recordedDate:', recordedDate);
    let isCancelled = false;

    const loadData = async () => {
      console.log('[LogCreateScreen] loadData started for date:', recordedDate);
      // 前回のタイマーをキャンセル
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // 即座にフォームをリセット（前の日付のデータが残らないように）
      console.log('[LogCreateScreen] Resetting form to defaults');
      setIsLoading(true);
      setHeadache(5);
      setSeizure(5);
      setRightSide(5);
      setLeftSide(5);
      setSpeech(5);
      setMemory(5);
      setPhysical(100);
      setMental(100);
      setBpSys('');
      setBpDia('');
      setMemo('');

      currentRecordedDateRef.current = recordedDate;

      try {
        console.log('[LogCreateScreen] Loading data for date:', recordedDate);
        const loaded = await getDailyConditionLog(recordedDate);
        console.log('[LogCreateScreen] Loaded data:', loaded);

        // キャンセルされた場合（日付が変わった場合）は何もしない
        if (isCancelled) {
          console.log('[LogCreateScreen] Load cancelled, date changed');
          return;
        }

        // データが存在する場合は、そのデータを表示
        if (loaded) {
          console.log('[LogCreateScreen] Setting loaded data to form');
          setHeadache(loaded.headacheLevel ?? 5);
          setSeizure(loaded.seizureLevel ?? 5);
          setRightSide(loaded.rightSideLevel ?? 5);
          setLeftSide(loaded.leftSideLevel ?? 5);
          setSpeech(loaded.speechImpairmentLevel ?? 5);
          setMemory(loaded.memoryImpairmentLevel ?? 5);
          setPhysical(loaded.physicalCondition ?? 100);
          setMental(loaded.mentalCondition ?? 100);
          setBpSys(
            loaded.bloodPressureSystolic != null ? String(loaded.bloodPressureSystolic) : ''
          );
          setBpDia(
            loaded.bloodPressureDiastolic != null ? String(loaded.bloodPressureDiastolic) : ''
          );
          setMemo(loaded.memo ?? '');
          console.log('[LogCreateScreen] Form values updated');
        } else {
          console.log('[LogCreateScreen] No data found, using defaults');
        }
        // データが存在しない場合は、既にデフォルト値が設定されているので何もしない
      } catch (error) {
        console.error('[LogCreateScreen] Error loading daily condition log:', error);
        // エラー時もデフォルト値のまま
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          hasInitializedRef.current = true;
          console.log('[LogCreateScreen] Loading completed');
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [recordedDate]);
  const handleSave = async () => {
    try {
      await saveDailyConditionLog({
        recordedDate,
        memo,
        headacheLevel: headache,
        seizureLevel: seizure,
        rightSideLevel: rightSide,
        leftSideLevel: leftSide,
        speechImpairmentLevel: speech,
        memoryImpairmentLevel: memory,
        physicalCondition: Math.max(0, Math.min(200, Number(physical) || 0)),
        mentalCondition: Math.max(0, Math.min(200, Number(mental) || 0)),
        bloodPressureSystolic: bpSys ? Number(bpSys) : null,
        bloodPressureDiastolic: bpDia ? Number(bpDia) : null,
      });
      Alert.alert('保存しました');
    } catch (e) {
      Alert.alert('保存に失敗しました', String(e));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.dateHeader}>
        <Pressable
          onPress={() => {
            const newDate = new Date(currentDate.getTime() - 86400000);
            console.log('[LogCreateScreen] Previous date button pressed, new date:', toIsoDate(newDate));
            setCurrentDate(newDate);
          }}
        >
          <Text style={styles.dateArrow}>{'‹'}</Text>
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatJpDate(currentDate)}</Text>
        </View>
        <Pressable
          onPress={() => {
            const newDate = new Date(currentDate.getTime() + 86400000);
            console.log('[LogCreateScreen] Next date button pressed, new date:', toIsoDate(newDate));
            setCurrentDate(newDate);
          }}
        >
          <Text style={styles.dateArrow}>{'›'}</Text>
        </Pressable>
      </View>

      <View 
        style={styles.formCard}
        onLayout={(e) => handleFormCardLayout(e.nativeEvent.layout.y)}
      >
        <FormRow label="頭痛" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={headache} onChange={setHeadache} />
        </FormRow>
        <FormRow label="てんかん" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={seizure} onChange={setSeizure} />
        </FormRow>
        <FormRow label="右半身" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={rightSide} onChange={setRightSide} />
        </FormRow>
        <FormRow label="左半身" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={leftSide} onChange={setLeftSide} />
        </FormRow>
        <FormRow label="言語力" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={speech} onChange={setSpeech} />
        </FormRow>
        <FormRow label="記憶力" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <LevelPicker value={memory} onChange={setMemory} />
        </FormRow>
        <FormRow label="体調" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <View style={styles.barSliderBlock}>
            <Text style={styles.minMax}>0</Text>
            <BarSlider value={physical} onChange={setPhysical} min={0} max={200} />
            <Text style={styles.minMax}>200</Text>
          </View>
        </FormRow>
        <FormRow label="気持ち" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <View style={styles.barSliderBlock}>
            <Text style={styles.minMax}>0</Text>
            <BarSlider value={mental} onChange={setMental} min={0} max={200} />
            <Text style={styles.minMax}>200</Text>
          </View>
        </FormRow>
        <View onLayout={(e) => handleInputLayout('bpSys', e.nativeEvent.layout.y)}>
          <FormRow label="最高血圧" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
            <View style={styles.bpRow}>
              <TextInput
                style={styles.numberInput}
                inputMode="numeric"
                value={bpSys}
                onChangeText={setBpSys}
                onFocus={() => scrollToInput('bpSys')}
              />
              <Text style={styles.mmHg}>mmHg</Text>
            </View>
          </FormRow>
        </View>
        <View onLayout={(e) => handleInputLayout('bpDia', e.nativeEvent.layout.y)}>
          <FormRow label="最低血圧" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
            <View style={styles.bpRow}>
              <TextInput
                style={styles.numberInput}
                inputMode="numeric"
                value={bpDia}
                onChangeText={setBpDia}
                onFocus={() => scrollToInput('bpDia')}
              />
              <Text style={styles.mmHg}>mmHg</Text>
            </View>
          </FormRow>
        </View>
        <View onLayout={(e) => handleInputLayout('memo', e.nativeEvent.layout.y)}>
          <FormRow label="メモ" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth} alignTop>
            <TextInput
              style={styles.textArea}
              value={memo}
              onChangeText={setMemo}
              placeholder="体調などの詳細を追加で記録してください"
              multiline
              textAlignVertical="top"
              onFocus={() => scrollToInput('memo')}
            />
          </FormRow>
        </View>
      </View>

      {/* 自動保存のためボタンは不要。必要であれば再度有効化できます。 */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormRow({
  label,
  children,
  onMeasureLabel,
  labelMaxWidth,
  alignTop,
}: {
  label: string;
  children: React.ReactNode;
  onMeasureLabel: (w: number) => void;
  labelMaxWidth: number;
  alignTop?: boolean;
}) {
  return (
    <View style={[styles.row, alignTop ? styles.rowTop : null]}>
      <View style={[styles.rowLabelCol, labelMaxWidth ? { width: labelMaxWidth + 12 } : null]}>
        <Text
          style={styles.rowLabel}
          onLayout={e => onMeasureLabel(e.nativeEvent.layout.width)}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rowInputCol}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.lightBlueWash,
  },
  container: {
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: Colors.lightBlueWash,
  },
  dateHeader: {
    width: '92%',
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dateArrow: {
    fontSize: 22,
    color: Colors.deepInkBrown,
    width: 24,
    textAlign: 'center',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    color: Colors.deepInkBrown,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    width: '92%',
    paddingVertical: 22,
    paddingHorizontal: 12,
    paddingLeft: 28, // 左に約2文字分の余白を追加
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  rowTop: {
    alignItems: 'flex-start',
  },
  rowLabelCol: {
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: Colors.deepInkBrown,
    fontWeight: '700',
  },
  rowInputCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  levelRow: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDE3EE', // 薄いグレーの枠
    borderRadius: 8,
    overflow: 'hidden',
  },
  levelBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.pureWhite,
  },
  levelBtnDivider: {
    borderRightWidth: 1,
    borderRightColor: '#DDE3EE', // 薄いグレーの区切り
  },
  levelBtnActive: {
    backgroundColor: Colors.deepNeuroBlue,
  },
  levelText: {
    color: Colors.deepNeuroBlue,
    fontWeight: '600',
  },
  levelTextActive: {
    color: Colors.pureWhite,
  },
  numberInput: {
    width: 120,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.softBlueGradient,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.pureWhite,
    color: Colors.deepInkBrown,
    textAlign: 'right',
  },
  sliderRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  minMax: {
    color: Colors.grayBlue,
    fontSize: 12,
    width: 28,
    textAlign: 'center',
  },
  barSliderBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    gap: 8,
    paddingBottom: 6,
  },
  barSliderContainer: {
    flex: 1,
    height: 50,
    justifyContent: 'flex-end',
    paddingTop: 26,
  },
  barSliderBubble: {
    position: 'absolute',
    top: 0,
    backgroundColor: Colors.deepNeuroBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  barSliderBubbleText: {
    color: Colors.pureWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  barSliderTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C5D3E8',
    overflow: 'visible',
    position: 'relative',
  },
  barSliderFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.softBlueGradient,
  },
  barSliderThumb: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.deepNeuroBlue,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mmHg: {
    color: Colors.grayBlue,
  },
  textArea: {
    width: '100%',
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.softBlueGradient,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.pureWhite,
    color: Colors.deepInkBrown,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: Colors.deepNeuroBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  saveText: {
    color: Colors.pureWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});


