import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Node.js ile bağlantı kurmak için eklendi
import { Ionicons } from '@expo/vector-icons';

export default function ProfilEkran({ navigation, route }) {
  // EĞER YENİ KAYITSA DOĞRUDAN DÜZENLEME MODUNDA BAŞLATIR
  const [isEditing, setIsEditing] = useState(route?.params?.isNewUser || false);

  const [adSoyad, setAdSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [yas, setYas] = useState('');
  const [kilo, setKilo] = useState('');
  const [diyabetYili, setDiyabetYili] = useState('');

  const [icr, setIcr] = useState('');
  const [isf, setIsf] = useState('');

  useEffect(() => {
    const verileriYukle = async () => {
      try {
        const kayitliAd = await AsyncStorage.getItem('hasta_ad');
        const kayitliEmail = await AsyncStorage.getItem('hasta_email'); 
        const kayitliYas = await AsyncStorage.getItem('kullanici_yas');
        const kayitliKilo = await AsyncStorage.getItem('kullanici_kilo');
        const kayitliYil = await AsyncStorage.getItem('kullanici_diyabetYili');
        const kayitliIcr = await AsyncStorage.getItem('hasta_icr');
        const kayitliIsf = await AsyncStorage.getItem('hasta_isf');

        if (kayitliAd) setAdSoyad(kayitliAd);
        if (kayitliEmail) setEmail(kayitliEmail);
        if (kayitliYas) setYas(kayitliYas);
        if (kayitliKilo) setKilo(kayitliKilo);
        if (kayitliYil) setDiyabetYili(kayitliYil);
        setIcr(kayitliIcr ? kayitliIcr : '');
        setIsf(kayitliIsf ? kayitliIsf : '');
      } catch (error) {
        console.error("Profil verileri yüklenirken hata", error);
      }
    };
    verileriYukle();
  }, []);

  const ayarlariKaydet = async () => {
    if (!adSoyad || !icr || !isf) {
      return Alert.alert("Eksik Bilgi", "Lütfen Ad Soyad, ICR ve ISF değerlerini doldurunuz.");
    }

    try {
      // 1. GERÇEK VERİTABANINA GÜNCELLEME İSTEĞİ AT
      const response = await axios.post('http://10.203.121.146:3000/profil-guncelle', {
          email: email, // E-postayı baz alarak güncelliyor
          ad: adSoyad,
          yas: yas || null,
          kilo: kilo || null,
          diyabet_yili: diyabetYili || null,
          icr: icr,
          isf: isf
      });

      // 2. SUNUCUDAN 'BAŞARILI' YANITI GELİRSE TELEFONA DA KAYDET
      if (response.data.durum === 'basarili') {
          await AsyncStorage.setItem('hasta_ad', adSoyad);
          await AsyncStorage.setItem('kullanici_yas', String(yas));
          await AsyncStorage.setItem('kullanici_kilo', String(kilo));
          await AsyncStorage.setItem('kullanici_diyabetYili', String(diyabetYili));
          await AsyncStorage.setItem('hasta_icr', String(icr));
          await AsyncStorage.setItem('hasta_isf', String(isf));
          
          Alert.alert("Başarılı", "Profil bilgileri başarıyla kaydedildi!", [
            {
                text: "Tamam",
                onPress: () => {
                    // YENİ KAYIT OLAN BİRİYSE KAYDETTİKTEN SONRA ANA SAYFAYA AT
                    if (route?.params?.isNewUser) {
                        navigation.replace('MainTabs');
                    } else {
                        setIsEditing(false); // NORMAL DÜZENLEMEYSE SADECE OKUMA MODUNA GEÇ
                    }
                }
            }
          ]);
      } else {
          Alert.alert("Hata", response.data.mesaj);
      }
    } catch (error) {
      Alert.alert("Hata", "Ayarlar kaydedilirken sunucuya ulaşılamadı.");
    }
  };

  const cikisYap = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış Yap", 
          style: "destructive",
          onPress: async () => {
            try {
              // E-POSTAYI SİLMİYORUZ, SADECE OTURUMU KAPATIYORUZ 
              await AsyncStorage.removeItem('oturum_durumu');
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Giris' }],
              });
            } catch (error) {
              Alert.alert("Hata", "Çıkış yapılırken sorun oluştu.");
            }
          } 
        }
      ]
    );
  };

  if (!isEditing) {
    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileHeaderCard}>
          <Ionicons name="person-circle" size={100} color="#8E24AA" />
          <Text style={styles.profileName}>{adSoyad || 'İsimsiz Kullanıcı'}</Text>
          <Text style={styles.profileEmail}>{email || 'E-posta eklenmemiş'}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Yaş</Text>
            <Text style={styles.statValue}>{yas || '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kilo</Text>
            <Text style={styles.statValue}>{kilo ? `${kilo} kg` : '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Diyabet Yılı</Text>
            <Text style={styles.statValue}>{diyabetYili ? `${diyabetYili} Yıl` : '-'}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⚕️ Kişisel Tedavi Değerlerim</Text>
          <View style={styles.clinicalRow}>
            <View style={styles.clinicalBox}>
              <Text style={styles.clinicalLabel}>ICR (Karb/İnsülin)</Text>
              <Text style={styles.clinicalValue}>{icr}</Text>
            </View>
            <View style={styles.clinicalBox}>
              <Text style={styles.clinicalLabel}>ISF (Duyarlılık)</Text>
              <Text style={styles.clinicalValue}>{isf}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Ionicons name="pencil" size={20} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.saveButtonText}>BİLGİLERİMİ GÜNCELLE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={cikisYap}>
          <Ionicons name="log-out-outline" size={22} color="#fff" style={{marginRight: 8}} />
          <Text style={styles.saveButtonText}>ÇIKIŞ YAP</Text>
        </TouchableOpacity>

        <View style={{height: 40}}></View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Profilimi Düzenle</Text>
        {/* EĞER YENİ KAYITSA İPTAL BUTONUNU GİZLE Kİ FORMU DOLDURMADAN KAÇAMASIN */}
        {!route?.params?.isNewUser && (
            <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>👤 Kişisel Bilgilerim</Text>
        <Text style={styles.label}>Adınız ve Soyadınız:</Text>
        <TextInput style={styles.input} placeholder="Örn: Buse Çam" value={adSoyad} onChangeText={setAdSoyad} />

        <Text style={styles.label}>E-Posta Adresiniz (Değiştirilemez):</Text>
        <TextInput style={[styles.input, {backgroundColor: '#eee', color: '#999'}]} value={email} editable={false} />

        <View style={styles.row}>
          <View style={styles.halfInputContainer}>
            <Text style={styles.label}>Yaşınız:</Text>
            <TextInput style={styles.input} placeholder="Örn: 22" keyboardType="numeric" value={yas} onChangeText={setYas} maxLength={2} />
          </View>
          <View style={styles.halfInputContainer}>
            <Text style={styles.label}>Kilonuz (kg):</Text>
            <TextInput style={styles.input} placeholder="Örn: 65" keyboardType="numeric" value={kilo} onChangeText={setKilo} maxLength={3} />
          </View>
        </View>

        <Text style={styles.label}>Kaç Yıldır Diyabet Hastasısınız?</Text>
        <TextInput style={styles.input} placeholder="Örn: 5" keyboardType="numeric" value={diyabetYili} onChangeText={setDiyabetYili} maxLength={2} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚕️ Kişisel Tedavi Değerlerim</Text>
        <Text style={styles.label}>Karbonhidrat/İnsülin Oranı (ICR):</Text>
        <TextInput style={styles.inputHighlight} placeholder="Örn: 15" keyboardType="numeric" value={icr} onChangeText={setIcr} />

        <Text style={styles.label}>İnsülin Duyarlılık Faktörü (ISF):</Text>
        <TextInput style={styles.inputHighlight} placeholder="Örn: 50" keyboardType="numeric" value={isf} onChangeText={setIsf} />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={ayarlariKaydet}>
        <Text style={styles.saveButtonText}>TÜM AYARLARI KAYDET</Text>
      </TouchableOpacity>

      <View style={{height: 40}}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F0F9', padding: 15 },
  profileHeaderCard: { backgroundColor: '#fff', padding: 25, borderRadius: 16, alignItems: 'center', marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, borderWidth: 1, borderColor: '#E1BEE7' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  profileEmail: { fontSize: 14, color: '#666', marginTop: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { backgroundColor: '#fff', width: '31%', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E1BEE7' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#8E24AA', marginTop: 5 },
  statLabel: { fontSize: 12, color: '#777', fontWeight: '600' },
  clinicalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  clinicalBox: { backgroundColor: '#F3E5F5', width: '48%', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#CE93D8' },
  clinicalValue: { fontSize: 22, fontWeight: 'bold', color: '#4A148C', marginTop: 5 },
  clinicalLabel: { fontSize: 12, color: '#6A1B9A', fontWeight: 'bold', textAlign: 'center' },
  editButton: { backgroundColor: '#8E24AA', flexDirection: 'row', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A' },
  cancelText: { fontSize: 16, color: '#D32F2F', fontWeight: 'bold' },
  sectionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#E1BEE7' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInputContainer: { width: '48%' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 8 },
  input: { backgroundColor: '#FBF8FD', borderWidth: 1, borderColor: '#CE93D8', borderRadius: 10, padding: 12, fontSize: 16, color: '#333', marginBottom: 15 },
  inputHighlight: { backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8', borderRadius: 10, padding: 12, fontSize: 16, color: '#4A148C', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  saveButton: { backgroundColor: '#8E24AA', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 4 },
  logoutButton: { backgroundColor: '#D32F2F', flexDirection: 'row', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 15, elevation: 3 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});