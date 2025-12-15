import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../theme/colors';
import { getDailyConditionLog, saveDailyConditionLog } from '../services/db/database';
import Slider from '@react-native-community/slider';

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

export default function LogCreateScreen() {
  const jpToday = useMemo(() => formatJpDate(new Date()), []);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const recordedDate = useMemo(() => toIsoDate(currentDate), [currentDate]);

  // ラベル最大幅を測定して、右端を基準に全行の配置をそろえる
  const [labelMaxWidth, setLabelMaxWidth] = useState(0);
  const onMeasureLabel = (w: number) => {
    setLabelMaxWidth(prev => (w > prev ? w : prev));
  };

  // スライダーの幅を測定して、現在値のバブル位置を計算する
  const [sliderWidth, setSliderWidth] = useState(0);
  const calcBubbleLeft = (val: number) => {
    const min = 0;
    const max = 200;
    const thumb = 20; // だいたいのサム径
    if (sliderWidth <= 0) return 0;
    const usable = Math.max(0, sliderWidth - thumb);
    const ratio = (val - min) / (max - min);
    return Math.max(0, Math.min(usable, usable * ratio));
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

  // 日付変更時にデータを読み込み
  React.useEffect(() => {
    (async () => {
      const loaded = await getDailyConditionLog(recordedDate);
      if (!loaded) {
        // デフォルトにリセット（5段階=5、200段階=100、血圧は空欄）
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
        return;
      }
      setHeadache(loaded.headacheLevel ?? 1);
      setSeizure(loaded.seizureLevel ?? 1);
      setRightSide(loaded.rightSideLevel ?? 1);
      setLeftSide(loaded.leftSideLevel ?? 1);
      setSpeech(loaded.speechImpairmentLevel ?? 1);
      setMemory(loaded.memoryImpairmentLevel ?? 1);
      setPhysical(loaded.physicalCondition ?? 100);
      setMental(loaded.mentalCondition ?? 100);
      setBpSys(
        loaded.bloodPressureSystolic != null ? String(loaded.bloodPressureSystolic) : ''
      );
      setBpDia(
        loaded.bloodPressureDiastolic != null ? String(loaded.bloodPressureDiastolic) : ''
      );
      setMemo(loaded.memo ?? '');
    })();
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dateHeader}>
        <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}>
          <Text style={styles.dateArrow}>{'‹'}</Text>
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatJpDate(currentDate)}</Text>
        </View>
        <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}>
          <Text style={styles.dateArrow}>{'›'}</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
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
          <View style={styles.sliderBlock}>
            <View style={styles.sliderRowMain}>
              <Text style={styles.minMax}>0</Text>
              <View
                style={styles.sliderContainer}
                onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
              >
                <View
                  style={[
                    styles.valueBubble,
                    { left: calcBubbleLeft(physical) },
                  ]}
                >
                  <Text style={styles.valueBubbleText}>{physical}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={200}
                  step={1}
                  value={physical}
                  onValueChange={(v: number | number[]) =>
                    setPhysical(Array.isArray(v) ? v[0] : v)
                  }
                  minimumTrackTintColor={Colors.softBlueGradient}
                  maximumTrackTintColor={Colors.lightBlueWash}
                  thumbTintColor={Colors.deepNeuroBlue}
                />
              </View>
              <Text style={styles.minMax}>200</Text>
            </View>
          </View>
        </FormRow>
        <FormRow label="気持ち" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <View style={styles.sliderBlock}>
            <View style={styles.sliderRowMain}>
              <Text style={styles.minMax}>0</Text>
              <View
                style={styles.sliderContainer}
                onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
              >
                <View
                  style={[
                    styles.valueBubble,
                    { left: calcBubbleLeft(mental) },
                  ]}
                >
                  <Text style={styles.valueBubbleText}>{mental}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={200}
                  step={1}
                  value={mental}
                  onValueChange={(v: number | number[]) =>
                    setMental(Array.isArray(v) ? v[0] : v)
                  }
                  minimumTrackTintColor={Colors.softBlueGradient}
                  maximumTrackTintColor={Colors.lightBlueWash}
                  thumbTintColor={Colors.deepNeuroBlue}
                />
              </View>
              <Text style={styles.minMax}>200</Text>
            </View>
          </View>
        </FormRow>
        <FormRow label="最高血圧" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <View style={styles.bpRow}>
            <TextInput
              style={styles.numberInput}
              inputMode="numeric"
              value={bpSys}
              onChangeText={setBpSys}
            />
            <Text style={styles.mmHg}>mmHg</Text>
          </View>
        </FormRow>
        <FormRow label="最低血圧" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth}>
          <View style={styles.bpRow}>
            <TextInput
              style={styles.numberInput}
              inputMode="numeric"
              value={bpDia}
              onChangeText={setBpDia}
            />
            <Text style={styles.mmHg}>mmHg</Text>
          </View>
        </FormRow>
        <FormRow label="メモ" onMeasureLabel={onMeasureLabel} labelMaxWidth={labelMaxWidth} alignTop>
          <TextInput
            style={styles.textArea}
            value={memo}
            onChangeText={setMemo}
            placeholder="体調などの詳細を追加で記録してください"
            multiline
            textAlignVertical="top"
          />
        </FormRow>
      </View>

      <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]} onPress={handleSave}>
        <Text style={styles.saveText}>保存</Text>
      </Pressable>
    </ScrollView>
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
  sliderBlock: {
    width: '100%',
    marginVertical: 8,
  },
  sliderContainer: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
  },
  sliderRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    width: '100%',
  },
  slider: {
    flex: 1,
    height: 34,
  },
  valueBubble: {
    position: 'absolute',
    top: -22,
    transform: [{ translateX: -10 }],
    backgroundColor: Colors.deepNeuroBlue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  valueBubbleText: {
    color: Colors.pureWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  minMax: {
    color: Colors.grayBlue,
    fontSize: 12,
    width: 32,
    textAlign: 'center',
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


