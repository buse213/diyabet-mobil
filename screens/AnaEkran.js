import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, TextInput, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Asset } from 'expo-asset';
import NetInfo from '@react-native-community/netinfo';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = 'https://api-gateway-gq75.onrender.com';

// --- GÜVENLİ GÖRSEL ÖN İŞLEME (TENSOR) FONKSİYONU ---
const prepareImageForModel = async (imageUri) => {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    // Saf Buffer / jpeg-js bağımlılığı kaldırıldı, doğrudan base64 verisi kullanılıyor
    const base64Str = manipResult.base64;
    const binaryString = global.atob ? global.atob(base64Str) : Buffer.from(base64Str, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const width = 224;
    const height = 224;
    const float32Data = new Float32Array(3 * width * height);

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < width * height; i++) {
      const r = bytes[i * 4] / 255.0;
      const g = bytes[i * 4 + 1] / 255.0;
      const b = bytes[i * 4 + 2] / 255.0;

      float32Data[i] = (r - mean[0]) / std[0];                               
      float32Data[i + width * height] = (g - mean[1]) / std[1];            
      float32Data[i + 2 * width * height] = (b - mean[2]) / std[2];        
    }

    const { Tensor } = require('onnxruntime-react-native');
    return new Tensor('float32', float32Data, [1, 3, 224, 224]);
  } catch (error) {
    console.error("Resim tensöre çevrilirken hata oluştu: ", error);
    throw error;
  }
};

export default function AnaEkran() {
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

  const [isModelReady, setIsModelReady] = useState(false);
  const [modelPath, setModelPath] = useState(null);

// --- MODELİ ANINDA HAZIR HALE GETİR ---
  useEffect(() => {
    const prepareModel = async () => {
      try {
        const targetUri = `${FileSystem.cacheDirectory}diyabet_modeli_resnet18.onnx`;
        const fileInfo = await FileSystem.getInfoAsync(targetUri);

        if (!fileInfo.exists) {
          const asset = Asset.fromModule(require('../assets/models/diyabet_modeli_resnet18.onnx'));
          await asset.downloadAsync();
          const sourceUri = asset.localUri || asset.uri;
          await FileSystem.copyAsync({
            from: sourceUri,
            to: targetUri,
          });
        }

        let cleanPath = targetUri;
        if (Platform.OS === 'android' && cleanPath.startsWith('file://')) {
          cleanPath = cleanPath.replace('file://', '');
        }

        setModelPath(cleanPath);
        setIsModelReady(true);
      } catch (error) {
        console.error("Model hazırlık hatası:", error);
        // Hata olsa bile uygulamanın kilitlenmemesi için modeli hazır kabul et
        setIsModelReady(true);
      }
    };
    prepareModel();
  }, []);

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
            if (sekerDegeri < 70) {
                setHipoglisemi(true);
                setHiperglisemi(false);
            } else if (sekerDegeri > 140) {
                setHipoglisemi(false);
                setHiperglisemi(true);
            } else {
                setHipoglisemi(false);
                setHiperglisemi(false);
            }
            
            ekDoz = (sekerDegeri - 120) / hastaIsf; 
            setDuzeltmeInsulini(ekDoz.toFixed(1));
        } else {
            setHipoglisemi(false);
            setHiperglisemi(false);
            setDuzeltmeInsulini(0);
        }

        const nihaiDoz = Math.max(0, bazInsulin + ekDoz);
        setToplamOnerilenInsulin(nihaiDoz.toFixed(1));
        
      } else {
        setToplamKarbonhidrat(0); setYemekInsulini(0); setDuzeltmeInsulini(0); setToplamOnerilenInsulin(0); setHipoglisemi(false); setHiperglisemi(false);
      }
    }
  }, [gramaj, analizSonucu, kanSekeri, hastaIcr, hastaIsf]);

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Hata", "Kamerayı kullanmak için izin vermelisin!");
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setStatus('Fotoğraf çekildi, analize hazır.');
      setAnalizSonucu(null); setManuelMod(false); setGramaj('100'); setKanSekeri(''); setHipoglisemi(false); setHiperglisemi(false);
    }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Hata", "Galeriye erişmek için izin vermelisin!");
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setStatus('Resim seçildi, analize hazır.');
      setAnalizSonucu(null); setManuelMod(false); setGramaj('100'); setKanSekeri(''); setHipoglisemi(false); setHiperglisemi(false);
    }
  };

  const uploadImage = async () => {
    if (!image) return Alert.alert('Hata', 'Önce bir fotoğraf seçmelisiniz!');
    if (!isModelReady || !modelPath) return Alert.alert('Lütfen Bekleyin', 'Yapay zeka modeli arka planda hazırlanıyor...');
    
    setLoading(true); 
    setAnalizSonucu(null);
    
    try {
      setStatus('1. Aşama: Yerel Yapay Zeka (Edge AI) inceliyor...');
      
      const { InferenceSession } = require('onnxruntime-react-native');
      const session = await InferenceSession.create(modelPath);

      const imageTensor = await prepareImageForModel(image); 
      const results = await session.run({ input: imageTensor });
      
      const outputData = results[Object.keys(results)[0]].data; 
      const maxScore = Math.max(...outputData);
      const predictedClass = outputData.indexOf(maxScore);

      const yerelModelEminMi = maxScore > 5.0; 

      if (yerelModelEminMi) {
          setStatus(`Edge AI Başarılı! Sınıf ID: ${predictedClass}`);
          setLoading(false);
      } else {
          setStatus('2. Aşama: Edge AI emin olamadı, Cloud (Gemini) devreye giriyor...');
          
          const networkState = await NetInfo.fetch();
          if (!networkState.isConnected) {
              Alert.alert(
                  "Çevrimdışı Mod (Offline)",
                  "Cihazınızdaki yapay zeka bu yemeği tanımlayamadı. Bulut destekli detaylı analiz için internet bağlantısı gerekiyor."
              );
              setLoading(false);
              return; 
          }
          
          const filename = image.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          const formData = new FormData();
          formData.append('file', {
            uri: image,
            name: filename || 'food.jpg',
            type: type,
          });

          const response = await axios.post(`${BACKEND_URL}/analiz`, formData, {
            headers: { 'Accept': 'application/json' },
          });
          
          if (response.data.durum === 'basarili') {
              setAnalizSonucu(response.data.sonuc);
              setStatus('Cloud (Gemini) Analizi Başarılı!');
          } else {
              setStatus('Sonuç alınamadı.');
          }
      }

    } catch (error) {
      console.log("Hata detayı:", error);
      Alert.alert('Analiz Hatası', String(error.message || error));
      setStatus('Hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const manuelGirisUygula = () => {
    if(!manuelIsim || !manuelKarb) return Alert.alert('Hata', 'Lütfen yemek adını ve 100g için karbonhidratı doldurun.');
    setAnalizSonucu({ turkce_isim: manuelIsim, karbonhidrat_miktari: parseFloat(manuelKarb) });
    setManuelMod(false);
    setStatus('Manuel besin girişi uygulandı.');
  };

  const gecmiseKaydet = async () => {
    if (!kanSekeri) return Alert.alert("Eksik Bilgi", "Lütfen mevcut kan şekerinizi girin.");
    if (!kullaniciEmail) return Alert.alert("Hata", "Kullanıcı bilgisi bulunamadı."); 
    
    try {
        const payload = {
            email: kullaniciEmail, 
            yemek_ismi: analizSonucu.turkce_isim, 
            tuketilen_gramaj: parseFloat(gramaj),
            alinan_karbonhidrat: parseFloat(toplamKarbonhidrat), 
            olculen_kan_sekeri: parseFloat(kanSekeri),
            onerilen_insulin: parseFloat(toplamOnerilenInsulin)
        };
        const response = await axios.post(`${BACKEND_URL}/kaydet`, payload);
        if (response.data.durum === 'basarili') {
            Alert.alert("Başarılı", "Kayıt geçmişe eklendi!");
            setAnalizSonucu(null); setImage(null); setStatus(''); setManuelIsim(''); setManuelKarb('');
        }
    } catch (error) {
        Alert.alert("Hata", "Veritabanına kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Akıllı Yemek Analizi</Text>
        <Text style={styles.pageSubtitle}>Yemeğinizin karbonhidrat değerini anında keşfedin ve insülin dozunuzu hesaplayın.</Text>
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
          <Text style={styles.manualBtnText}>Manuel Besin Gir</Text>
        </TouchableOpacity>
      </View>

      {!image && !manuelMod && !analizSonucu && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="scan-outline" size={50} color="#BA68C8" />
          </View>
          <Text style={styles.emptyStateTitle}>Görsel Bekleniyor</Text>
          <Text style={styles.emptyStateDesc}>Analiz yapmak için bir fotoğraf çekin veya manuel olarak giriş yapın.</Text>
        </View>
      )}

      {image && !manuelMod && (
        <View style={styles.imageCard}>
          <Image source={{ uri: image }} style={styles.image} />
          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          
          {!loading && !analizSonucu && (
            <TouchableOpacity style={styles.analyzeBtn} onPress={uploadImage}>
              <Ionicons name="sparkles" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.analyzeBtnText}>Besini Analiz Et</Text>
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

            <View style={styles.xaiCard}>
                <View style={styles.xaiHeader}>
                  <Ionicons name="analytics" size={18} color="#8E24AA" />
                  <Text style={styles.xaiTitle}>Hesaplama Detayı ve Gerekçesi</Text>
                </View>
                <Text style={styles.xaiText}>
                  • <Text style={{fontWeight: 'bold'}}>Besin Yükü:</Text> Tüketilen {toplamKarbonhidrat}g karbonhidrat, ICR oranınız ({hastaIcr}) baz alınarak işlendi.{'\n'}
                  • <Text style={{fontWeight: 'bold'}}>Metabolik Durum:</Text> Kan şekeri ({kanSekeri || '0'} mg/dL) sapması, ISF faktörünüz ({hastaIsf}) ile optimize edildi.
                </Text>
            </View>

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
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CE93D8' },
  iconCircle: { width: 80, height: 80, backgroundColor: '#F3E5F5', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 5 },
  emptyStateDesc: { fontSize: 13, color: '#777', textAlign: 'center', paddingHorizontal: 30 },
  imageCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 20 },
  image: { width: '100%', height: 250, borderRadius: 12 },
  statusText: { marginTop: 15, fontSize: 14, color: '#666', textAlign: 'center', fontStyle: 'italic' },
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
  xaiCard: { backgroundColor: '#FAF5FD', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D1C4E9', marginBottom: 15 },
  xaiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  xaiTitle: { fontSize: 13, fontWeight: 'bold', color: '#6A1B9A', marginLeft: 6 },
  xaiText: { fontSize: 12, color: '#555', lineHeight: 18 },
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