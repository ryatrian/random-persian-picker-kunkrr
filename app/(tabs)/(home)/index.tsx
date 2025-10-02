
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, darkColors, commonStyles, textStyles, buttonStyles } from '@/styles/commonStyles';

interface TextData {
  texts: string[];
  usedTexts: string[];
  totalTexts: number;
}

interface AutoSendSchedule {
  id: string;
  text: string;
  scheduledTime: Date;
  sent: boolean;
}

interface AutoSendSession {
  isActive: boolean;
  startTime: string;
  endTime: string;
  textCount: number;
  schedules: AutoSendSchedule[];
  createdAt: Date;
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

  // Auto-send states
  const [showAutoSendModal, setShowAutoSendModal] = useState(false);
  const [autoSendSession, setAutoSendSession] = useState<AutoSendSession>({
    isActive: false,
    startTime: '09:00',
    endTime: '17:00',
    textCount: 5,
    schedules: [],
    createdAt: new Date()
  });
  const [tempStartTime, setTempStartTime] = useState('09:00');
  const [tempEndTime, setTempEndTime] = useState('17:00');
  const [tempTextCount, setTempTextCount] = useState('5');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load saved data on app start
  useEffect(() => {
    loadSavedData();
    loadAutoSendSession();
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Check for scheduled sends
  useEffect(() => {
    if (autoSendSession.isActive) {
      const checkInterval = setInterval(() => {
        checkScheduledSends();
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [autoSendSession]);

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

  const loadAutoSendSession = async () => {
    try {
      const savedSession = await AsyncStorage.getItem('autoSendSession');
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        // Convert date strings back to Date objects
        parsedSession.schedules = parsedSession.schedules.map((schedule: any) => ({
          ...schedule,
          scheduledTime: new Date(schedule.scheduledTime)
        }));
        parsedSession.createdAt = new Date(parsedSession.createdAt);
        setAutoSendSession(parsedSession);
        console.log('Loaded auto-send session:', parsedSession);
      }
    } catch (error) {
      console.log('Error loading auto-send session:', error);
    }
  };

  const saveAutoSendSession = async (session: AutoSendSession) => {
    try {
      await AsyncStorage.setItem('autoSendSession', JSON.stringify(session));
      console.log('Auto-send session saved');
    } catch (error) {
      console.log('Error saving auto-send session:', error);
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

  const sendToWhatsApp = async (text?: string) => {
    const textToSend = text || selectedText;
    if (!textToSend) {
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

      const message = encodeURIComponent(textToSend);
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

  const generateRandomSchedules = (startTime: string, endTime: string, count: number): AutoSendSchedule[] => {
    const schedules: AutoSendSchedule[] = [];
    const today = new Date();
    
    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDate = new Date(today);
    startDate.setHours(startHour, startMinute, 0, 0);
    
    const endDate = new Date(today);
    endDate.setHours(endHour, endMinute, 0, 0);
    
    // If end time is before start time, assume it's next day
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const interval = totalDuration / count;
    
    // Get available texts
    const availableTexts = [...textData.texts];
    
    for (let i = 0; i < count && i < availableTexts.length; i++) {
      // Calculate base time for this slot
      const baseTime = startDate.getTime() + (interval * i);
      
      // Add random variation (±15 minutes)
      const randomVariation = (Math.random() - 0.5) * 30 * 60 * 1000; // ±30 minutes in milliseconds
      const scheduledTime = new Date(baseTime + randomVariation);
      
      // Ensure it's within bounds
      if (scheduledTime < startDate) scheduledTime.setTime(startDate.getTime());
      if (scheduledTime > endDate) scheduledTime.setTime(endDate.getTime());
      
      // Pick random text
      const randomIndex = Math.floor(Math.random() * availableTexts.length);
      const text = availableTexts.splice(randomIndex, 1)[0];
      
      schedules.push({
        id: `schedule_${Date.now()}_${i}`,
        text,
        scheduledTime,
        sent: false
      });
    }
    
    // Sort by scheduled time
    schedules.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    
    return schedules;
  };

  const startAutoSend = async () => {
    // Validate inputs
    if (!tempStartTime || !tempEndTime || !tempTextCount) {
      showNotificationMessage('لطفا تمام فیلدها را پر کنید', true);
      return;
    }

    const count = parseInt(tempTextCount);
    if (isNaN(count) || count <= 0) {
      showNotificationMessage('تعداد متن‌ها باید عدد مثبت باشد', true);
      return;
    }

    if (count > textData.texts.length) {
      showNotificationMessage(`تعداد متن‌های موجود (${textData.texts.length}) کمتر از تعداد درخواستی است`, true);
      return;
    }

    // Generate schedules
    const schedules = generateRandomSchedules(tempStartTime, tempEndTime, count);
    
    const newSession: AutoSendSession = {
      isActive: true,
      startTime: tempStartTime,
      endTime: tempEndTime,
      textCount: count,
      schedules,
      createdAt: new Date()
    };

    setAutoSendSession(newSession);
    await saveAutoSendSession(newSession);
    setShowAutoSendModal(false);
    
    showNotificationMessage(`ارسال خودکار ${count} متن برنامه‌ریزی شد`);
  };

  const cancelAutoSend = async () => {
    Alert.alert(
      'لغو ارسال خودکار',
      'آیا مطمئن هستید که می‌خواهید ارسال خودکار را لغو کنید?',
      [
        { text: 'خیر', style: 'cancel' },
        { 
          text: 'بله', 
          style: 'destructive',
          onPress: async () => {
            const canceledSession: AutoSendSession = {
              ...autoSendSession,
              isActive: false
            };
            setAutoSendSession(canceledSession);
            await saveAutoSendSession(canceledSession);
            showNotificationMessage('ارسال خودکار لغو شد');
          }
        }
      ]
    );
  };

  const checkScheduledSends = async () => {
    if (!autoSendSession.isActive) return;

    const now = new Date();
    const updatedSchedules = [...autoSendSession.schedules];
    let hasChanges = false;

    for (let i = 0; i < updatedSchedules.length; i++) {
      const schedule = updatedSchedules[i];
      if (!schedule.sent && now >= schedule.scheduledTime) {
        // Send the text
        await sendToWhatsApp(schedule.text);
        
        // Mark as sent
        updatedSchedules[i] = { ...schedule, sent: true };
        hasChanges = true;
        
        // Remove text from available texts
        const updatedData: TextData = {
          texts: textData.texts.filter(text => text !== schedule.text),
          usedTexts: [...textData.usedTexts, schedule.text],
          totalTexts: textData.totalTexts
        };
        setTextData(updatedData);
        await saveData(updatedData);
        
        console.log('Auto-sent text:', schedule.text);
      }
    }

    if (hasChanges) {
      const updatedSession = {
        ...autoSendSession,
        schedules: updatedSchedules
      };
      
      // Check if all schedules are completed
      const allSent = updatedSchedules.every(schedule => schedule.sent);
      if (allSent) {
        updatedSession.isActive = false;
        showNotificationMessage('ارسال خودکار تکمیل شد');
      }
      
      setAutoSendSession(updatedSession);
      await saveAutoSendSession(updatedSession);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fa-IR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getTimeUntilNext = (scheduledTime: Date) => {
    const now = new Date();
    const diff = scheduledTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'در حال ارسال...';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours} ساعت و ${remainingMinutes} دقیقه`;
    } else {
      return `${remainingMinutes} دقیقه`;
    }
  };

  const onStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      const timeString = selectedDate.toTimeString().slice(0, 5);
      setTempStartTime(timeString);
    }
  };

  const onEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      const timeString = selectedDate.toTimeString().slice(0, 5);
      setTempEndTime(timeString);
    }
  };

  const progress = textData.totalTexts > 0 ? (textData.usedTexts.length / textData.totalTexts) * 100 : 0;
  const nextSchedule = autoSendSession.schedules.find(s => !s.sent);

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

        {/* Auto-Send Status */}
        {autoSendSession.isActive && (
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: currentColors.accent,
              borderColor: currentColors.accent,
              marginBottom: 16
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <IconSymbol name="clock" size={24} color={currentColors.card} />
              <Text style={[textStyles.subtitle, { color: currentColors.card, marginLeft: 8 }]}>
                ارسال خودکار فعال است
              </Text>
            </View>
            
            {nextSchedule && (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Text style={[textStyles.body, { color: currentColors.card, textAlign: 'center' }]}>
                  ارسال بعدی: {formatTime(nextSchedule.scheduledTime)}
                </Text>
                <Text style={[textStyles.bodySecondary, { color: currentColors.card, textAlign: 'center' }]}>
                  {getTimeUntilNext(nextSchedule.scheduledTime)}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                buttonStyles.outline,
                { borderColor: currentColors.card, marginTop: 8 }
              ]}
              onPress={cancelAutoSend}
            >
              <Text style={[textStyles.button, { color: currentColors.card }]}>
                لغو ارسال خودکار
              </Text>
            </TouchableOpacity>
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

        {/* Auto-Send Button */}
        {textData.texts.length > 0 && !autoSendSession.isActive && (
          <TouchableOpacity
            style={[
              buttonStyles.accent,
              commonStyles.fullWidthButton,
              { backgroundColor: currentColors.warning }
            ]}
            onPress={() => setShowAutoSendModal(true)}
          >
            <IconSymbol name="clock.arrow.circlepath" size={20} color={currentColors.card} />
            <Text style={[textStyles.button, { color: currentColors.card, marginTop: 4 }]}>
              ارسال خودکار به واتساپ
            </Text>
          </TouchableOpacity>
        )}

        {/* WhatsApp Button */}
        {selectedText !== '' && (
          <TouchableOpacity
            style={[
              buttonStyles.accent,
              commonStyles.fullWidthButton,
              { backgroundColor: currentColors.accent }
            ]}
            onPress={() => sendToWhatsApp()}
          >
            <IconSymbol name="message" size={20} color={currentColors.card} />
            <Text style={[textStyles.button, { color: currentColors.card, marginTop: 4 }]}>
              ارسال در واتساپ
            </Text>
          </TouchableOpacity>
        )}

        {/* Scheduled Sends List */}
        {autoSendSession.schedules.length > 0 && (
          <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
            <Text style={[textStyles.subtitle, { color: currentColors.text, marginBottom: 16 }]}>
              برنامه ارسال
            </Text>
            {autoSendSession.schedules.map((schedule, index) => (
              <View 
                key={schedule.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderBottomWidth: index < autoSendSession.schedules.length - 1 ? 1 : 0,
                  borderBottomColor: currentColors.border
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[textStyles.body, { color: currentColors.text }]}>
                    {formatTime(schedule.scheduledTime)}
                  </Text>
                  <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]} numberOfLines={1}>
                    {schedule.text.substring(0, 30)}...
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  {schedule.sent ? (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={currentColors.accent} />
                  ) : (
                    <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, fontSize: 12 }]}>
                      {getTimeUntilNext(schedule.scheduledTime)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
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
            • می‌توانید متن را در واتساپ ارسال کنید{'\n'}
            • برای ارسال خودکار، زمان شروع و پایان و تعداد متن‌ها را تنظیم کنید
          </Text>
        </View>

        {/* Auto-Send Modal */}
        <Modal
          visible={showAutoSendModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAutoSendModal(false)}
        >
          <View style={commonStyles.modalOverlay}>
            <View style={[commonStyles.modalContent, { backgroundColor: currentColors.card, maxHeight: '80%' }]}>
              <Text style={[textStyles.title, { color: currentColors.text, fontSize: 20 }]}>
                ارسال خودکار به واتساپ
              </Text>
              
              <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                {/* Start Time */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={[textStyles.body, { color: currentColors.text, marginBottom: 8 }]}>
                    زمان شروع:
                  </Text>
                  <TouchableOpacity
                    style={[
                      commonStyles.input,
                      { 
                        backgroundColor: currentColors.background,
                        borderColor: currentColors.border,
                        justifyContent: 'center'
                      }
                    ]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={[textStyles.body, { color: currentColors.text }]}>
                      {tempStartTime}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* End Time */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={[textStyles.body, { color: currentColors.text, marginBottom: 8 }]}>
                    زمان پایان:
                  </Text>
                  <TouchableOpacity
                    style={[
                      commonStyles.input,
                      { 
                        backgroundColor: currentColors.background,
                        borderColor: currentColors.border,
                        justifyContent: 'center'
                      }
                    ]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={[textStyles.body, { color: currentColors.text }]}>
                      {tempEndTime}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Text Count */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={[textStyles.body, { color: currentColors.text, marginBottom: 8 }]}>
                    تعداد متن‌ها:
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
                    value={tempTextCount}
                    onChangeText={setTempTextCount}
                    placeholder="مثال: 5"
                    placeholderTextColor={currentColors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, marginTop: 4 }]}>
                    حداکثر: {textData.texts.length} متن موجود
                  </Text>
                </View>

                {/* Info */}
                <View style={{ 
                  backgroundColor: currentColors.highlight, 
                  padding: 16, 
                  borderRadius: 8, 
                  marginBottom: 16 
                }}>
                  <Text style={[textStyles.bodySecondary, { color: currentColors.text }]}>
                    • متن‌ها در زمان‌های تصادفی بین بازه انتخابی ارسال می‌شوند{'\n'}
                    • هر متن فقط یک بار ارسال می‌شود{'\n'}
                    • برنامه در پس‌زمینه کار می‌کند{'\n'}
                    • شماره واتساپ باید در تنظیمات وارد شده باشد
                  </Text>
                </View>
              </ScrollView>

              <View style={[commonStyles.buttonRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[
                    buttonStyles.outline,
                    commonStyles.halfWidthButton,
                    { borderColor: currentColors.textSecondary }
                  ]}
                  onPress={() => setShowAutoSendModal(false)}
                >
                  <Text style={[textStyles.button, { color: currentColors.textSecondary }]}>
                    لغو
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    buttonStyles.primary,
                    commonStyles.halfWidthButton,
                    { backgroundColor: currentColors.accent }
                  ]}
                  onPress={startAutoSend}
                >
                  <Text style={[textStyles.button, { color: currentColors.card }]}>
                    شروع ارسال
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Time Pickers */}
        {showStartTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01T${tempStartTime}:00`)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01T${tempEndTime}:00`)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onEndTimeChange}
          />
        )}

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
