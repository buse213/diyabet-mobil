import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// IP Adresini kendi bilgisayarının IP'si ile eşleştiğinden emin ol
const BACKEND_URL = 'http://10.203.121.146:3000'; 

export default function HizliDozEkran() {
  const [kanSekeri, setKanSekeri] = useState('');
  const [hastaIsf, setHastaIsf] = useState(50); 
  const [kullaniciEmail, setKullaniciEmail] = useState(''); // YENİ: E-postayı tutacak state
  
  const [hesaplananDoz, setHesaplananDoz] = useState(null);
  const [mesaj, setMesaj] = useState('');
  const [durum, setDurum] = useState('normal'); 

  const [yuksekSayisi, setYuksekSayisi] = useState(0);
  const [dusukSayisi, setDusukSayisi] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      const ayarlariYukle = async () => {
        const isf = await AsyncStorage.getItem('hasta_isf');
        const email = await AsyncStorage.getItem('hasta_email'); // YENİ: E-postayı hafızadan çek

        if (isf) setHastaIsf(parseFloat(isf));
        
        if (email) {
            setKullaniciEmail(email);
            istatistikleriGetir(email); // YENİ: E-postayı fonksiyona pasla
        }
      };
      ayarlariYukle();
    }, [])
  );

  // YENİ: Artık istek atarken 'email' parametresini kullanıyor
  const istatistikleriGetir = async (email) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/gecmis`, {
          params: { email: email } // Sadece bu e-postaya ait verileri getir
      });
      
      if (response.data.durum === 'basarili') {
        const veriler = response.data.veriler;
        const simdi = new Date();
        const yirmidortSaatOnce = new Date(simdi.getTime() - (24 * 60 * 60 * 1000));

        let yuksek = 0;
        let dusuk = 0;

        veriler.forEach(kayit => {
          const kayitTarihi = new Date(kayit.tarih);
          if (kayitTarihi >= yirmidortSaatOnce) {
            if (kayit.olculen_kan_sekeri > 120) yuksek++; 
            if (kayit.olculen_kan_sekeri > 0 && kayit.olculen_kan_sekeri < 70) dusuk++; 
          }
        });

        setYuksekSayisi(yuksek);
        setDusukSayisi(dusuk);
      }
    } catch (error) {
      console.error("İstatistikler çekilemedi", error);
    }
  };

  const kanSekeriDegisti = (deger) => {
    setKanSekeri(deger);
    const seker = parseFloat(deger);
    
    if (isNaN(seker)) {
      setHesaplananDoz(null);
      setMesaj('');
      setDurum('normal');
      return;
    }

    if (seker < 70) {
      setDurum('hipo');
      setHesaplananDoz(0);
      setMesaj('⚠️ HİPOGLİSEMİ: İnsülin YASAK! Acilen 15g hızlı karbonhidrat alın (örn: meyve suyu) ve 15 dk sonra tekrar ölçün.');
    } else if (seker <= 120) {
      setDurum('normal');
      setHesaplananDoz(0);
      setMesaj('✅ Kan şekeriniz hedef aralıkta. Ek düzeltme dozuna gerek yok.');
    } else {
      setDurum('hiper');
      const doz = (seker - 120) / hastaIsf;
      setHesaplananDoz(Math.max(0, doz).toFixed(1));
      setMesaj('Yüksek kan şekerini hedefe (120 mg/dL) düşürmek için önerilen doz.');
    }
  };

  const kaydet = async () => {
    if (!kanSekeri) return Alert.alert("Hata", "Lütfen kan şekerinizi girin.");
    if (!kullaniciEmail) return Alert.alert("Hata", "Kullanıcı bilgisi bulunamadı, lütfen tekrar giriş yapın.");
    
    try {
        const payload = {
            email: kullaniciEmail, // YENİ: Kayıt esnasında veritabanına e-postayı da gönderiyoruz
            yemek_ismi: 'Hızlı Düzeltme / Kontrol', 
            tuketilen_gramaj: 0,
            alinan_karbonhidrat: 0, 
            olculen_kan_sekeri: parseFloat(kanSekeri),
            onerilen_insulin: hesaplananDoz ? parseFloat(hesaplananDoz) : 0
        };
        const response = await axios.post(`${BACKEND_URL}/kaydet`, payload);
        if (response.data.durum === 'basarili') {
            Alert.alert("Başarılı", "Ölçüm geçmişe kaydedildi!");
            setKanSekeri('');
            setHesaplananDoz(null);
            setMesaj('');
            istatistikleriGetir(kullaniciEmail); // YENİ: İstatistikleri güncel e-posta ile yenile
        }
    } catch (error) {
        Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* BAŞLIK */}
      <View style={styles.headerContainer}>
        <Ionicons name="medical" size={40} color="#8E24AA" style={{marginBottom: 10}} />
        <Text style={styles.mainTitle}>Hızlı Düzeltme Dozu</Text>
        <Text style={styles.description}>
          Yemek yemediğiniz zamanlarda, yüksek kan şekerinizi düzeltmek veya hipoglisemiye müdahale etmek için kullanın.
        </Text>
      </View>

      {/* VERİ GİRİŞ KARTI */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Mevcut Kan Şekeriniz:</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.textInput} 
            keyboardType="numeric" 
            placeholder="Örn: 200" 
            value={kanSekeri}
            onChangeText={kanSekeriDegisti}
            maxLength={3}
          />
          <Text style={styles.unitText}>mg/dL</Text>
        </View>
      </View>

      {/* DİNAMİK SONUÇ KARTI */}
      {hesaplananDoz !== null && (
        <View style={[
          styles.resultCard, 
          durum === 'hipo' ? styles.bgHipo : durum === 'hiper' ? styles.bgHiper : styles.bgNormal
        ]}>
          {durum === 'hiper' && (
            <>
              <Text style={styles.resultLabel}>Uygulanacak Net Doz</Text>
              <Text style={styles.resultValue}>{hesaplananDoz} <Text style={{fontSize: 20}}>Ünite</Text></Text>
            </>
          )}
          <Text style={durum === 'hipo' ? styles.hipoMessage : styles.resultMessage}>{mesaj}</Text>
          
          <TouchableOpacity style={durum === 'hipo' ? styles.saveBtnHipo : styles.saveBtnNormal} onPress={kaydet}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 24 SAATLİK ÖZET PANELİ */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Son 24 Saatlik Özet</Text>
        
        <View style={styles.statsRow}>
          {/* Yüksek Şeker Kartı */}
          <View style={[styles.statCard, { borderTopColor: '#8E24AA' }]}>
            <Ionicons name="trending-up" size={32} color="#8E24AA" style={{marginBottom: 5}} />
            <Text style={styles.statValue}>{yuksekSayisi}</Text>
            <Text style={styles.statLabel}>Kez Yüksek Şeker</Text>
            <Text style={styles.statSubLabel}>(Düzeltme Dozu)</Text>
          </View>

          {/* Düşük Şeker Kartı */}
          <View style={[styles.statCard, { borderTopColor: '#D32F2F' }]}>
            <Ionicons name="warning" size={32} color="#D32F2F" style={{marginBottom: 5}} />
            <Text style={styles.statValue}>{dusukSayisi}</Text>
            <Text style={styles.statLabel}>Kez Hipoglisemi</Text>
            <Text style={styles.statSubLabel}>(Ek Karb. Alımı)</Text>
          </View>
        </View>
      </View>
      
      <View style={{height: 40}}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F0F9', padding: 20, alignItems: 'center' }, 
  
  headerContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 10 }, 
  description: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 10 },
  
  inputCard: { backgroundColor: '#fff', width: '100%', padding: 25, borderRadius: 16, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 20, borderWidth: 1, borderColor: '#E1BEE7' },
  inputLabel: { fontSize: 16, fontWeight: 'bold', color: '#4A148C', marginBottom: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { borderWidth: 2, borderColor: '#AB47BC', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 15, fontSize: 20, width: 130, textAlign: 'center', color: '#333', fontWeight: 'bold', backgroundColor: '#FBF8FD' },
  unitText: { fontSize: 18, fontWeight: 'bold', color: '#777', marginLeft: 15 },
  
  resultCard: { width: '100%', padding: 25, borderRadius: 16, alignItems: 'center', elevation: 2, marginBottom: 25 },
  bgNormal: { backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8' }, 
  bgHiper: { backgroundColor: '#F3E5F5', borderWidth: 2, borderColor: '#8E24AA' }, 
  bgHipo: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#E57373' }, 
  
  resultLabel: { fontSize: 16, color: '#6A1B9A', fontWeight: 'bold', marginBottom: 5 },
  resultValue: { fontSize: 40, fontWeight: 'bold', color: '#4A148C', marginBottom: 15 },
  resultMessage: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  hipoMessage: { fontSize: 15, color: '#C62828', textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
  
  saveBtnNormal: { backgroundColor: '#8E24AA', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10, alignItems: 'center', elevation: 2 },
  saveBtnHipo: { backgroundColor: '#D32F2F', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10, alignItems: 'center', elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  statsContainer: { width: '100%', marginTop: 5 },
  statsTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A148C', marginBottom: 15, alignSelf: 'flex-start' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 3, borderTopWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginTop: 5, textAlign: 'center' },
  statSubLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 }
});