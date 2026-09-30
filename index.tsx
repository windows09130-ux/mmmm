import emailjs from '@emailjs/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_rvp1d8r',
  TEMPLATE_ID: 'template_us4wozz',
  PUBLIC_KEY: 'XEqvOR9ZY9Ul_OCNC',
  ADMIN_EMAIL: 'mr.mohammad00wi@gmail.com',
};

interface CalfMilkItem {
  id: string;
  tagNumber: string;
  milkAmount: string;
  date: string;
}

interface CalvingRecordItem {
  id: string;
  motherTag: string;
  calfTag: string;
  gender: string;
  metalNumber: string;
  serialNumber: string;
  birthDate: string;
  birthTime: string;
}

interface EstrusCowItem {
  id: string;
  tagNumber: string;
  estrusDate: string;
  notes: string;
}

interface VaccineItem {
  id: string;
  vaccineName: string;
  tagNumber: string;
  vaccineDate: string;
}

// اینترفیس ساعت و هشدار (بدون صدا و لرزش)
interface PhoneAlarmItem {
  id: string;
  title: string;
  time: string;
  ampm: string;
  date: string;
}

interface UserAccount {
  email: string;
  password: string;
}

const STORAGE_KEYS = {
  ACCOUNTS_LIST: '@app_all_accounts',
  CURRENT_USER: '@app_current_logged_in_user',
};

const PERSIAN_MONTHS = [
  { name: 'فروردین', days: 31, code: '01' },
  { name: 'اردیبهشت', days: 31, code: '02' },
  { name: 'خرداد', days: 31, code: '03' },
  { name: 'تیر', days: 31, code: '04' },
  { name: 'مرداد', days: 31, code: '05' },
  { name: 'شهریور', days: 31, code: '06' },
  { name: 'مهر', days: 30, code: '07' },
  { name: 'آبان', days: 30, code: '08' },
  { name: 'آذر', days: 30, code: '09' },
  { name: 'دی', days: 30, code: '10' },
  { name: 'بهمن', days: 30, code: '11' },
  { name: 'اسفند', days: 29, code: '12' },
];

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPass, setInputPass] = useState('');
  const [hasBiometricSupport, setHasBiometricSupport] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<
    | 'dashboard'
    | 'add_calf'
    | 'calves_list'
    | 'calving_records'
    | 'add_calving'
    | 'estrus_cows'
    | 'vaccination'
    | 'add_vaccine'
    | 'calendar'
    | 'phone_alarm'
    | 'alarms_list'
  >('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // جیره شیر گوساله‌ها
  const [calves, setCalves] = useState<CalfMilkItem[]>([]);
  const [calfTag, setCalfTag] = useState('');
  const [milkAmount, setMilkAmount] = useState('');
  const [editingCalfId, setEditingCalfId] = useState<string | null>(null);

  // لیست زایش
  const [calvingRecords, setCalvingRecords] = useState<CalvingRecordItem[]>([]);
  const [motherTag, setMotherTag] = useState('');
  const [newCalfTag, setNewCalfTag] = useState('');
  const [calfGender, setCalfGender] = useState('نر');
  const [metalNum, setMetalNum] = useState('');
  const [serialNum, setSerialNum] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('1405/04/15');
  const [birthTimeInput, setBirthTimeInput] = useState('12:00');

  // گاوهای فحل
  const [estrusCows, setEstrusCows] = useState<EstrusCowItem[]>([]);
  const [cowTag, setCowTag] = useState('');
  const [estrusNotes, setEstrusNotes] = useState('');

  // واکسیناسیون
  const [vaccines, setVaccines] = useState<VaccineItem[]>([]);
  const [vaccineNameInput, setVaccineNameInput] = useState('');
  const [vaccineTagInput, setVaccineTagInput] = useState('');
  const [vaccineDateInput, setVaccineDateInput] = useState('1405/04/15');
  const [editingVaccineId, setEditingVaccineId] = useState<string | null>(null);

  // استیت‌های ساعت و هشدار (بدون صدا و لرزش)
  const [phoneAlarms, setPhoneAlarms] = useState<PhoneAlarmItem[]>([]);
  const [alarmHour, setAlarmHour] = useState('06');
  const [alarmMinute, setAlarmMinute] = useState('00');
  const [alarmAmPm, setAlarmAmPm] = useState('ق.ظ');
  const [alarmTitle, setAlarmTitle] = useState('');
  const [alarmDate, setAlarmDate] = useState('1405/04/15');

  // تقویم داخل صفحه آلارم
  const [alarmMonthIndex, setAlarmMonthIndex] = useState(3);
  const [alarmDay, setAlarmDay] = useState(15);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(3);
  const [selectedDay, setSelectedDay] = useState(15);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('1405/04/15');

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    emailjs.init({ publicKey: EMAILJS_CONFIG.PUBLIC_KEY });
    checkInitialAuth();
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (isVerifying) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isVerifying]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometricSupport(compatible && enrolled);
  };

  const checkInitialAuth = async () => {
    try {
      const activeUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (activeUser) {
        setCurrentUserEmail(activeUser);
        await loadUserData(activeUser);
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (email: string) => {
    try {
      const storedCalves = await AsyncStorage.getItem(`@calves_${email}`);
      const storedCalving = await AsyncStorage.getItem(`@calving_${email}`);
      const storedEstrus = await AsyncStorage.getItem(`@estrus_${email}`);
      const storedVaccines = await AsyncStorage.getItem(`@vaccines_${email}`);
      const storedPhoneAlarms = await AsyncStorage.getItem(`@phone_alarms_${email}`);

      if (storedCalves) setCalves(JSON.parse(storedCalves));
      else setCalves([]);

      if (storedCalving) setCalvingRecords(JSON.parse(storedCalving));
      else setCalvingRecords([]);

      if (storedEstrus) setEstrusCows(JSON.parse(storedEstrus));
      else setEstrusCows([]);

      if (storedVaccines) setVaccines(JSON.parse(storedVaccines));
      else setVaccines([]);

      if (storedPhoneAlarms) setPhoneAlarms(JSON.parse(storedPhoneAlarms));
      else setPhoneAlarms([]);
    } catch (e) {
      alert('خطا در بارگذاری اطلاعات دامداری');
    }
  };

  const saveCalvesForUser = async (email: string, data: CalfMilkItem[]) => {
    await AsyncStorage.setItem(`@calves_${email}`, JSON.stringify(data));
  };

  const saveCalvingForUser = async (email: string, data: CalvingRecordItem[]) => {
    await AsyncStorage.setItem(`@calving_${email}`, JSON.stringify(data));
  };

  const saveEstrusForUser = async (email: string, data: EstrusCowItem[]) => {
    await AsyncStorage.setItem(`@estrus_${email}`, JSON.stringify(data));
  };

  const saveVaccinesForUser = async (email: string, data: VaccineItem[]) => {
    await AsyncStorage.setItem(`@vaccines_${email}`, JSON.stringify(data));
  };

  const savePhoneAlarmsForUser = async (email: string, data: PhoneAlarmItem[]) => {
    await AsyncStorage.setItem(`@phone_alarms_${email}`, JSON.stringify(data));
  };

  const handleBiometricLogin = async () => {
    const accountsData = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST);
    if (!accountsData) {
      alert('هیچ حساب کاربری ذخیره نشده است!');
      setAuthMode('register');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'تایید اثر انگشت برای ورود به دامداری',
      fallbackLabel: 'رمز عبور',
    });

    if (result.success) {
      const accounts: UserAccount[] = JSON.parse(accountsData);
      const lastUser = accounts[accounts.length - 1];
      setCurrentUserEmail(lastUser.email);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, lastUser.email);
      await loadUserData(lastUser.email);
      setIsLoggedIn(true);
    } else {
      alert('تایید اثر انگشت ناموفق بود.');
    }
  };

  const handleRegisterRequest = async () => {
    if (!inputEmail.trim() || !inputPass.trim()) {
      alert('لطفاً نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setIsSendingEmail(true);

    try {
      await emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
        to_email: EMAILJS_CONFIG.ADMIN_EMAIL,
        passcode: `درخواست ثبت‌نام دامداری (${inputEmail.trim()}) - کد: ${code}`,
      });

      alert('کد تایید ارسال شد.');
      setAuthMode('verify');
    } catch (error: any) {
      alert('خطا در ارسال: ' + (error?.text || error?.message || JSON.stringify(error)));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (inputCode.trim().length !== 6) {
      alert('لطفاً کد ۶ رقمی را وارد کنید');
      return;
    }

    setIsVerifying(true);

    setTimeout(async () => {
      setIsVerifying(false);
      if (inputCode.trim() !== generatedCode) {
        alert('کد فعال‌سازی اشتباه است!');
        return;
      }

      const emailTrimmed = inputEmail.trim();
      const newAccount: UserAccount = { email: emailTrimmed, password: inputPass.trim() };

      const existingAccountsStr = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST);
      let accounts: UserAccount[] = existingAccountsStr ? JSON.parse(existingAccountsStr) : [];

      const existingIndex = accounts.findIndex((acc) => acc.email === emailTrimmed);
      if (existingIndex >= 0) {
        accounts[existingIndex] = newAccount;
      } else {
        accounts.push(newAccount);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(accounts));
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, emailTrimmed);

      setCurrentUserEmail(emailTrimmed);
      await loadUserData(emailTrimmed);
      setIsLoggedIn(true);
      setInputEmail('');
      setInputPass('');
      alert('حساب دامداری ایجاد شد!');
    }, 2000);
  };

  const handleLogin = async () => {
    if (!inputEmail.trim() || !inputPass.trim()) {
      alert('لطفاً نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    const accountsData = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS_LIST);
    if (!accountsData) {
      alert('حسابی ثبت نشده است!');
      setAuthMode('register');
      return;
    }

    const accounts: UserAccount[] = JSON.parse(accountsData);
    const foundUser = accounts.find(
      (acc) => acc.email === inputEmail.trim() && acc.password === inputPass.trim()
    );

    if (foundUser) {
      setCurrentUserEmail(foundUser.email);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, foundUser.email);
      await loadUserData(foundUser.email);
      setIsLoggedIn(true);
      setInputEmail('');
      setInputPass('');
    } else {
      alert('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setIsLoggedIn(false);
    setIsMenuOpen(false);
    setCurrentUserEmail('');
    setCalves([]);
    setCalvingRecords([]);
    setEstrusCows([]);
    setVaccines([]);
    setPhoneAlarms([]);
  };

  const handleSaveCalf = () => {
    if (!calfTag.trim() || !milkAmount.trim()) {
      alert('لطفاً پلاک گوساله و مقدار شیر را وارد کنید');
      return;
    }

    let updated: CalfMilkItem[];
    if (editingCalfId) {
      updated = calves.map((item) =>
        item.id === editingCalfId
          ? { ...item, tagNumber: calfTag.trim(), milkAmount: milkAmount.trim() }
          : item
      );
      alert('جیره شیر بروزرسانی شد!');
    } else {
      const newCalf: CalfMilkItem = {
        id: Date.now().toString(),
        tagNumber: calfTag.trim(),
        milkAmount: milkAmount.trim(),
        date: new Date().toLocaleDateString('fa-IR'),
      };
      updated = [newCalf, ...calves];
      alert('جیره شیر جدید ثبت شد!');
    }

    setCalves(updated);
    saveCalvesForUser(currentUserEmail, updated);
    setCalfTag('');
    setMilkAmount('');
    setEditingCalfId(null);
    setCurrentScreen('calves_list');
  };

  const handleDeleteCalf = (id: string) => {
    const updated = calves.filter((c) => c.id !== id);
    setCalves(updated);
    saveCalvesForUser(currentUserEmail, updated);
  };

  const handleSaveCalvingRecord = () => {
    if (!motherTag.trim() || !newCalfTag.trim() || !metalNum.trim() || !serialNum.trim()) {
      alert('لطفاً تمامی اطلاعات پلاک و شماره‌ها را پر کنید');
      return;
    }

    const newRecord: CalvingRecordItem = {
      id: Date.now().toString(),
      motherTag: motherTag.trim(),
      calfTag: newCalfTag.trim(),
      gender: calfGender,
      metalNumber: metalNum.trim(),
      serialNumber: serialNum.trim(),
      birthDate: birthDateInput.trim(),
      birthTime: birthTimeInput.trim(),
    };

    const updated = [newRecord, ...calvingRecords];
    setCalvingRecords(updated);
    saveCalvingForUser(currentUserEmail, updated);
    setMotherTag('');
    setNewCalfTag('');
    setMetalNum('');
    setSerialNum('');
    alert('اطلاعات زایش با موفقیت ثبت شد!');
    setCurrentScreen('calving_records');
  };

  const handleDeleteCalving = (id: string) => {
    const updated = calvingRecords.filter((r) => r.id !== id);
    setCalvingRecords(updated);
    saveCalvingForUser(currentUserEmail, updated);
  };

  const handleAddEstrusCow = () => {
    if (!cowTag.trim()) {
      alert('لطفاً پلاک گاو مادر را وارد کنید');
      return;
    }
    const currentMonth = PERSIAN_MONTHS[selectedMonthIndex];
    const formattedDate = `1405/${currentMonth.code}/${selectedDay < 10 ? '0' + selectedDay : selectedDay}`;

    const newEstrus: EstrusCowItem = {
      id: Date.now().toString(),
      tagNumber: cowTag.trim(),
      estrusDate: formattedDate,
      notes: estrusNotes.trim() || 'آماده تلقین مصنوعی',
    };
    const updated = [newEstrus, ...estrusCows];
    setEstrusCows(updated);
    saveEstrusForUser(currentUserEmail, updated);
    setCowTag('');
    setEstrusNotes('');
    alert('گاو فحل ثبت شد!');
  };

  const handleDeleteEstrus = (id: string) => {
    const updated = estrusCows.filter((e) => e.id !== id);
    setEstrusCows(updated);
    saveEstrusForUser(currentUserEmail, updated);
  };

  const handleSaveVaccine = () => {
    if (!vaccineNameInput.trim() || !vaccineDateInput.trim()) {
      alert('لطفاً نام واکسن و تاریخ تزریق را وارد کنید');
      return;
    }

    let updated: VaccineItem[];
    if (editingVaccineId) {
      updated = vaccines.map((item) =>
        item.id === editingVaccineId
          ? {
              ...item,
              vaccineName: vaccineNameInput.trim(),
              tagNumber: vaccineTagInput.trim(),
              vaccineDate: vaccineDateInput.trim(),
            }
          : item
      );
      alert('اطلاعات واکسیناسیون بروزرسانی شد!');
    } else {
      const newVaccine: VaccineItem = {
        id: Date.now().toString(),
        vaccineName: vaccineNameInput.trim(),
        tagNumber: vaccineTagInput.trim() || 'کل گله',
        vaccineDate: vaccineDateInput.trim(),
      };
      updated = [newVaccine, ...vaccines];
      alert('واکسیناسیون جدید ثبت شد!');
    }

    setVaccines(updated);
    saveVaccinesForUser(currentUserEmail, updated);
    setVaccineNameInput('');
    setVaccineTagInput('');
    setEditingVaccineId(null);
    setCurrentScreen('vaccination');
  };

  const handleEditVaccine = (item: VaccineItem) => {
    setVaccineNameInput(item.vaccineName);
    setVaccineTagInput(item.tagNumber);
    setVaccineDateInput(item.vaccineDate);
    setEditingVaccineId(item.id);
    setCurrentScreen('add_vaccine');
  };

  const handleDeleteVaccine = (id: string) => {
    const updated = vaccines.filter((v) => v.id !== id);
    setVaccines(updated);
    saveVaccinesForUser(currentUserEmail, updated);
  };

  const handleSavePhoneAlarm = () => {
    if (!alarmTitle.trim()) {
      alert('لطفاً عنوان رویداد را وارد کنید');
      return;
    }
    const currentMonth = PERSIAN_MONTHS[alarmMonthIndex];
    const formattedDate = `1405/${currentMonth.code}/${alarmDay < 10 ? '0' + alarmDay : alarmDay}`;

    const newAlarm: PhoneAlarmItem = {
      id: Date.now().toString(),
      title: alarmTitle.trim(),
      time: `${alarmHour}:${alarmMinute}`,
      ampm: alarmAmPm,
      date: formattedDate,
    };
    const updatedAlarms = [newAlarm, ...phoneAlarms];
    setPhoneAlarms(updatedAlarms);
    savePhoneAlarmsForUser(currentUserEmail, updatedAlarms);
    setAlarmTitle('');
    alert('رویداد و ساعت هشدار ذخیره شد!');
    setCurrentScreen('alarms_list');
  };

  const handleDeletePhoneAlarm = (id: string) => {
    const updatedAlarms = phoneAlarms.filter((item) => item.id !== id);
    setPhoneAlarms(updatedAlarms);
    savePhoneAlarmsForUser(currentUserEmail, updatedAlarms);
  };

  const filteredCalves = calves.filter(
    (item) =>
      item.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.milkAmount.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCalving = calvingRecords.filter(
    (item) =>
      item.motherTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.calfTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVaccines = vaccines.filter(
    (item) =>
      item.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tagNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, styles.authContainer]}>
        <View style={styles.authCard}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>🐄 سامانه مدیریت هوشمند دامداری</Text>
          </View>

          {authMode === 'login' && (
            <>
              <Text style={styles.authTitle}>ورود به پنل دامدار</Text>
              <Text style={styles.authSub}>مدیریت گله، گوساله‌ها و واکسیناسیون</Text>

              <TextInput
                style={styles.input}
                placeholder="نام کاربری (ایمیل مدیر دامداری)"
                placeholderTextColor="#7f8c8d"
                value={inputEmail}
                onChangeText={setInputEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="رمز عبور"
                placeholderTextColor="#7f8c8d"
                value={inputPass}
                onChangeText={setInputPass}
                secureTextEntry
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
                <Text style={styles.btnText}>ورود به سیستم دامداری</Text>
              </TouchableOpacity>

              {hasBiometricSupport && (
                <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
                  <Text style={styles.biometricBtnText}>🫵 ورود امن با اثر انگشت</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.switchAuthBtn} onPress={() => setAuthMode('register')}>
                <Text style={styles.switchAuthText}>ثبت‌نام دامداری جدید</Text>
              </TouchableOpacity>
            </>
          )}

          {authMode === 'register' && (
            <>
              <Text style={styles.authTitle}>ثبت‌‌نام دامداری جدید</Text>
              <Text style={styles.authSub}>ثبت اطلاعات جهت مدیریت گله</Text>

              <TextInput
                style={styles.input}
                placeholder="ایمیل یا نام کاربری مدیر"
                placeholderTextColor="#7f8c8d"
                value={inputEmail}
                onChangeText={setInputEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="رمز عبور"
                placeholderTextColor="#7f8c8d"
                value={inputPass}
                onChangeText={setInputPass}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleRegisterRequest}
                disabled={isSendingEmail}>
                {isSendingEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>تایید و دریافت کد تایید</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.switchAuthBtn} onPress={() => setAuthMode('login')}>
                <Text style={styles.switchAuthText}>بازگشت به صفحه ورود</Text>
              </TouchableOpacity>
            </>
          )}

          {authMode === 'verify' && (
            <>
              <Text style={styles.authTitle}>تایید کد امنیتی</Text>
              <Text style={styles.authSub}>کد ارسال‌شده را وارد کنید</Text>

              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View key={index} style={styles.otpBox}>
                    <Text style={styles.otpText}>{inputCode[index] || ''}</Text>
                  </View>
                ))}
              </View>

              <TextInput
                style={styles.hiddenOtpInput}
                value={inputCode}
                onChangeText={setInputCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              {isVerifying ? (
                <View style={styles.loaderContainer}>
                  <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]}>
                    <View style={styles.rotatingSquare1} />
                    <View style={styles.rotatingSquare2} />
                  </Animated.View>
                  <Text style={styles.loadingText}>راه‌‌اندازی پایگاه داده...</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyAndRegister}>
                  <Text style={styles.btnText}>تأیید و ورود</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => setIsMenuOpen(true)}>
          <Text style={styles.menuIconText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🐄 سامانه پیشرفته مدیریت دامداری</Text>
      </View>

      {currentScreen !== 'dashboard' && currentScreen !== 'calendar' && (
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 جست‌وجو در پلاک‌ها، واکسن‌ها و سوابق..."
            placeholderTextColor="#7f8c8d"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentScreen === 'dashboard' && (
          <View style={styles.dashboardContainer}>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeText}>مدیر گرامی، خوش آمدید 🌾</Text>
              <Text style={styles.dashboardSubText}>دامداری فعال: {currentUserEmail}</Text>
            </View>

            <Text style={styles.sectionCategoryTitle}>بخش ساعت و رویدادها</Text>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => setCurrentScreen('phone_alarm')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>⏰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>تنظیم ساعت و هشدار رویداد</Text>
                <Text style={styles.menuSub}>تعیین زمان به همراه تقویم کوچک انتخابی</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => setCurrentScreen('alarms_list')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>لیست رویدادها و هشدارهای ثبت‌شده</Text>
                <Text style={styles.menuSub}>مشاهده آلارم‌های فعال ({phoneAlarms.length})</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionCategoryTitle}>بخش‌های تخصصی گله</Text>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setVaccineNameInput('');
                setVaccineTagInput('');
                setEditingVaccineId(null);
                setCurrentScreen('add_vaccine');
              }}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>💉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>ثبت واکسیناسیون جدید</Text>
                <Text style={styles.menuSub}>مدیریت تزریق واکسن گله</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('vaccination')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>لیست واکسیناسیون‌ها</Text>
                <Text style={styles.menuSub}>آرشیو و سوابق ({vaccines.length} مورد)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setCalfTag('');
                setMilkAmount('');
                setEditingCalfId(null);
                setCurrentScreen('add_calf');
              }}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>🍼</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>ثبت جیره شیر گوساله</Text>
                <Text style={styles.menuSub}>کم و زیاد کردن میزان شیر روزانه</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('calves_list')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>🥛</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>لیست شیر گوساله‌ها</Text>
                <Text style={styles.menuSub}>آرشیو ({calves.length} رأس گوساله)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => {
                setMotherTag('');
                setNewCalfTag('');
                setMetalNum('');
                setSerialNum('');
                setCurrentScreen('add_calving');
              }}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>🏷️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>ثبت زایش و پلاک‌گذاری جدید</Text>
                <Text style={styles.menuSub}>تاریخ، ساعت، شماره فلزی و سریال</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('calving_records')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>📂</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>لیست زایش‌ها و پلاک‌ها</Text>
                <Text style={styles.menuSub}>مشاهده سوابق ({calvingRecords.length} مورد)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('estrus_cows')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>🔥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>مدیریت گاوهای فحل</Text>
                <Text style={styles.menuSub}>ثبت و پیگیری ({estrusCows.length} رأس)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard} onPress={() => setCurrentScreen('calendar')}>
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>تقویم رویدادهای دامداری ۱۴۰۵</Text>
                <Text style={styles.menuSub}>برنامه‌‌ریزی دقیق فحل و واکسن</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* صفحه تنظیم ساعت و هشدار همراه با تقویم کوچک داخلی */}
        {currentScreen === 'phone_alarm' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>⏰ تنظیم ساعت و هشدار رویداد</Text>

              {/* انتخاب‌گر ساعت */}
              <View style={styles.clockPickerRow}>
                <View style={styles.clockColumn}>
                  <Text style={styles.clockSubText}>دقیقه</Text>
                  <TextInput
                    style={styles.clockInputBox}
                    value={alarmMinute}
                    onChangeText={setAlarmMinute}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.clockColon}>:</Text>
                <View style={styles.clockColumn}>
                  <Text style={styles.clockSubText}>ساعت</Text>
                  <TextInput
                    style={styles.clockInputBox}
                    value={alarmHour}
                    onChangeText={setAlarmHour}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.ampmColumn}>
                  <TouchableOpacity
                    style={[styles.ampmBtn, alarmAmPm === 'ق.ظ' && styles.ampmBtnActive]}
                    onPress={() => setAlarmAmPm('ق.ظ')}>
                    <Text style={[styles.ampmText, alarmAmPm === 'ق.ظ' && styles.ampmTextActive]}>ق.ظ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ampmBtn, alarmAmPm === 'ب.ظ' && styles.ampmBtnActive]}
                    onPress={() => setAlarmAmPm('ب.ظ')}>
                    <Text style={[styles.ampmText, alarmAmPm === 'ب.ظ' && styles.ampmTextActive]}>ب.ظ</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* تقویم کوچک داخلی برای انتخاب آسان تاریخ رویداد */}
              <Text style={styles.labelTitle}>انتخاب تاریخ از تقویم کوچک:</Text>
              <View style={styles.miniCalendarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                  {PERSIAN_MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.monthTab, alarmMonthIndex === idx && styles.monthTabActive]}
                      onPress={() => {
                        setAlarmMonthIndex(idx);
                        setAlarmDay(1);
                      }}>
                      <Text
                        style={[
                          styles.monthTabText,
                          alarmMonthIndex === idx && styles.monthTabTextActive,
                        ]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.calendarGrid}>
                  {[...Array(PERSIAN_MONTHS[alarmMonthIndex].days)].map((_, i) => {
                    const dayNum = i + 1;
                    const isDaySelected = alarmDay === dayNum;

                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.calendarDayBox, isDaySelected && styles.calendarDayBoxSelected]}
                        onPress={() => setAlarmDay(dayNum)}>
                        <Text
                          style={[
                            styles.calendarDayText,
                            isDaySelected && styles.calendarDayTextSelected,
                          ]}>
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.selectedDateBadge}>
                <Text style={styles.selectedDateBadgeText}>
                  تاریخ انتخابی: {alarmDay} {PERSIAN_MONTHS[alarmMonthIndex].name} ۱۴۰۵
                </Text>
              </View>

              <Text style={styles.labelTitle}>عنوان رویداد:</Text>
              <TextInput
                style={styles.input}
                placeholder="مثلا: وقت واکسن تب برفکی گله"
                placeholderTextColor="#7f8c8d"
                value={alarmTitle}
                onChangeText={setAlarmTitle}
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSavePhoneAlarm}>
                <Text style={styles.btnText}>ذخیره و انتقال به رویدادها</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* لیست هشدارهای ذخیره شده */}
        {currentScreen === 'alarms_list' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>لیست هشدارها و رویدادهای ثبت‌شده ({phoneAlarms.length})</Text>

            {phoneAlarms.length === 0 ? (
              <View style={styles.card}>
                <Text style={{ textAlign: 'center', color: '#7f8c8d', fontSize: 13 }}>هیچ هشداری ثبت نشده است.</Text>
              </View>
            ) : (
              phoneAlarms.map((item) => (
                <View key={item.id} style={styles.noteCard}>
                  <View style={styles.noteHeaderTop}>
                    <TouchableOpacity
                      style={styles.actionBtnSmallDelete}
                      onPress={() => handleDeletePhoneAlarm(item.id)}>
                      <Text style={styles.actionBtnTextDelete}>🗑️ حذف</Text>
                    </TouchableOpacity>
                    <Text style={styles.alarmBadgeTime}>
                      ⏰ {item.time} {item.ampm}
                    </Text>
                  </View>

                  <Text style={styles.itemTitle}>📌 {item.title}</Text>
                  <Text style={styles.noteBody}>📅 تاریخ اعلام: {item.date}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* صفحه ثبت/ویرایش واکسیناسیون */}
        {currentScreen === 'add_vaccine' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingVaccineId ? '✏️ ویرایش اطلاعات واکسیناسیون' : '💉 ثبت واکسیناسیون جدید'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="نام واکسن (مثلا تب برفکی)..."
                placeholderTextColor="#7f8c8d"
                value={vaccineNameInput}
                onChangeText={setVaccineNameInput}
              />
              <TextInput
                style={styles.input}
                placeholder="شماره پلاک دام یا کل گله..."
                placeholderTextColor="#7f8c8d"
                value={vaccineTagInput}
                onChangeText={setVaccineTagInput}
              />
              <TextInput
                style={styles.input}
                placeholder="تاریخ تزریق (مثلا 1405/04/15)..."
                placeholderTextColor="#7f8c8d"
                value={vaccineDateInput}
                onChangeText={setVaccineDateInput}
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveVaccine}>
                <Text style={styles.btnText}>
                  {editingVaccineId ? 'بروزرسانی واکسن' : 'ذخیره واکسیناسیون'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* صفحه نمایش لیست واکسیناسیون‌ها */}
        {currentScreen === 'vaccination' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>لیست واکسیناسیون‌های گله ({filteredVaccines.length})</Text>
            {filteredVaccines.map((item) => (
              <View key={item.id} style={styles.vaccineCard}>
                <TouchableOpacity
                  style={styles.btnEditTopRight}
                  onPress={() => handleEditVaccine(item)}>
                  <Text style={styles.btnEditText}>✏️️ ویرایش</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDeleteLeft}
                  onPress={() => handleDeleteVaccine(item.id)}>
                  <Text style={styles.btnDeleteText}>🗑️ حذف</Text>
                </TouchableOpacity>

                <View style={styles.vaccineInfo}>
                  <Text style={styles.itemTitle}>💉 {item.vaccineName}</Text>
                  <Text style={styles.itemSub}>🏷️ پلاک دام / گله: {item.tagNumber}</Text>
                  <Text style={styles.noteDate}>📅 تاریخ تزریق: {item.vaccineDate}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {currentScreen === 'add_calf' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🍼 ثبت جیره شیر جدید (کم و زیاد کردن)</Text>
              <TextInput
                style={styles.input}
                placeholder="شماره پلاک گوساله..."
                placeholderTextColor="#7f8c8d"
                value={calfTag}
                onChangeText={setCalfTag}
              />
              <TextInput
                style={styles.input}
                placeholder="میزان شیر روزانه (لیتر)..."
                placeholderTextColor="#7f8c8d"
                value={milkAmount}
                onChangeText={setMilkAmount}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveCalf}>
                <Text style={styles.btnText}>ذخیره جیره شیر</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'calves_list' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>آرشیو گوساله‌های شیرخوار ({filteredCalves.length})</Text>
            {filteredCalves.map((item) => (
              <View key={item.id} style={styles.noteCard}>
                <View style={styles.noteHeaderTop}>
                  <TouchableOpacity
                    style={styles.actionBtnSmallDelete}
                    onPress={() => handleDeleteCalf(item.id)}>
                    <Text style={styles.actionBtnTextDelete}>🗑️ حذف</Text>
                  </TouchableOpacity>
                  <Text style={styles.noteDate}>ثبت: {item.date}</Text>
                </View>

                <Text style={styles.itemTitle}>🏷️ پلاک گوساله: {item.tagNumber}</Text>
                <Text style={styles.noteBody}>🥛 جیره شیر: {item.milkAmount}</Text>
              </View>
            ))}
          </View>
        )}

        {currentScreen === 'add_calving' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏷️ ثبت اطلاعات زایش و پلاک‌گذاری</Text>

              <TextInput
                style={styles.input}
                placeholder="شماره پلاک مادر..."
                placeholderTextColor="#7f8c8d"
                value={motherTag}
                onChangeText={setMotherTag}
              />
              <TextInput
                style={styles.input}
                placeholder="شماره پلاک گوساله..."
                placeholderTextColor="#7f8c8d"
                value={newCalfTag}
                onChangeText={setNewCalfTag}
              />

              <Text style={styles.labelTitle}>جنسیت گوساله:</Text>
              <View style={styles.genderRow}>
                {['نر', 'ماده'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, calfGender === g && styles.genderBtnActive]}
                    onPress={() => setCalfGender(g)}>
                    <Text style={[styles.genderText, calfGender === g && styles.genderTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="شماره فلزی..."
                placeholderTextColor="#7f8c8d"
                value={metalNum}
                onChangeText={setMetalNum}
              />
              <TextInput
                style={styles.input}
                placeholder="سریال پلاک..."
                placeholderTextColor="#7f8c8d"
                value={serialNum}
                onChangeText={setSerialNum}
              />
              <TextInput
                style={styles.input}
                placeholder="تاریخ زایش (مثلا 1405/04/15)..."
                placeholderTextColor="#7f8c8d"
                value={birthDateInput}
                onChangeText={setBirthDateInput}
              />
              <TextInput
                style={styles.input}
                placeholder="ساعت زایش (مثلا 12:00)..."
                placeholderTextColor="#7f8c8d"
                value={birthTimeInput}
                onChangeText={setBirthTimeInput}
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveCalvingRecord}>
                <Text style={styles.btnText}>ثبت رکورد کامل زایش</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'calving_records' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>لیست زایش‌ها ({filteredCalving.length})</Text>
            {filteredCalving.map((item) => (
              <View key={item.id} style={styles.noteCard}>
                <View style={styles.noteHeaderTop}>
                  <TouchableOpacity
                    style={styles.actionBtnSmallDelete}
                    onPress={() => handleDeleteCalving(item.id)}>
                    <Text style={styles.actionBtnTextDelete}>🗑️ حذف رکورد</Text>
                  </TouchableOpacity>
                  <Text style={styles.noteDate}>
                    📅 {item.birthDate} - ⏰ {item.birthTime}
                  </Text>
                </View>

                <Text style={styles.itemTitle}>🐄 پلاک مادر: {item.motherTag}</Text>
                <Text style={styles.noteBody}>🏷️ پلاک گوساله: {item.calfTag} ({item.gender})</Text>
                <Text style={styles.noteBody}>
                  🔩 شماره فلزی: {item.metalNumber} | 🔢 سریال: {item.serialNumber}
                </Text>
              </View>
            ))}
          </View>
        )}

        {currentScreen === 'estrus_cows' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <View style={styles.alarmTopBar}>
                <TouchableOpacity
                  style={styles.calendarIconButton}
                  onPress={() => setIsCalendarModalOpen(true)}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                  <Text style={styles.calendarIconText}>تقویم فحل</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>🔥 ثبت گاو فحل جدید</Text>
              </View>

              <View style={styles.selectedDateBadge}>
                <Text style={styles.selectedDateBadgeText}>
                  تاریخ فحل: {selectedDay} {PERSIAN_MONTHS[selectedMonthIndex].name} ۱۴۰۵
                </Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="پلاک گاو مادر فحل..."
                placeholderTextColor="#7f8c8d"
                value={cowTag}
                onChangeText={setCowTag}
              />
              <TextInput
                style={styles.input}
                placeholder="یادداشت وضعیت..."
                placeholderTextColor="#7f8c8d"
                value={estrusNotes}
                onChangeText={setEstrusNotes}
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleAddEstrusCow}>
                <Text style={styles.btnText}>ثبت گاو فحل</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>گاوهای فحل فعال ({estrusCows.length})</Text>
            {estrusCows.map((item) => (
              <View key={item.id} style={styles.alarmClockCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alarmTimeText}>🔥 پلاک: {item.tagNumber}</Text>
                  <Text style={styles.itemTitle}>📝 {item.notes}</Text>
                  <Text style={styles.itemSub}>📅 تاریخ: {item.estrusDate}</Text>
                </View>
                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={() => handleDeleteEstrus(item.id)}>
                  <Text style={styles.btnDeleteText}>حذف</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {currentScreen === 'calendar' && (
          <View>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('dashboard')}>
              <Text style={styles.backBtnText}>← بازگشت به داشبورد</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 تقویم رویدادهای گله ۱۴۰۵</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {PERSIAN_MONTHS.map((m, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.monthTab, selectedMonthIndex === idx && styles.monthTabActive]}
                    onPress={() => {
                      setSelectedMonthIndex(idx);
                      setSelectedDay(1);
                    }}>
                    <Text
                      style={[
                        styles.monthTabText,
                        selectedMonthIndex === idx && styles.monthTabTextActive,
                      ]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.calendarGrid}>
                {[...Array(PERSIAN_MONTHS[selectedMonthIndex].days)].map((_, i) => {
                  const dayNum = i + 1;
                  const currentM = PERSIAN_MONTHS[selectedMonthIndex];
                  const dateStr = `1405/${currentM.code}/${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const isSelected = selectedCalendarDate === dateStr;

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.calendarDayBox, isSelected && styles.calendarDayBoxSelected]}
                      onPress={() => setSelectedCalendarDate(dateStr)}>
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                        ]}>
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* مدال تقویم */}
      <Modal
        visible={isCalendarModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCalendarModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.menuDrawerHeader}>
              <Text style={styles.menuDrawerTitle}>📅 تقویم سال ۱۴۰۵</Text>
              <TouchableOpacity onPress={() => setIsCalendarModalOpen(false)}>
                <Text style={{ color: '#ecf0f1', fontSize: 20, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {PERSIAN_MONTHS.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.monthTab, selectedMonthIndex === idx && styles.monthTabActive]}
                  onPress={() => {
                    setSelectedMonthIndex(idx);
                    setSelectedDay(1);
                  }}>
                  <Text
                    style={[
                      styles.monthTabText,
                      selectedMonthIndex === idx && styles.monthTabTextActive,
                    ]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ maxHeight: 220 }}>
              <View style={styles.calendarGrid}>
                {[...Array(PERSIAN_MONTHS[selectedMonthIndex].days)].map((_, i) => {
                  const dayNum = i + 1;
                  const isDaySelected = selectedDay === dayNum;

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.calendarDayBox, isDaySelected && styles.calendarDayBoxSelected]}
                      onPress={() => setSelectedDay(dayNum)}>
                      <Text
                        style={[
                          styles.calendarDayText,
                          isDaySelected && styles.calendarDayTextSelected,
                        ]}>
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 15 }]}
              onPress={() => setIsCalendarModalOpen(false)}>
              <Text style={styles.btnText}>تایید تاریخ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* منوی کشویی */}
      <Modal
        visible={isMenuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsMenuOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.menuDrawer}>
            <View style={styles.menuDrawerHeader}>
              <Text style={styles.menuDrawerTitle}>⚙️ پنل دامداری</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Text style={{ color: '#ecf0f1', fontSize: 20, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileBox}>
              <Text style={styles.profileLabel}>دامدار فعال:</Text>
              <Text style={styles.profileVal}>{currentUserEmail}</Text>
            </View>

            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
              <Text style={styles.btnLogoutText}>🚪 خروج از سامانه</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f5' },
  authContainer: { justifyContent: 'center', padding: 20 },
  authCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  badgeContainer: {
    alignSelf: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 15,
  },
  badgeText: { color: '#2e7d32', fontSize: 12, fontWeight: 'bold' },
  authTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: 6 },
  authSub: { fontSize: 12, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  switchAuthBtn: { marginTop: 15, alignItems: 'center' },
  switchAuthText: { color: '#2e7d32', fontSize: 13, fontWeight: '600' },

  biometricBtn: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  biometricBtnText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 13 },

  otpContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, marginBottom: 15 },
  otpBox: {
    width: 38,
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#4caf50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpText: { color: '#2c3e50', fontSize: 18, fontWeight: 'bold' },
  hiddenOtpInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },

  loaderContainer: { alignItems: 'center', marginTop: 10 },
  spinnerRing: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  rotatingSquare1: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: '#4caf50',
    borderRadius: 4,
    top: 0,
    left: 11,
  },
  rotatingSquare2: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: '#2e7d32',
    borderRadius: 4,
    bottom: 0,
    right: 11,
  },
  loadingText: { color: '#2e7d32', fontSize: 12, marginTop: 8, fontWeight: '600' },

  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
  menuIconBtn: {
    padding: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: { fontSize: 18, color: '#2e7d32' },

  searchBox: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f4f6f5' },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#2c3e50',
    textAlign: 'right',
    fontSize: 13,
  },

  content: { flex: 1, padding: 16 },

  dashboardContainer: { paddingTop: 2 },
  welcomeCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' },
  dashboardSubText: { fontSize: 12, color: '#2e7d32', textAlign: 'right', marginTop: 4 },

  sectionCategoryTitle: {
    color: '#7f8c8d',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right',
    marginTop: 6,
  },

  menuCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuIconBox: {
    width: 42,
    height: 42,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuIcon: { fontSize: 20 },
  menuTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', textAlign: 'right' },
  menuSub: { fontSize: 11, color: '#7f8c8d', textAlign: 'right', marginTop: 2 },

  backBtn: {
    marginBottom: 14,
    alignSelf: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  backBtnText: { color: '#2e7d32', fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50', textAlign: 'right', marginBottom: 14 },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: '#2c3e50',
    textAlign: 'right',
    fontSize: 13,
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 10,
    marginTop: 6,
  },
  vaccineCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  btnEditTopRight: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnEditText: { color: '#2e7d32', fontSize: 11, fontWeight: 'bold' },
  btnDeleteLeft: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnDeleteText: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
  vaccineInfo: { paddingRight: 4 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', textAlign: 'right', marginBottom: 4 },
  itemSub: { fontSize: 12, color: '#34495e', textAlign: 'right', marginBottom: 2 },
  noteDate: { fontSize: 11, color: '#7f8c8d', textAlign: 'right' },

  noteCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteHeaderTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnSmallDelete: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnTextDelete: { color: '#c62828', fontSize: 11, fontWeight: 'bold' },
  noteBody: { fontSize: 12, color: '#34495e', textAlign: 'right', marginTop: 2 },
  alarmBadgeTime: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },

  labelTitle: { fontSize: 13, fontWeight: '600', color: '#2c3e50', textAlign: 'right', marginBottom: 6 },
  genderRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 12 },
  genderBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: '#e8f5e9', borderColor: '#4caf50' },
  genderText: { color: '#7f8c8d', fontWeight: '600', fontSize: 13 },
  genderTextActive: { color: '#2e7d32' },

  alarmTopBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarIconButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  calendarIconText: { color: '#2e7d32', fontSize: 12, fontWeight: 'bold' },
  selectedDateBadge: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateBadgeText: { color: '#2c3e50', fontSize: 12, fontWeight: 'bold' },

  alarmClockCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  alarmTimeText: { fontSize: 14, fontWeight: 'bold', color: '#c0392b', textAlign: 'right', marginBottom: 2 },
  btnDelete: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  clockPickerRow: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 10 },
  clockColumn: { alignItems: 'center' },
  clockSubText: { fontSize: 11, color: '#7f8c8d', marginBottom: 4 },
  clockInputBox: { width: 60, height: 50, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  clockColon: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginTop: 16 },
  ampmColumn: { justifyContent: 'center', gap: 4, marginTop: 16 },
  ampmBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 6 },
  ampmBtnActive: { backgroundColor: '#2e7d32' },
  ampmText: { fontSize: 11, color: '#7f8c8d', fontWeight: 'bold' },
  ampmTextActive: { color: '#ffffff' },

  miniCalendarContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  monthScroll: { flexDirection: 'row-reverse', marginBottom: 10 },
  monthTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  monthTabActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  monthTabText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  monthTabTextActive: { color: '#ffffff' },

  calendarGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  calendarDayBox: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  calendarDayBoxSelected: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  calendarDayText: { color: '#2c3e50', fontSize: 12, fontWeight: 'bold' },
  calendarDayTextSelected: { color: '#ffffff' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuDrawer: {
    backgroundColor: '#2c3e50',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    alignSelf: 'center',
  },
  menuDrawerHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuDrawerTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  profileBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  profileLabel: { color: '#bdc3c7', fontSize: 11, textAlign: 'right' },
  profileVal: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 2 },
  btnLogout: {
    backgroundColor: '#c0392b',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnLogoutText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});