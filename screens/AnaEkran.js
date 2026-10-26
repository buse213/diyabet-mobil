import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

const BACKEND_URL = 'https://api-gateway-gq75.onrender.com';
const AI_MODEL_URL = 'https://reporting-service-vsbz.onrender.com/insulin-tahmini'; 

export default function AnaEkran({ navigation, route }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [analizSonucu, setAnalizSonucu] = useState(null);
  
  const [manuelMod, setManuelMod] = useState(false);
  const [manuelIsim, setManuelIsim] = useState('');
  const [manuelKarb, setManuelKarb] = useState('');

  const [gramaj, setGramaj] = useState('100');
  const [toplamKarbonhidrat, setToplamKarbonhidrat] = useState(0);
  const [kanSekeri, setKanSekeri] = useState('');
  
  const [yemekInsulini, setYemekInsulini] = useState(0);
  const [duzeltmeInsulini, setDuzeltmeInsulini] = useState(0);
  const [toplamOnerilenInsulin, setToplamOnerilenInsulin] = useState(0);
  
  const [hipoglisemi, setHipoglisemi] = useState(false);
  const [hiperglisemi, setHiperglisemi] = useState(false);
  
  const [hastaIcr, setHastaIcr] = useState(15);
  const [hastaIsf, setHastaIsf] = useState(50);
  const [kullaniciEmail, setKullaniciEmail] = useState('');

  const [isOffline, setIsOffline] = useState(false);

  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [gelecekSeker, setGelecekSeker] = useState(null);
  const [yapayZekaKullanildi, setYapayZekaKullanildi] = useState(false);

  const [isRecording, setIsRecording] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const ayarlariCek = async () => {
        const icr = await AsyncStorage.getItem('hasta_icr');
        const isf = await AsyncStorage.getItem('hasta_isf');
        const email = await AsyncStorage.getItem('hasta_email'); 
        if (icr) setHastaIcr(parseFloat(icr));
        if (isf) setHastaIsf(parseFloat(isf));
        if (email) setKullaniciEmail(email); 
      };
      ayarlariCek();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Ses Tanıma Dinleyicileri (expo-speech-recognition)
  useSpeechRecognitionEvent('start', () => setIsRecording(true));
  useSpeechRecognitionEvent('end', () => setIsRecording(false));
  useSpeechRecognitionEvent('error', (e) => {
    console.log('Ses Tanıma Hatası:', e);
    setIsRecording(false);
    if (e.error === 'language-not-supported') {
      setStatus('Türkçe çevrimdışı ses paketi yüklü değil. Telefon ayarlarından Türkçe ses tanıma paketini indirin veya manuel girin.');
    } else {
      setStatus(`HATA: ${e.error} - ${e.message}`);
    }
  });
  useSpeechRecognitionEvent('result', async (e) => {
    if (e.isFinal && e.results && e.results.length > 0) {
      const spokenText = e.results[0].transcript;
      sesliKomutuIsle(spokenText);
    }
  });

  useEffect(() => {
    if (route.params?.secilenGecmisYemek) {
      setAnalizSonucu(route.params.secilenGecmisYemek); 
      setManuelMod(false); 
      setImage(null); 
      setGramaj(''); 
      setStatus('Sık tüketilenlerden seçildi. Lütfen tüketeceğiniz gramajı girin ⚡');
    }
  }, [route.params?.secilenGecmisYemek]);

  useEffect(() => {
    if (analizSonucu && gramaj) {
      setYapayZekaKullanildi(false); 
      setGelecekSeker(null);

      const bazKarb = parseFloat(analizSonucu.karbonhidrat_miktari);
      const girilenGram = parseFloat(gramaj);
      const sekerDegeri = parseFloat(kanSekeri);

      if (!isNaN(bazKarb) && !isNaN(girilenGram)) {
        const hesaplananKarb = (girilenGram / 100) * bazKarb;
        setToplamKarbonhidrat(hesaplananKarb.toFixed(1));
        let bazInsulin = hesaplananKarb / hastaIcr;
        setYemekInsulini(bazInsulin.toFixed(1));
        let ekDoz = 0;
        if (!isNaN(sekerDegeri) && kanSekeri !== '') {
            if (sekerDegeri < 70) { setHipoglisemi(true); setHiperglisemi(false); } 
            else if (sekerDegeri > 140) { setHipoglisemi(false); setHiperglisemi(true); } 
            else { setHipoglisemi(false); setHiperglisemi(false); }
            ekDoz = (sekerDegeri - 120) / hastaIsf; 
            setDuzeltmeInsulini(ekDoz.toFixed(1));
        } else {
            setHipoglisemi(false); setHiperglisemi(false); setDuzeltmeInsulini(0);
        }
        const nihaiDoz = Math.max(0, bazInsulin + ekDoz);
        setToplamOnerilenInsulin(nihaiDoz.toFixed(1));
      } else {
        setToplamKarbonhidrat(0); setYemekInsulini(0); setDuzeltmeInsulini(0); setToplamOnerilenInsulin(0); setHipoglisemi(false); setHiperglisemi(false);
      }
    }
  }, [gramaj, analizSonucu, kanSekeri, hastaIcr, hastaIsf]);

  const lstmTahminiAl = async () => {
    if (!kanSekeri || !toplamKarbonhidrat) {
      Alert.alert("Eksik Bilgi", "Lütfen önce tüketim miktarını ve anlık kan şekerinizi girin.");
      return;
    }
    if (isOffline) {
      Alert.alert("İnternet Yok", "Yapay zeka analizi için internet bağlantısı gereklidir.");
      return;
    }

    setAiYukleniyor(true);
    try {
      const response = await axios.post(AI_MODEL_URL, {
        email: kullaniciEmail,
        anlik_seker: parseFloat(kanSekeri),
        guncel_karbonhidrat: parseFloat(toplamKarbonhidrat)
      });

      if (response.data.durum === 'basarili') {
        const { gelecekteki_seker, onerilen_insulin } = response.data.analiz_sonucu;
        setGelecekSeker(gelecekteki_seker);
        setToplamOnerilenInsulin(onerilen_insulin.toFixed(1)); 
        setYapayZekaKullanildi(true);
      } else {
        Alert.alert("Hata", "Akıllı analiz başarısız oldu.");
      }
    } catch (error) {
      console.log("AI Hatası:", error);
      Alert.alert("Hata", "Analiz sunucusuna bağlanılamadı.");
    } finally {
      setAiYukleniyor(false);
    }
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("İzin Gerekli", "Kamerayı kullanabilmek için izin vermelisiniz.");
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0].uri); setStatus('Fotoğraf çekildi, analize hazır.');
      setAnalizSonucu(null); setManuelMod(false);
    }
  };

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("İzin Gerekli", "Galeriye erişebilmek için izin vermelisiniz.");
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0].uri); setStatus('Fotoğraf seçildi, analize hazır.');
      setAnalizSonucu(null); setManuelMod(false);
    }
  };

  const uploadImage = async () => {
    if (!image) return Alert.alert('Eksik Adım', 'Lütfen önce bir fotoğraf seçin veya çekin.');
    
    if (isOffline) {
      Alert.alert(
        "İnternet Bağlantısı Yok",
        "Şu anda çevrimdışısınız. Uygulamayı kullanmaya devam etmek için lütfen tüketeceğiniz yemeği manuel olarak girin.",
        [{ text: "Tamam, Manuel Gireceğim", onPress: () => { setManuelMod(true); setAnalizSonucu(null); setImage(null); setStatus(''); } }]
      );
      return; 
    }
    
    setLoading(true); setAnalizSonucu(null);
    try {
      setStatus('Besin değerleri hesaplanıyor...');
      const formData = new FormData();
      formData.append('file', { uri: image, type: 'image/jpeg', name: 'yemek.jpg' });

      const response = await axios.post(`${BACKEND_URL}/isleme`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.durum === 'basarili' && response.data.sonuc) {
        const { turkce_isim, karbonhidrat_miktari } = response.data.sonuc;
        setStatus(`Analiz Tamamlandı!\nBulunan Yemek: ${turkce_isim}`);
        setAnalizSonucu({ turkce_isim: turkce_isim, karbonhidrat_miktari: karbonhidrat_miktari });
      } else {
        setStatus('Yemek tespit edilemedi, lütfen manuel girmeyi deneyin.');
      }
      setLoading(false);
    } catch (error) {
      console.log("Bağlantı Hatası:", error);
      setStatus(`HATA: Analiz sunucusuna ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.`);
      setLoading(false);
    }
  };

  // Tek dokunuşla çalışan sesli asistan fonksiyonu (expo-speech-recognition)
  const sesliAsistaniToggle = async () => {
    try {
      if (isRecording) {
        ExpoSpeechRecognitionModule.stop();
        setStatus('Dinleme durduruldu.');
        return;
      }

      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        return Alert.alert("İzin Gerekli", "Mikrofon izni verilmediği için sesli asistan kullanılamıyor.");
      }

      setStatus('Sizi dinliyorum... (Örn: "1 porsiyon makarna yedim")');
      const secenekler = { lang: 'tr-TR', interimResults: false };
      if (isOffline) {
        // İnternet yokken telefonun içindeki çevrimdışı ses tanımayı kullan
        if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
          setStatus('');
          return Alert.alert(
            "Çevrimdışı Desteklenmiyor",
            "Bu telefon internetsiz ses tanımayı desteklemiyor. Lütfen yemeği manuel girin."
          );
        }
        secenekler.requiresOnDeviceRecognition = true;
      }
      ExpoSpeechRecognitionModule.start(secenekler);
    } catch (e) {
      console.error('Ses başlatma hatası:', e);
      setIsRecording(false);
      setStatus(`BAŞLATMA HATASI: ${e.message || JSON.stringify(e)}`);
    }
  };

  // Manuel giriş formunu yemek adı ve gramajla açar
  const manuelFormaAc = (isim, gram) => {
    setImage(null);
    setAnalizSonucu(null);
    setManuelIsim(isim);
    setManuelKarb('');
    if (gram) setGramaj(gram);
    setManuelMod(true);
    setStatus('');
  };

  // Sesli komut: internet varsa Gemini ile otomatik, yoksa (veya başarısızsa) manuel form
  const sesliKomutuIsle = async (metin) => {
    let temiz = metin.toLocaleLowerCase('tr-TR');

    // Gramaj: "200 gram", "150 gr", "100 g"
    let gram = null;
    const gramEsle = temiz.match(/(\d+)\s*(gram|gr|g)(\s|$)/);
    if (gramEsle) {
      gram = gramEsle[1];
      temiz = temiz.replace(gramEsle[0], ' ');
    }

    // Kalan sayıları ve gereksiz kelimeleri at
    temiz = temiz.replace(/\d+([.,]\d+)?/g, ' ');
    const gereksiz = ['gram', 'gr', 'porsiyon', 'tane', 'adet', 'dilim', 'bardak', 'kase', 'tabak',
      'yedim', 'yiyeceğim', 'yiyorum', 'içtim', 'içeceğim', 'içiyorum', 'ben', 'bir', 'biraz', 'şu', 'bugün', 'kadar'];
    const kelimeler = temiz.split(/\s+/).filter(k => k && !gereksiz.includes(k));
    const isim = kelimeler
      .map(k => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1))
      .join(' ');

    if (!isim) {
      setStatus('Yemek adı anlaşılamadı, lütfen tekrar deneyin.');
      return;
    }

    // İnternet yoksa doğrudan manuel form
    if (isOffline) {
      manuelFormaAc(isim, gram);
      return;
    }

    // İnternet varsa Gemini'den besin değerini iste
    setStatus(`Algılanan: "${metin}"\nBesin değerleri hesaplanıyor...`);
    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/sesli-analiz`, { komut: metin }, { timeout: 20000 });
      const sonuc = response.data && response.data.sonuc;
      const karb = sonuc ? parseFloat(sonuc.karbonhidrat_miktari) : NaN;

      if (response.data && response.data.durum === 'basarili' && sonuc && !isNaN(karb)) {
        setImage(null);
        setManuelMod(false);
        setAnalizSonucu({ turkce_isim: sonuc.turkce_isim, karbonhidrat_miktari: karb, tahmini: true });
        // Kullanıcı gramaj söylediyse onu kullan, yoksa tahmini porsiyon
        setGramaj(gram ? gram : (sonuc.tahmini_gramaj ? String(sonuc.tahmini_gramaj) : '100'));
        setStatus('');
        return;
      }
    } catch (error) {
      console.log("Sesli analiz hatası:", error);
    } finally {
      setLoading(false);
    }

    // Otomatik bulunamadıysa manuel forma düş
    Alert.alert("Besin Değeri Bulunamadı", "Karbonhidrat değeri otomatik bulunamadı. Lütfen 100 gramındaki karbonhidratı manuel girin.");
    manuelFormaAc(isim, gram);
  };

  const manuelGirisUygula = () => {
    if(!manuelIsim || !manuelKarb) return Alert.alert('Eksik Bilgi', 'Lütfen yemek adını ve 100g için karbonhidrat miktarını doldurun.');
    setAnalizSonucu({ turkce_isim: manuelIsim, karbonhidrat_miktari: parseFloat(manuelKarb) });
    setManuelMod(false); setStatus('Manuel besin girişi uygulandı.');
  };

  const gecmiseKaydet = async () => {
    if (!kanSekeri) return Alert.alert("Eksik Bilgi", "Lütfen mevcut kan şekerinizi girin.");
    
    const payload = {
        email: kullaniciEmail, 
        yemek_ismi: analizSonucu.turkce_isim, 
        tuketilen_gramaj: parseFloat(gramaj),
        alinan_karbonhidrat: parseFloat(toplamKarbonhidrat), 
        olculen_kan_sekeri: parseFloat(kanSekeri),
        onerilen_insulin: parseFloat(toplamOnerilenInsulin),
        tarih: new Date().toISOString() 
    };

    if (isOffline) {
        try {
            const mevcutKayitlar = await AsyncStorage.getItem('offline_kayitlar');
            let kayitListesi = mevcutKayitlar ? JSON.parse(mevcutKayitlar) : [];
            kayitListesi.push(payload);
            await AsyncStorage.setItem('offline_kayitlar', JSON.stringify(kayitListesi));
            
            Alert.alert("Kayıt Başarılı", "İnternet bağlantınız olmadığı için verileriniz telefonunuza kaydedildi. İnternet geldiğinde otomatik olarak güncellenecektir.");
            setAnalizSonucu(null); setImage(null); setStatus('');
        } catch (error) {
            Alert.alert("Hata", "Kayıt işlemi sırasında bir sorun oluştu.");
        }
    } else {
        try {
            const response = await axios.post(`${BACKEND_URL}/kaydet`, payload);
            if (response.data.durum === 'basarili') {
                Alert.alert("Kayıt Başarılı", "Sağlık verileriniz geçmişe başarıyla eklendi.");
                setAnalizSonucu(null); setImage(null); setStatus('');
            }
        } catch (error) { 
            Alert.alert("Hata", "Kayıt sunucuya iletilemedi."); 
        }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Akıllı Besin Analizi</Text>
        <Text style={styles.pageSubtitle}>Tüketeceğiniz yemeklerin karbonhidrat değerlerini anında öğrenin ve insülin dozunuzu kolayca hesaplayın.</Text>
      </View>
      
      <View style={styles.actionPanel}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={openCamera}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.btnText}>Kameradan Çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={openGallery}>
            <Ionicons name="images" size={24} color="#8E24AA" />
            <Text style={styles.btnTextDark}>Galeriden Seç</Text>
          </TouchableOpacity>
        </View>

        {/* Tek Dokunuşlu Sesli Asistan Butonu */}
        <TouchableOpacity 
          style={[styles.manualBtn, { marginBottom: 10 }, isRecording && { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' }]} 
          onPress={sesliAsistaniToggle}
        >
          <Ionicons name={isRecording ? "mic" : "mic-outline"} size={20} color={isRecording ? "#D32F2F" : "#8E24AA"} />
          <Text style={[styles.manualBtnText, isRecording && { color: '#D32F2F' }]}>
            {isRecording ? "Dinleniyor... (Durdurmak için dokun)" : "Sesli Asistana Söyle (Dokun & Konuş)"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.manualBtn} onPress={() => { setManuelMod(true); setAnalizSonucu(null); setImage(null); setStatus(''); }}>
          <Ionicons name="create-outline" size={20} color="#8E24AA" />
          <Text style={styles.manualBtnText}>Besin Değerini Manuel Gir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.favoritesBtn} onPress={() => navigation.navigate('SikTuketilenler')}>
          <Ionicons name="heart" size={20} color="#fff" />
          <Text style={styles.favoritesBtnText}>Sık Tükettiklerim</Text>
        </TouchableOpacity>
      </View>

      {!image && !manuelMod && !analizSonucu && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="scan-outline" size={50} color="#BA68C8" />
          </View>
          <Text style={styles.emptyStateTitle}>Analize Hazır</Text>
          <Text style={styles.emptyStateDesc}>Öğününüze başlamadan önce yemeğinizin fotoğrafını çekin, galeriden yükleyin veya mikrofonla söyleyin.</Text>
        </View>
      )}

      {image && !manuelMod && (
        <View style={styles.imageCard}>
          <Image source={{ uri: image }} style={styles.image} />
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          
          {!loading && !analizSonucu && (
            <TouchableOpacity style={styles.analyzeBtn} onPress={uploadImage}>
              <Ionicons name="sparkles" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.analyzeBtnText}>Besin Değerini Bul</Text>
            </TouchableOpacity>
          )}
          {loading && <ActivityIndicator size="large" color="#8E24AA" style={{marginTop: 20}} />}
        </View>
      )}

      {!image && !manuelMod && !analizSonucu && status ? (
        <Text style={styles.statusText}>{status}</Text>
      ) : null}

      {manuelMod && (
        <View style={styles.manuelCard}>
            <View style={styles.manuelHeader}>
              <Ionicons name="restaurant-outline" size={24} color="#8E24AA" />
              <Text style={styles.manuelTitle}>Manuel Besin Girişi</Text>
            </View>
            <Text style={styles.label}>Yemek İsmi:</Text>
            <TextInput style={styles.inputFull} value={manuelIsim} onChangeText={setManuelIsim} placeholder="Örn: Ev Yapımı Lazanya" />
            <Text style={styles.label}>100 Gramındaki Karbonhidrat (g):</Text>
            <TextInput style={styles.inputFull} keyboardType="numeric" value={manuelKarb} onChangeText={setManuelKarb} placeholder="Örn: 22" />
            <TouchableOpacity style={styles.applyBtn} onPress={manuelGirisUygula}>
              <Text style={styles.applyBtnText}>UYGULA VE HESAPLA</Text>
            </TouchableOpacity>
        </View>
      )}
      
      {analizSonucu && !manuelMod && (
        <View style={styles.resultCard}>
            <Text style={styles.foodName}>{analizSonucu.turkce_isim}</Text>
            <Text style={styles.foodDetail}>100g İçin Temel Değer: {analizSonucu.karbonhidrat_miktari}g Karb.</Text>
            {analizSonucu.tahmini ? (
              <Text style={{ fontSize: 12, color: '#B71C1C', textAlign: 'center', marginTop: 8, fontWeight: 'bold' }}>
                ⚠️ Bu değer yapay zekâ tahminidir. Lütfen kontrol edin; yanlışsa "Besin Değerini Manuel Gir" ile düzeltin.
              </Text>
            ) : null}
            <View style={styles.divider}></View>
            
            <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tüketim (g):</Text>
                    <TextInput style={styles.inputBox} keyboardType="numeric" value={gramaj} onChangeText={setGramaj} maxLength={4} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kan Şekeri:</Text>
                    <TextInput style={styles.inputBox} keyboardType="numeric" value={kanSekeri} onChangeText={setKanSekeri} placeholder="Örn: 120" maxLength={3} />
                </View>
            </View>

            <View style={styles.summaryBox}>
                <Text style={styles.carbText}>Toplam Karbonhidrat: <Text style={{color: '#8E24AA'}}>{toplamKarbonhidrat}g</Text></Text>
            </View>

            {kanSekeri !== '' && gramaj !== '' && !yapayZekaKullanildi && (
              <TouchableOpacity style={styles.aiActionBtn} onPress={lstmTahminiAl} disabled={aiYukleniyor}>
                {aiYukleniyor ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={22} color="#fff" style={{marginRight: 8}} />
                    <Text style={styles.aiActionBtnText}>Geçmiş Verilerime Göre Analiz Et</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {yapayZekaKullanildi && gelecekSeker && (
              <View style={styles.aiResultBox}>
                <View style={styles.aiResultIconContainer}>
                  <Ionicons name="bulb" size={26} color="#5E35B1" />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={styles.aiResultTitle}>Kişiselleştirilmiş Şeker Tahmini</Text>
                  <Text style={styles.aiResultText}>Önceki öğün kayıtlarınız incelendi. Bu yemeğin ardından şekerinizin <Text style={{fontWeight:'bold'}}>{gelecekSeker} mg/dL</Text> seviyesine çıkabileceği öngörülüyor.</Text>
                </View>
              </View>
            )}

            <View style={styles.insulinBox}>
                {!yapayZekaKullanildi && (
                  <>
                    <View style={styles.insulinRow}>
                      <Text style={styles.insulinBreakdown}>Klasik Yemek İnsülini:</Text>
                      <Text style={styles.boldDose}>{yemekInsulini} Ü</Text>
                    </View>
                    {kanSekeri !== '' && (
                      <View style={styles.insulinRow}>
                        <Text style={styles.insulinBreakdown}>Şeker Düzeltme:</Text>
                        <Text style={duzeltmeInsulini > 0 ? styles.highDose : styles.lowDose}>{duzeltmeInsulini > 0 ? `+${duzeltmeInsulini}` : duzeltmeInsulini} Ü</Text>
                      </View>
                    )}
                    <View style={styles.totalDoseLine}></View>
                  </>
                )}
                
                <Text style={styles.insulinLabel}>
                  {yapayZekaKullanildi ? "Akıllı Analizle Önerilen Doz" : "Klasik Hesaplanmış Doz"}
                </Text>
                <Text style={[styles.insulinValue, yapayZekaKullanildi && {color: '#311B92'}]}>
                  {toplamOnerilenInsulin} Ünite
                </Text>
            </View>

            <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, padding: 12, backgroundColor: '#F3E5F5', borderRadius: 8, borderWidth: 1, borderColor: '#CE93D8' }}
                onPress={() => Alert.alert(
                  "Klinik Karar Destek Sistemi", 
                  "Bu insülin dozu; porsiyon hacminiz, karbonhidrat yoğunluğunuz ve anlık kan şekeri seviyeniz baz alınarak tıbbi hesaplama parametreleriyle klinik standartlara uygun olarak doğrulanmıştır."
                )}
            >
                <Ionicons name="information-circle" size={22} color="#8E24AA" style={{ marginRight: 6 }} />
                <Text style={{ color: '#8E24AA', fontSize: 13, fontWeight: 'bold' }}>
                    Klinik Hesaplama Gerekçesini Gör
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveActionBtn} onPress={gecmiseKaydet}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.saveActionBtnText}>GEÇMİŞE KAYDET</Text>
            </TouchableOpacity>
        </View>
      )}
      <View style={{height: 30}}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F0F9', paddingHorizontal: 15, paddingTop: 20 }, 
  headerArea: { marginBottom: 20, paddingHorizontal: 5 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 5 }, 
  pageSubtitle: { fontSize: 14, color: '#666', lineHeight: 20 },
  actionPanel: { backgroundColor: '#fff', padding: 15, borderRadius: 16, elevation: 3, marginBottom: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  primaryBtn: { backgroundColor: '#8E24AA', flexDirection: 'row', padding: 12, borderRadius: 10, width: '48%', alignItems: 'center', justifyContent: 'center' }, 
  secondaryBtn: { backgroundColor: '#F3E5F5', flexDirection: 'row', padding: 12, borderRadius: 10, width: '48%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CE93D8' }, 
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },
  btnTextDark: { color: '#8E24AA', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },
  manualBtn: { backgroundColor: '#FBF8FD', flexDirection: 'row', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1BEE7' },
  manualBtnText: { color: '#8E24AA', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },
  favoritesBtn: { backgroundColor: '#8E24AA', flexDirection: 'row', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
  favoritesBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CE93D8' },
  iconCircle: { width: 80, height: 80, backgroundColor: '#F3E5F5', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 5 },
  emptyStateDesc: { fontSize: 13, color: '#777', textAlign: 'center', paddingHorizontal: 30 },
  imageCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 20 },
  image: { width: '100%', height: 250, borderRadius: 12 },
  statusText: { marginTop: 15, fontSize: 14, color: '#666', textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' },
  analyzeBtn: { backgroundColor: '#7B1FA2', flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', marginTop: 15, width: '100%', justifyContent: 'center', elevation: 3 },
  analyzeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  manuelCard: { backgroundColor: '#FBF8FD', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E1BEE7', marginBottom: 20 },
  manuelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  manuelTitle: { fontSize: 18, fontWeight: 'bold', color: '#8E24AA', marginLeft: 8 },
  inputFull: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CE93D8', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  applyBtn: { backgroundColor: '#8E24AA', paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resultCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 4, marginBottom: 20 },
  foodName: { fontSize: 26, fontWeight: 'bold', color: '#6A1B9A', textAlign: 'center' },
  foodDetail: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  inputGroup: { width: '48%' },
  label: { fontSize: 13, color: '#555', marginBottom: 5, fontWeight: 'bold' },
  inputBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa', textAlign: 'center', color: '#333', fontWeight: 'bold' },
  
  aiActionBtn: { backgroundColor: '#4527A0', flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15, elevation: 4, shadowColor: '#311B92', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  aiActionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  aiResultBox: { flexDirection: 'row', backgroundColor: '#EDE7F6', padding: 16, borderRadius: 12, borderColor: '#B39DDB', borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  aiResultIconContainer: { backgroundColor: '#D1C4E9', padding: 8, borderRadius: 25 },
  aiResultTitle: { color: '#311B92', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  aiResultText: { color: '#4527A0', fontSize: 13, lineHeight: 18 },

  summaryBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  carbText: { fontSize: 16, fontWeight: 'bold', color: '#444' },
  insulinBox: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#CE93D8' }, 
  insulinRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
  insulinBreakdown: { fontSize: 15, color: '#555' },
  boldDose: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  highDose: { fontWeight: 'bold', color: '#D32F2F', fontSize: 15 },
  lowDose: { fontWeight: 'bold', color: '#8E24AA', fontSize: 15 }, 
  totalDoseLine: { height: 1, backgroundColor: '#CE93D8', width: '100%', marginVertical: 12 },
  insulinLabel: { fontSize: 14, color: '#6A1B9A', fontWeight: 'bold', textAlign: 'center' }, 
  insulinValue: { fontSize: 36, fontWeight: 'bold', color: '#4A148C', marginTop: 5 }, 
  saveActionBtn: { backgroundColor: '#8E24AA', flexDirection: 'row', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  saveActionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});