import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

const InsulinTahminEkrani = () => {
  // Kullanıcıdan alınacak veriler
  const [anlikSeker, setAnlikSeker] = useState('');
  const [karbonhidrat, setKarbonhidrat] = useState('');
  
  // Uygulama genelinde tuttuğun kullanıcı maili (Context veya Async storage'dan gelir)
  const userEmail = "gecmiste_kaydi_olan_bir_mail@gmail.com"; 

  // API'den dönecek sonuçları ve yüklenme durumunu tutacak state'ler
  const [sonuc, setSonuc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const yapayZekaTahminiAl = async () => {
    if (!anlikSeker || !karbonhidrat) {
      Alert.alert("Uyarı", "Lütfen anlık şeker ve karbonhidrat değerlerini girin.");
      return;
    }

    setYukleniyor(true);
    try {
      const response = await fetch('https://reporting-service-vsbz.onrender.com/insulin-tahmini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          anlik_seker: parseFloat(anlikSeker),
          guncel_karbonhidrat: parseFloat(karbonhidrat)
        }),
      });

      const data = await response.json();

      if (data.durum === 'basarili') {
        // Gelen veriyi state'e kaydedip ekrana basıyoruz
        setSonuc(data.analiz_sonucu);
      } else {
        Alert.alert("Hata", data.mesaj || "Analiz yapılamadı.");
      }
    } catch (error) {
      console.error("Yapay Zeka API Hatası:", error);
      Alert.alert("Hata", "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Anlık Kan Şekeri (mg/dL)"
        value={anlikSeker}
        onChangeText={setAnlikSeker}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />
      <TextInput
        placeholder="Öğün Karbonhidratı (gr)"
        value={karbonhidrat}
        onChangeText={setKarbonhidrat}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />

      <TouchableOpacity 
        onPress={yapayZekaTahminiAl} 
        style={{ backgroundColor: '#007BFF', padding: 15, borderRadius: 5, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Yapay Zeka Analizi Yap</Text>
      </TouchableOpacity>

      {yukleniyor && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}

      {sonuc && !yukleniyor && (
        <View style={{ marginTop: 30, padding: 20, backgroundColor: '#e8f4f8', borderRadius: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>📊 LSTM Analiz Sonucu</Text>
          <Text style={{ fontSize: 16 }}>Beklenen Şeker Trendi: <Text style={{ fontWeight: 'bold', color: '#d9534f' }}>{sonuc.gelecekteki_seker} mg/dL</Text></Text>
          <Text style={{ fontSize: 16, marginTop: 5 }}>Önerilen İnsülin Dozu: <Text style={{ fontWeight: 'bold', color: '#5cb85c' }}>{sonuc.onerilen_insulin} Ünite</Text></Text>
        </View>
      )}
    </View>
  );
};

export default InsulinTahminEkrani;