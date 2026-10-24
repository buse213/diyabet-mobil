import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = 'https://api-gateway-gq75.onrender.com';

export default function AnaSayfaEkrani({ navigation }) {
  const [adSoyad, setAdSoyad] = useState('Kullanıcı');
  const [sonOlcum, setSonOlcum] = useState(null);
  const [seriSayisi, setSeriSayisi] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      veriGetir();
    }, [])
  );

  const veriGetir = async () => {
    try {
      const isim = await AsyncStorage.getItem('hasta_ad');
      if (isim) setAdSoyad(isim);

      const email = await AsyncStorage.getItem('hasta_email');

      if (email) {
          const response = await axios.get(`${BACKEND_URL}/gecmis`, {
              params: { email: email }
          });
          
          if (response.data.durum === 'basarili' && response.data.veriler.length > 0) {
            const veriler = response.data.veriler;
            setSonOlcum(veriler[0]); 
            
            // Oyunlaştırma Serisi Hesaplama
            hesaplaSeri(veriler);
          } else {
            setSonOlcum(null); 
            setSeriSayisi(0);
          }
      }
    } catch (error) {
      console.error("Ana sayfa verileri alınamadı", error);
    }
  };

  const hesaplaSeri = (veriler) => {
    if (!veriler || veriler.length === 0) return;

    // 1. Verileri gün bazında grupla
    const gunlukOlcumler = {};
    veriler.forEach(olcum => {
      const tarih = new Date(olcum.tarih).toISOString().split('T')[0];
      if (!gunlukOlcumler[tarih]) gunlukOlcumler[tarih] = [];
      gunlukOlcumler[tarih].push(olcum.olculen_kan_sekeri);
    });

    // 2. Günleri en yeniden en eskiye doğru sırala
    const siraliGunler = Object.keys(gunlukOlcumler).sort((a, b) => new Date(b) - new Date(a));
    
    const bugun = new Date().toISOString().split('T')[0];
    const dun = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 3. Kullanıcı bugün veya dün hiç ölçüm girmemişse seri zaten kopmuştur
    if (siraliGunler[0] !== bugun && siraliGunler[0] !== dun) {
       setSeriSayisi(0);
       return;
    }

    let guncelSeri = 0;
    let ardisikIhlal = 0; // Üst üste 300'ü geçme tolerans sayacı

    // 4. Geçmişe doğru günleri tarayarak seriyi hesapla
    for (let i = 0; i < siraliGunler.length; i++) {
      const anlikGun = siraliGunler[i];
      
      // Tarih atlaması kontrolü: İki ölçüm günü arasında 1 günden fazla boşluk varsa seri geçmişte kopmuştur
      if (i > 0) {
          const oncekiGun = siraliGunler[i-1];
          const farkGun = Math.round((new Date(oncekiGun) - new Date(anlikGun)) / 86400000);
          if (farkGun > 1) break; 
      }

      const gunlukSekerler = gunlukOlcumler[anlikGun];
      
      // O gün 300'ün üzerinde değer GİRİLMİŞ Mİ?
      const ihlalVarMi = gunlukSekerler.some(seker => seker > 300);

      if (ihlalVarMi) {
        ardisikIhlal++;
        
        if (ardisikIhlal >= 2) {
          // İki gün üst üste 300 üzeri ihlal yapıldı, seri koptu.
          if (i === 1) guncelSeri = 0;
          break; 
        } else {
          // 1 günlük tolerans hakkı kullanıldı
          guncelSeri++;
        }
      } else {
        // Hedef aralıkta kalındı, ihlal zinciri sıfırlandı
        ardisikIhlal = 0;
        guncelSeri++;
      }
    }

    setSeriSayisi(guncelSeri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Karşılama Kartı */}
      <View style={styles.welcomeCard}>
        <View>
          <Text style={styles.welcomeSubtitle}>Hoş Geldiniz 👋</Text>
          <Text style={styles.welcomeTitle}>{adSoyad}</Text>
        </View>
        <TouchableOpacity style={styles.profileBadge} onPress={() => navigation.navigate('Profilim')}>
          <Ionicons name="person" size={24} color="#8E24AA" />
        </TouchableOpacity>
      </View>

      {/* Oyunlaştırma - İdeal Şeker Serisi (Streak) Afişi */}
      {seriSayisi > 0 && (
        <View style={styles.streakBanner}>
           <View style={styles.streakIconBox}>
             <Text style={styles.streakFireIcon}>🔥</Text>
           </View>
           <View style={styles.streakTextBox}>
             <Text style={styles.streakTitle}>{seriSayisi} Günlük Kontrol Serisi!</Text>
             <Text style={styles.streakDesc}>Harika gidiyorsun! Kan şekerin kontrol altında.</Text>
           </View>
        </View>
      )}

      {/* Son Ölçüm / Durum Özeti */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name="pulse" size={22} color="#8E24AA" />
          <Text style={styles.statusHeaderText}>Son Sağlık Durumu</Text>
        </View>
        {sonOlcum ? (
          <View style={styles.statusBody}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Son Kan Şekeri</Text>
              <Text style={styles.statusValue}>{sonOlcum.olculen_kan_sekeri} <Text style={{fontSize: 14}}>mg/dL</Text></Text>
            </View>
            <View style={styles.statusDivider}></View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Önerilen İnsülin</Text>
              <Text style={styles.statusValue}>{sonOlcum.onerilen_insulin} <Text style={{fontSize: 14}}>Ünite</Text></Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>Henüz kayıtlı ölçüm bulunmuyor. Yemek analizi veya hızlı ölçüm yaparak başlayın.</Text>
        )}
      </View>

      {/* Hızlı Erişim Menüsü (Grid) */}
      <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
      <View style={styles.gridContainer}>
        
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Yemek Analizi')}>
          <View style={styles.gridIconBox}>
            <Ionicons name="restaurant" size={28} color="#8E24AA" />
          </View>
          <Text style={styles.gridTitle}>Yemek Analizi</Text>
          <Text style={styles.gridDesc}>Fotoğraf çek & doz hesapla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Hızlı Doz')}>
          <View style={styles.gridIconBox}>
            <Ionicons name="medkit" size={28} color="#8E24AA" />
          </View>
          <Text style={styles.gridTitle}>Hızlı Düzeltme</Text>
          <Text style={styles.gridDesc}>Anlık şeker müdahalesi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Geçmişim')}>
          <View style={styles.gridIconBox}>
            <Ionicons name="time" size={28} color="#8E24AA" />
          </View>
          <Text style={styles.gridTitle}>Geçmiş & Grafik</Text>
          <Text style={styles.gridDesc}>Trendleri ve logları incele</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Profilim')}>
          <View style={styles.gridIconBox}>
            <Ionicons name="person-circle" size={28} color="#8E24AA" />
          </View>
          <Text style={styles.gridTitle}>Profil & Ayarlar</Text>
          <Text style={styles.gridDesc}>ICR, ISF ve kişisel bilgiler</Text>
        </TouchableOpacity>

      </View>

      <View style={{height: 30}}></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F0F9', padding: 15 },
  
  welcomeCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, elevation: 3, borderWidth: 1, borderColor: '#E1BEE7' },
  welcomeSubtitle: { fontSize: 13, color: '#777', fontWeight: '600' },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A', marginTop: 2 },
  profileBadge: { width: 45, height: 45, backgroundColor: '#F3E5F5', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CE93D8' },
  
  streakBanner: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 15, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFB74D', elevation: 2 },
  streakIconBox: { width: 50, height: 50, backgroundColor: '#FFE0B2', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  streakFireIcon: { fontSize: 26 },
  streakTextBox: { flex: 1 },
  streakTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 4 },
  streakDesc: { fontSize: 12, color: '#F57C00', fontWeight: '500' },

  statusCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 3, borderWidth: 1, borderColor: '#E1BEE7' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  statusHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#6A1B9A', marginLeft: 8 },
  statusBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { fontSize: 12, color: '#777', marginBottom: 4 },
  statusValue: { fontSize: 20, fontWeight: 'bold', color: '#4A148C' },
  statusDivider: { width: 1, height: 40, backgroundColor: '#E1BEE7' },
  noDataText: { fontSize: 13, color: '#888', textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 15, paddingHorizontal: 5 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#E1BEE7', alignItems: 'center' },
  gridIconBox: { width: 60, height: 60, backgroundColor: '#F3E5F5', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#CE93D8' },
  gridTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4, textAlign: 'center' },
  gridDesc: { fontSize: 11, color: '#777', textAlign: 'center', lineHeight: 14 }
});