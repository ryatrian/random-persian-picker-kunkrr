import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal, 
  TextInput,
  useColorScheme,
  Platform,
  Linking,
  Animated
} from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, darkColors, commonStyles, textStyles, buttonStyles } from '@/styles/commonStyles';

interface TextData {
  texts: string[];
  usedTexts: string[];
  totalTexts: number;
}

export default function RandomTextPicker() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const currentColors = colorScheme === 'dark' ? darkColors : colors;
  
  const [textData, setTextData] = useState<TextData>({
    texts: [],
    usedTexts: [],
    totalTexts: 0
  });
  const [selectedText, setSelectedText] = useState<string>('');
  const [showNotification, setShowNotification] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Load saved data on app start
  useEffect(() => {
    loadSavedData();
  }, []);

  // Animate loading spinner
  useEffect(() => {
    if (isLoading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [isLoading, spinValue]);

  const loadSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('textPickerData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setTextData(parsedData);
        console.log('Loaded saved data:', parsedData);
      }
    } catch (error) {
      console.log('Error loading saved data:', error);
    }
  };

  const saveData = async (data: TextData) => {
    try {
      await AsyncStorage.setItem('textPickerData', JSON.stringify(data));
      console.log('Data saved successfully');
    } catch (error) {
      console.log('Error saving data:', error);
    }
  };

  const showNotificationMessage = (message: string, isError = false) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(''), 3000);
  };

  const pickExcelFile = async () => {
    try {
      setIsLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        console.log('Selected file:', file);
        await processExcelFile(file.uri);
      }
    } catch (error) {
      console.log('Error picking file:', error);
      showNotificationMessage('خطا در انتخاب فایل', true);
    } finally {
      setIsLoading(false);
    }
  };

  const processExcelFile = async (fileUri: string) => {
    try {
      console.log('Processing Excel file:', fileUri);
      
      // Read file as base64
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error('Failed to read file');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Parse Excel file
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error('Could not read worksheet');
      }
      
      // Convert to JSON and extract first column
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('Raw Excel data:', jsonData);
      
      const firstColumnTexts = jsonData
        .map((row: any) => {
          // Handle different data types
          const cellValue = row[0];
          if (cellValue === null || cellValue === undefined) return null;
          return String(cellValue).trim();
        })
        .filter((text: string | null) => text && text !== '')
        .map((text: string) => text);

      console.log('Extracted texts:', firstColumnTexts);

      // Remove duplicates
      const uniqueTexts = [...new Set(firstColumnTexts)];
      
      if (uniqueTexts.length === 0) {
        showNotificationMessage('فایل خالی است یا متن قابل خواندنی ندارد', true);
        return;
      }

      // Merge with existing texts
      const existingTexts = new Set([...textData.texts, ...textData.usedTexts]);
      const newTexts = uniqueTexts.filter(text => !existingTexts.has(text));
      
      const updatedData: TextData = {
        texts: [...textData.texts, ...newTexts],
        usedTexts: textData.usedTexts,
        totalTexts: textData.totalTexts + newTexts.length
      };

      setTextData(updatedData);
      await saveData(updatedData);
      
      if (newTexts.length === 0) {
        showNotificationMessage('تمام متن‌ها قبلاً اضافه شده‌اند');
      } else {
        showNotificationMessage(`${newTexts.length} متن جدید اضافه شد`);
      }
      
      console.log('Processed texts:', updatedData);
      
    } catch (error) {
      console.log('Error processing Excel file:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطای نامشخص';
      showNotificationMessage(`خطا در پردازش فایل: ${errorMessage}`, true);
    }
  };

  const pickRandomText = async () => {
    if (textData.texts.length === 0) {
      showNotificationMessage('ابتدا فایل اکسل را آپلود کنید', true);
      return;
    }

    // Pick random text
    const randomIndex = Math.floor(Math.random() * textData.texts.length);
    const pickedText = textData.texts[randomIndex];
    
    // Update state
    const updatedTexts = textData.texts.filter((_, index) => index !== randomIndex);
    const updatedData: TextData = {
      texts: updatedTexts,
      usedTexts: [...textData.usedTexts, pickedText],
      totalTexts: textData.totalTexts
    };

    setTextData(updatedData);
    setSelectedText(pickedText);
    await saveData(updatedData);

    // Copy to clipboard
    try {
      await Clipboard.setStringAsync(pickedText);
      showNotificationMessage('کپی شد!');
      console.log('Text copied to clipboard:', pickedText);
    } catch (error) {
      console.log('Error copying to clipboard:', error);
      showNotificationMessage('خطا در کپی کردن', true);
    }
  };

  const sendToWhatsApp = async () => {
    if (!selectedText) {
      showNotificationMessage('ابتدا متنی را انتخاب کنید', true);
      return;
    }

    try {
      // Load WhatsApp number from settings
      const savedSettings = await AsyncStorage.getItem('appSettings');
      let phoneNumber = '';
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        phoneNumber = settings.whatsappNumber || '';
      }

      if (!phoneNumber) {
        showNotificationMessage('ابتدا شماره واتساپ را در تنظیمات وارد کنید', true);
        return;
      }

      const message = encodeURIComponent(selectedText);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      console.log('Error opening WhatsApp:', error);
      showNotificationMessage('خطا در باز کردن واتساپ', true);
    }
  };

  const resetTexts = async () => {
    if (resetConfirmText !== 'Reset') {
      showNotificationMessage('لطفا کلمه "Reset" را وارد کنید', true);
      return;
    }

    const resetData: TextData = {
      texts: [...textData.texts, ...textData.usedTexts],
      usedTexts: [],
      totalTexts: textData.totalTexts
    };

    setTextData(resetData);
    setSelectedText('');
    setShowResetModal(false);
    setResetConfirmText('');
    await saveData(resetData);
    
    showNotificationMessage('تمام متن‌ها بازنشانی شدند');
  };

  const progress = textData.totalTexts > 0 ? (textData.usedTexts.length / textData.totalTexts) * 100 : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'انتخابگر متن تصادفی',
          headerTitleStyle: { fontFamily: 'Vazirmatn_600SemiBold' }
        }}
      />
      
      <ScrollView 
        style={[commonStyles.container, { backgroundColor: currentColors.background }]}
        contentContainerStyle={{ paddingBottom: Platform.OS !== 'ios' ? 100 : 20 }}
      >
        {/* Notification */}
        {showNotification !== '' && (
          <View style={[
            commonStyles.notification,
            { 
              backgroundColor: showNotification.includes('خطا') ? currentColors.error : currentColors.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }
          ]}>
            <IconSymbol 
              name={showNotification.includes('خطا') ? 'exclamationmark.triangle' : 'checkmark.circle'} 
              size={20} 
              color={currentColors.card} 
            />
            <Text style={[textStyles.body, { color: currentColors.card, textAlign: 'center', marginLeft: 8 }]}>
              {showNotification}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text style={[textStyles.title, { color: currentColors.text }]}>
          انتخابگر متن تصادفی
        </Text>

        {/* Empty State */}
        {textData.totalTexts === 0 && (
          <View style={[commonStyles.card, { backgroundColor: currentColors.card, alignItems: 'center' }]}>
            <IconSymbol name="doc.badge.plus" size={60} color={currentColors.textSecondary} />
            <Text style={[textStyles.subtitle, { color: currentColors.text, marginTop: 16 }]}>
              شروع کنید
            </Text>
            <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, textAlign: 'center' }]}>
              برای شروع، فایل اکسل خود را آپلود کنید.{'\n'}
              متن‌های ستون اول خوانده خواهند شد.
            </Text>
          </View>
        )}

        {/* Progress Card */}
        {textData.totalTexts > 0 && (
          <View style={[commonStyles.progressContainer, { backgroundColor: currentColors.card }]}>
            <Text style={[textStyles.subtitle, { color: currentColors.text }]}>
              پیشرفت
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.body, { color: currentColors.primary, fontWeight: '700' }]}>
                  {textData.usedTexts.length}
                </Text>
                <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
                  استفاده شده
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.body, { color: currentColors.secondary, fontWeight: '700' }]}>
                  {textData.texts.length}
                </Text>
                <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
                  باقی مانده
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.body, { color: currentColors.text, fontWeight: '700' }]}>
                  {textData.totalTexts}
                </Text>
                <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
                  کل
                </Text>
              </View>
            </View>
            
            {/* Progress Circle */}
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                borderWidth: 8,
                borderColor: currentColors.border,
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}>
                <View style={{
                  position: 'absolute',
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 8,
                  borderColor: 'transparent',
                  borderTopColor: currentColors.primary,
                  transform: [{ rotate: `${(progress / 100) * 360 - 90}deg` }],
                }} />
                <Text style={[textStyles.body, { color: currentColors.text, fontWeight: '700', fontSize: 18 }]}>
                  {Math.round(progress)}%
                </Text>
              </View>
            </View>
            
            <View style={[commonStyles.progressBar, { backgroundColor: currentColors.border }]}>
              <View 
                style={[
                  commonStyles.progressFill, 
                  { 
                    backgroundColor: currentColors.primary,
                    width: `${progress}%`
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Completion State */}
        {textData.totalTexts > 0 && textData.texts.length === 0 && (
          <View style={[
            commonStyles.selectedTextContainer, 
            { 
              backgroundColor: currentColors.accent,
              borderColor: currentColors.accent 
            }
          ]}>
            <IconSymbol name="checkmark.circle.fill" size={40} color={currentColors.card} />
            <Text style={[textStyles.subtitle, { color: currentColors.card, textAlign: 'center', marginTop: 8 }]}>
              تمام شد!
            </Text>
            <Text style={[textStyles.body, { color: currentColors.card, textAlign: 'center' }]}>
              تمام متن‌ها استفاده شدند.{'\n'}
              می‌توانید بازنشانی کنید یا فایل جدید آپلود کنید.
            </Text>
          </View>
        )}

        {/* Selected Text Display */}
        {selectedText !== '' && textData.texts.length > 0 && (
          <View style={[
            commonStyles.selectedTextContainer, 
            { 
              backgroundColor: currentColors.highlight,
              borderColor: currentColors.primary 
            }
          ]}>
            <Text style={[textStyles.body, { color: currentColors.text, textAlign: 'center' }]}>
              {selectedText}
            </Text>
          </View>
        )}

        {/* Main Action Buttons */}
        <View style={commonStyles.buttonRow}>
          <TouchableOpacity
            style={[
              buttonStyles.primary,
              commonStyles.halfWidthButton,
              { backgroundColor: currentColors.primary }
            ]}
            onPress={pickExcelFile}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Animated.View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: currentColors.card,
                  borderTopColor: 'transparent',
                  marginRight: 8,
                  transform: [{
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }} />
                <Text style={[textStyles.button, { color: currentColors.card }]}>
                  در حال بارگذاری...
                </Text>
              </View>
            ) : (
              <>
                <IconSymbol name="doc.badge.plus" size={20} color={currentColors.card} />
                <Text style={[textStyles.button, { color: currentColors.card, marginTop: 4 }]}>
                  آپلود فایل
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              buttonStyles.secondary,
              commonStyles.halfWidthButton,
              { backgroundColor: currentColors.secondary }
            ]}
            onPress={pickRandomText}
            disabled={textData.texts.length === 0}
          >
            <IconSymbol name="doc.on.clipboard" size={20} color={currentColors.card} />
            <Text style={[textStyles.button, { color: currentColors.card, marginTop: 4 }]}>
              کپی متن بعدی
            </Text>
          </TouchableOpacity>
        </View>

        {/* WhatsApp Button */}
        {selectedText !== '' && (
          <TouchableOpacity
            style={[
              buttonStyles.accent,
              commonStyles.fullWidthButton,
              { backgroundColor: currentColors.accent }
            ]}
            onPress={sendToWhatsApp}
          >
            <IconSymbol name="message" size={20} color={currentColors.card} />
            <Text style={[textStyles.button, { color: currentColors.card, marginTop: 4 }]}>
              ارسال در واتساپ
            </Text>
          </TouchableOpacity>
        )}

        {/* Reset Button */}
        {textData.totalTexts > 0 && (
          <TouchableOpacity
            style={[
              buttonStyles.outline,
              commonStyles.fullWidthButton,
              { borderColor: currentColors.error }
            ]}
            onPress={() => setShowResetModal(true)}
          >
            <IconSymbol name="arrow.clockwise" size={20} color={currentColors.error} />
            <Text style={[textStyles.button, { color: currentColors.error, marginTop: 4 }]}>
              بازنشانی
            </Text>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card, marginTop: 20 }]}>
          <Text style={[textStyles.subtitle, { color: currentColors.text }]}>
            راهنمای استفاده
          </Text>
          <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
            • ابتدا فایل اکسل خود را آپلود کنید{'\n'}
            • متن‌های ستون اول خوانده می‌شوند{'\n'}
            • با کلیک روی "کپی متن بعدی" یک متن تصادفی انتخاب می‌شود{'\n'}
            • متن انتخاب شده به کلیپ‌بورد کپی می‌شود{'\n'}
            • می‌توانید متن را در واتساپ ارسال کنید
          </Text>
        </View>

        {/* Reset Confirmation Modal */}
        <Modal
          visible={showResetModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowResetModal(false)}
        >
          <View style={commonStyles.modalOverlay}>
            <View style={[commonStyles.modalContent, { backgroundColor: currentColors.card }]}>
              <Text style={[textStyles.subtitle, { color: currentColors.text }]}>
                تأیید بازنشانی
              </Text>
              <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
                برای بازنشانی تمام متن‌ها، کلمه "Reset" را وارد کنید:
              </Text>
              <TextInput
                style={[
                  commonStyles.input,
                  { 
                    backgroundColor: currentColors.background,
                    borderColor: currentColors.border,
                    color: currentColors.text
                  }
                ]}
                value={resetConfirmText}
                onChangeText={setResetConfirmText}
                placeholder="Reset"
                placeholderTextColor={currentColors.textSecondary}
              />
              <View style={[commonStyles.buttonRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[
                    buttonStyles.outline,
                    commonStyles.halfWidthButton,
                    { borderColor: currentColors.textSecondary }
                  ]}
                  onPress={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                >
                  <Text style={[textStyles.button, { color: currentColors.textSecondary }]}>
                    لغو
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    buttonStyles.primary,
                    commonStyles.halfWidthButton,
                    { backgroundColor: currentColors.error }
                  ]}
                  onPress={resetTexts}
                >
                  <Text style={[textStyles.button, { color: currentColors.card }]}>
                    بازنشانی
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}
