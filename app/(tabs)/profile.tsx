import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  useColorScheme,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, darkColors, commonStyles, textStyles, buttonStyles } from '@/styles/commonStyles';

interface Settings {
  whatsappNumber: string;
  autoOpenWhatsApp: boolean;
  showNotifications: boolean;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const currentColors = colorScheme === 'dark' ? darkColors : colors;
  
  const [settings, setSettings] = useState<Settings>({
    whatsappNumber: '',
    autoOpenWhatsApp: true,
    showNotifications: true,
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        console.log('Loaded settings:', parsedSettings);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      console.log('Settings saved:', newSettings);
      Alert.alert('موفق', 'تنظیمات ذخیره شد');
    } catch (error) {
      console.log('Error saving settings:', error);
      Alert.alert('خطا', 'خطا در ذخیره تنظیمات');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'حذف تمام داده‌ها',
      'آیا مطمئن هستید که می‌خواهید تمام داده‌ها را حذف کنید؟ این عمل قابل بازگشت نیست.',
      [
        { text: 'لغو', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['textPickerData', 'appSettings']);
              setSettings({
                whatsappNumber: '',
                autoOpenWhatsApp: true,
                showNotifications: true,
              });
              Alert.alert('موفق', 'تمام داده‌ها حذف شدند');
            } catch (error) {
              console.log('Error clearing data:', error);
              Alert.alert('خطا', 'خطا در حذف داده‌ها');
            }
          }
        }
      ]
    );
  };

  const handleSaveSettings = () => {
    if (settings.whatsappNumber && !settings.whatsappNumber.match(/^\d+$/)) {
      Alert.alert('خطا', 'شماره واتساپ باید فقط شامل اعداد باشد');
      return;
    }
    saveSettings(settings);
    setIsEditing(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'تنظیمات',
          headerTitleStyle: { fontFamily: 'Vazirmatn_600SemiBold' }
        }}
      />
      
      <ScrollView 
        style={[commonStyles.container, { backgroundColor: currentColors.background }]}
        contentContainerStyle={{ paddingBottom: Platform.OS !== 'ios' ? 100 : 20 }}
      >
        {/* App Info Card */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: currentColors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <IconSymbol name="doc.text" size={40} color={currentColors.card} />
            </View>
            <Text style={[textStyles.title, { color: currentColors.text, fontSize: 20 }]}>
              انتخابگر متن تصادفی
            </Text>
            <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
              نسخه 1.0.0
            </Text>
          </View>
        </View>

        {/* WhatsApp Settings */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
          <Text style={[textStyles.subtitle, { color: currentColors.text, marginBottom: 16 }]}>
            تنظیمات واتساپ
          </Text>
          
          <View style={{ marginBottom: 16 }}>
            <Text style={[textStyles.body, { color: currentColors.text, marginBottom: 8 }]}>
              شماره واتساپ (اختیاری):
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
              value={settings.whatsappNumber}
              onChangeText={(text) => setSettings({...settings, whatsappNumber: text})}
              placeholder="مثال: 989123456789"
              placeholderTextColor={currentColors.textSecondary}
              keyboardType="numeric"
              editable={isEditing}
            />
            <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, marginTop: 4 }]}>
              شماره را با کد کشور وارد کنید (بدون + یا 00)
            </Text>
          </View>

          <TouchableOpacity
            style={[
              buttonStyles.primary,
              { backgroundColor: isEditing ? currentColors.accent : currentColors.primary }
            ]}
            onPress={isEditing ? handleSaveSettings : () => setIsEditing(true)}
          >
            <Text style={[textStyles.button, { color: currentColors.card }]}>
              {isEditing ? 'ذخیره تنظیمات' : 'ویرایش تنظیمات'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Instructions */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
          <Text style={[textStyles.subtitle, { color: currentColors.text, marginBottom: 16 }]}>
            راهنمای کامل
          </Text>
          <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
            <Text style={{ fontWeight: '600' }}>1. آپلود فایل اکسل:</Text>{'\n'}
            • فایل اکسل خود را انتخاب کنید{'\n'}
            • فقط ستون اول خوانده می‌شود{'\n'}
            • سلول‌های خالی نادیده گرفته می‌شوند{'\n'}
            • متن‌های تکراری حذف می‌شوند{'\n\n'}
            
            <Text style={{ fontWeight: '600' }}>2. انتخاب متن تصادفی:</Text>{'\n'}
            • روی "کپی متن بعدی" کلیک کنید{'\n'}
            • متن به صورت تصادفی انتخاب می‌شود{'\n'}
            • متن به کلیپ‌بورد کپی می‌شود{'\n'}
            • متن استفاده شده حذف می‌شود{'\n\n'}
            
            <Text style={{ fontWeight: '600' }}>3. ارسال در واتساپ:</Text>{'\n'}
            • شماره واتساپ را در تنظیمات وارد کنید{'\n'}
            • روی "ارسال در واتساپ" کلیک کنید{'\n'}
            • واتساپ با متن آماده باز می‌شود{'\n\n'}
            
            <Text style={{ fontWeight: '600' }}>4. بازنشانی:</Text>{'\n'}
            • تمام متن‌ها دوباره قابل انتخاب می‌شوند{'\n'}
            • برای تأیید "Reset" تایپ کنید
          </Text>
        </View>

        {/* Data Management */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
          <Text style={[textStyles.subtitle, { color: currentColors.text, marginBottom: 16 }]}>
            مدیریت داده‌ها
          </Text>
          
          <TouchableOpacity
            style={[
              buttonStyles.outline,
              { borderColor: currentColors.error }
            ]}
            onPress={clearAllData}
          >
            <IconSymbol name="trash" size={20} color={currentColors.error} />
            <Text style={[textStyles.button, { color: currentColors.error, marginTop: 4 }]}>
              حذف تمام داده‌ها
            </Text>
          </TouchableOpacity>
          
          <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            این عمل تمام متن‌ها و تنظیمات را حذف می‌کند
          </Text>
        </View>

        {/* About */}
        <View style={[commonStyles.card, { backgroundColor: currentColors.card }]}>
          <Text style={[textStyles.subtitle, { color: currentColors.text, marginBottom: 16 }]}>
            درباره برنامه
          </Text>
          <Text style={[textStyles.bodySecondary, { color: currentColors.textSecondary }]}>
            این برنامه برای انتخاب تصادفی متن از فایل‌های اکسل طراحی شده است. 
            تمام داده‌ها به صورت محلی در دستگاه شما ذخیره می‌شوند و هیچ اطلاعاتی به سرور ارسال نمی‌شود.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
