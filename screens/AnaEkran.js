import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, TextInput, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

const BACKEND_URL = 'https://api-gateway-gq75.onrender.com';

const YEREL_MODEL_SINIFLARI = [
  { ai_etiketi: 'caesar_salad', turkce_isim: 'Sezar Salata', karbonhidrat_miktari: 4 },
  { ai_etiketi: 'chicken_curry', turkce_isim: 'Köri Soslu Tavuk', karbonhidrat_miktari: 6 },
  { ai_etiketi: 'chicken_wings', turkce_isim: 'Tavuk Kanat', karbonhidrat_miktari: 5 },
  { ai_etiketi: 'french_fries', turkce_isim: 'Patates Kızartması', karbonhidrat_miktari: 41 },
  { ai_etiketi: 'fried_rice', turkce_isim: 'Kızarmış Pirinç', karbonhidrat_miktari: 28 },
  { ai_etiketi: 'hamburger', turkce_isim: 'Hamburger', karbonhidrat_miktari: 24 },
  { ai_etiketi: 'hot_dog', turkce_isim: 'Sosisli Sandviç', karbonhidrat_miktari: 18 },
  { ai_etiketi: 'ice_cream', turkce_isim: 'Dondurma', karbonhidrat_miktari: 24 },
  { ai_etiketi: 'macaroni_and_cheese', turkce_isim: 'Mac and Cheese', karbonhidrat_miktari: 23 },
  { ai_etiketi: 'omelette', turkce_isim: 'Omlet', karbonhidrat_miktari: 1 },
  { ai_etiketi: 'pancakes', turkce_isim: 'Pancake', karbonhidrat_miktari: 28 },
  { ai_etiketi: 'pizza', turkce_isim: 'Pizza', karbonhidrat_miktari: 33 },
  { ai_etiketi: 'spaghetti_bolognese', turkce_isim: 'Spagetti Bolonez', karbonhidrat_miktari: 14 },
  { ai_etiketi: 'steak', turkce_isim: 'Biftek', karbonhidrat_miktari: 0 },
  { ai_etiketi: 'waffles', turkce_isim: 'Waffle', karbonhidrat_miktari: 33 }
];

export default function AnaEkran({ navigation }) {
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

  useEffect(() => {
    if (analizSonucu && gramaj) {
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
        [
          { 
            text: "Tamam, Manuel Gireceğim", 
            onPress: () => {
              setManuelMod(true);
              setAnalizSonucu(null);
              setImage(null);
              setStatus('');
            }
          }
        ]
      );
      return; 
    }
    
    setLoading(true); setAnalizSonucu(null);
    try {
      setStatus('Besin değerleri hesaplanıyor...');

      const formData = new FormData();
      formData.append('file', {
        uri: image,
        type: 'image/jpeg',
        name: 'yemek.jpg',
      });

      const response = await axios.post(`${BACKEND_URL}/isleme`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.durum === 'basarili' && response.data.sonuc) {
        const { turkce_isim, karbonhidrat_miktari } = response.data.sonuc;
        
        setStatus(`Analiz Tamamlandı!\nBulunan Yemek: ${turkce_isim}`);
        setAnalizSonucu({
          turkce_isim: turkce_isim,
          karbonhidrat_miktari: karbonhidrat_miktari
        });
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
        <TouchableOpacity style={styles.manualBtn} onPress={() => { setManuelMod(true); setAnalizSonucu(null); setImage(null); setStatus(''); }}>
          <Ionicons name="create-outline" size={20} color="#8E24AA" />
          <Text style={styles.manualBtnText}>Besin Değerini Manuel Gir</Text>
        </TouchableOpacity>
        
        {/* YENİ EKLENEN BUTON */}
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
          <Text style={styles.emptyStateDesc}>Öğününüze başlamadan önce yemeğinizin fotoğrafını çekin veya galeriden yükleyin.</Text>
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

            {hipoglisemi && (
                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={24} color="#D32F2F" />
                    <View style={{flex: 1, marginLeft: 10}}>
                      <Text style={styles.warningTitle}>ACİL: DÜŞÜK ŞEKER</Text>
                      <Text style={styles.warningText}>Kan şekeriniz çok düşük. İnsülin yapmadan önce 15g hızlı karbonhidrat almalısınız.</Text>
                    </View>
                </View>
            )}

            {hiperglisemi && (
                <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={24} color="#D32F2F" />
                    <View style={{flex: 1, marginLeft: 10}}>
                      <Text style={styles.warningTitle}>UYARI: YÜKSEK ŞEKER</Text>
                      <Text style={styles.warningText}>Kan şekeriniz yüksek seviyede. Hesaplanan düzeltme dozunu yemek insülininize eklemeyi unutmayın.</Text>
                    </View>
                </View>
            )}

            <View style={styles.summaryBox}>
                <Text style={styles.carbText}>Toplam Karbonhidrat: <Text style={{color: '#8E24AA'}}>{toplamKarbonhidrat}g</Text></Text>
            </View>
            <View style={styles.insulinBox}>
                <View style={styles.insulinRow}>
                  <Text style={styles.insulinBreakdown}>Yemek İçin:</Text>
                  <Text style={styles.boldDose}>{yemekInsulini} Ü</Text>
                </View>
                {kanSekeri !== '' && (
                  <View style={styles.insulinRow}>
                    <Text style={styles.insulinBreakdown}>Şeker Düzeltme:</Text>
                    <Text style={duzeltmeInsulini > 0 ? styles.highDose : styles.lowDose}>{duzeltmeInsulini > 0 ? `+${duzeltmeInsulini}` : duzeltmeInsulini} Ü</Text>
                  </View>
                )}
                <View style={styles.totalDoseLine}></View>
                <Text style={styles.insulinLabel}>Net Uygulanacak Doz</Text>
                <Text style={styles.insulinValue}>{toplamOnerilenInsulin} Ünite</Text>
            </View>
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
  
  /* YENİ BUTON TASARIMI */
  favoritesBtn: { backgroundColor: '#8E24AA', flexDirection: 'row', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
  favoritesBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  /* ------------------- */

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
  warningBox: { flexDirection: 'row', backgroundColor: '#FFEBEE', padding: 15, borderRadius: 12, borderColor: '#EF9A9A', borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  warningTitle: { color: '#C62828', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  warningText: { color: '#D32F2F', fontSize: 12, lineHeight: 16 },
  summaryBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  carbText: { fontSize: 16, fontWeight: 'bold', color: '#444' },
  insulinBox: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#CE93D8' }, 
  insulinRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 },
  insulinBreakdown: { fontSize: 15, color: '#555' },
  boldDose: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  highDose: { fontWeight: 'bold', color: '#D32F2F', fontSize: 15 },
  lowDose: { fontWeight: 'bold', color: '#8E24AA', fontSize: 15 }, 
  totalDoseLine: { height: 1, backgroundColor: '#CE93D8', width: '100%', marginVertical: 12 },
  insulinLabel: { fontSize: 14, color: '#6A1B9A', fontWeight: 'bold' }, 
  insulinValue: { fontSize: 36, fontWeight: 'bold', color: '#4A148C', marginTop: 5 }, 
  saveActionBtn: { backgroundColor: '#8E24AA', flexDirection: 'row', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  saveActionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});