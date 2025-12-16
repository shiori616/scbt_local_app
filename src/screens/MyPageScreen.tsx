import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../theme/colors';
import {
  getMedications,
  saveMedication,
  deleteMedication,
  Medication,
  INTAKE_TIMINGS,
} from '../services/db/database';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// 日付をYYYYMMDD形式に変換
function dateToNumber(date: Date | null | undefined): number | null {
  if (!date) return null;
  return (
    date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate()
  );
}

// YYYYMMDD形式をDateオブジェクトに変換
function numberToDate(num: number | null | undefined): Date | null {
  if (!num) return null;
  const str = String(num);
  if (str.length !== 8) return null;
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10) - 1;
  const day = parseInt(str.slice(6, 8), 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
}

// YYYYMMDD形式を表示用文字列に変換
function formatDateNumber(num: number | null | undefined): string {
  if (!num) return '-';
  const str = String(num);
  if (str.length !== 8) return '-';
  return `${str.slice(0, 4)}/${str.slice(4, 6)}/${str.slice(6, 8)}`;
}

// Dateを表示用文字列に変換
function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// 服用タイミングのIDからラベルを取得
function getTimingLabel(id: number): string {
  const timing = INTAKE_TIMINGS.find(t => t.id === id);
  return timing?.label ?? '-';
}

export default function MyPageScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  
  // フォーム状態
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [intakeTiming, setIntakeTiming] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // 日付ピッカーの表示状態
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // データ読み込み
  const loadMedications = useCallback(async () => {
    const data = await getMedications();
    setMedications(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMedications();
    }, [loadMedications])
  );

  useEffect(() => {
    void loadMedications();
  }, [loadMedications]);

  // モーダルを開く（新規追加）
  const openAddModal = () => {
    setEditingMedication(null);
    setMedicationName('');
    setDosage('');
    setIntakeTiming(1);
    setStartDate(null);
    setEndDate(null);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setIsModalVisible(true);
  };

  // モーダルを開く（編集）
  const openEditModal = (med: Medication) => {
    setEditingMedication(med);
    setMedicationName(med.medicationName);
    setDosage(med.dosage ?? '');
    setIntakeTiming(med.intakeTiming);
    setStartDate(numberToDate(med.startDate));
    setEndDate(numberToDate(med.endDate));
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setIsModalVisible(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalVisible(false);
    setEditingMedication(null);
  };

  // 保存
  const handleSave = async () => {
    if (!medicationName.trim()) {
      Alert.alert('エラー', '薬名を入力してください');
      return;
    }

    const medication: Medication = {
      id: editingMedication?.id,
      medicationName: medicationName.trim(),
      dosage: dosage.trim() || null,
      intakeTiming,
      startDate: dateToNumber(startDate),
      endDate: dateToNumber(endDate),
    };

    try {
      await saveMedication(medication);
      await loadMedications();
      closeModal();
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };
  
  // 日付ピッカーのハンドラー
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };
  
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // 削除
  const handleDelete = (med: Medication) => {
    Alert.alert(
      '削除確認',
      `「${med.medicationName}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (med.id) {
              await deleteMedication(med.id);
              await loadMedications();
            }
          },
        },
      ]
    );
  };

  // 服用薬カード
  const renderMedicationCard = ({ item }: { item: Medication }) => (
    <View style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <Text style={styles.medicationName}>{item.medicationName}</Text>
        <View style={styles.cardActions}>
          <Pressable onPress={() => openEditModal(item)} style={styles.actionBtn}>
            <Ionicons name="pencil" size={18} color={Colors.deepNeuroBlue} />
          </Pressable>
          <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#D64545" />
          </Pressable>
        </View>
      </View>
      {item.dosage && (
        <Text style={styles.medicationDetail}>用量: {item.dosage}</Text>
      )}
      <Text style={styles.medicationDetail}>
        服用タイミング: {getTimingLabel(item.intakeTiming)}
      </Text>
      <View style={styles.dateRow}>
        <Text style={styles.medicationDetail}>
          開始: {formatDateNumber(item.startDate)}
        </Text>
        <Text style={styles.medicationDetail}>
          終了: {formatDateNumber(item.endDate)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>マイページ</Text>
      </View>

      {/* 服用薬セクション */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>服用薬</Text>
        <Pressable onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color={Colors.deepNeuroBlue} />
        </Pressable>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>登録された服用薬はありません</Text>
          <Pressable onPress={openAddModal} style={styles.emptyAddBtn}>
            <Text style={styles.emptyAddBtnText}>服用薬を追加</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMedicationCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 追加・編集モーダル */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMedication ? '服用薬を編集' : '服用薬を追加'}
              </Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.deepInkBrown} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 薬名 */}
              <Text style={styles.inputLabel}>薬名 *</Text>
              <TextInput
                style={styles.textInput}
                value={medicationName}
                onChangeText={setMedicationName}
                placeholder="薬名を入力"
                placeholderTextColor={Colors.grayBlue}
              />

              {/* 用量 */}
              <Text style={styles.inputLabel}>用量</Text>
              <TextInput
                style={styles.textInput}
                value={dosage}
                onChangeText={setDosage}
                placeholder="例: 100mg、1錠"
                placeholderTextColor={Colors.grayBlue}
              />

              {/* 服用タイミング */}
              <Text style={styles.inputLabel}>服用タイミング *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={intakeTiming}
                  onValueChange={(value) => setIntakeTiming(value)}
                  style={styles.picker}
                >
                  {INTAKE_TIMINGS.map((timing) => (
                    <Picker.Item
                      key={timing.id}
                      label={timing.label}
                      value={timing.id}
                    />
                  ))}
                </Picker>
              </View>

              {/* 開始日 */}
              <Text style={styles.inputLabel}>服用開始日</Text>
              <Pressable
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.datePickerText, !startDate && styles.datePickerPlaceholder]}>
                  {startDate ? formatDate(startDate) : '日付を選択'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.deepNeuroBlue} />
              </Pressable>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                  maximumDate={endDate || undefined}
                />
              )}

              {/* 終了日 */}
              <Text style={styles.inputLabel}>服用終了日</Text>
              <Pressable
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.datePickerText, !endDate && styles.datePickerPlaceholder]}>
                  {endDate ? formatDate(endDate) : '日付を選択'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.deepNeuroBlue} />
              </Pressable>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                  minimumDate={startDate || undefined}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable onPress={closeModal} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBlueWash,
  },
  header: {
    backgroundColor: Colors.pureWhite,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF2',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.deepInkBrown,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.deepInkBrown,
  },
  addBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  medicationCard: {
    backgroundColor: Colors.pureWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.deepNeuroBlue,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  medicationDetail: {
    fontSize: 14,
    color: Colors.deepInkBrown,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grayBlue,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: Colors.deepNeuroBlue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: Colors.pureWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.deepInkBrown,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.deepInkBrown,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDE3EE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.deepInkBrown,
    backgroundColor: Colors.pureWhite,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDE3EE',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.pureWhite,
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE3EE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.pureWhite,
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.deepInkBrown,
  },
  datePickerPlaceholder: {
    color: Colors.grayBlue,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5EAF2',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDE3EE',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    color: Colors.deepInkBrown,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.deepNeuroBlue,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.pureWhite,
  },
});
