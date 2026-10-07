import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print'; // YENİ: PDF Oluşturucu
import * as Sharing from 'expo-sharing'; // YENİ: Paylaşım ekranı

const BACKEND_URL = 'http://10.203.121.146:3000'; // IP adresin
const screenWidth = Dimensions.get("window").width;

export default function GecmisEkrani() {
  const [gecmisVerileri, setGecmisVerileri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grafikModalGörünür, setGrafikModalGörünür] = useState(false);
  const [hastaAd, setHastaAd] = useState(''); // Rapora isim yazdırmak için
  const [hastaEmail, setHastaEmail] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      verileriGetir();
    }, [])
  );

  const verileriGetir = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('hasta_email');
      const ad = await AsyncStorage.getItem('hasta_ad'); // Raporda göstermek için adı da çekiyoruz

      if (ad) setHastaAd(ad);
      
      if (!email) {
          console.error("Kullanıcı e-postası bulunamadı!");
          setLoading(false);
          return;
      }
      
      setHastaEmail(email);

      const response = await axios.get(`${BACKEND_URL}/gecmis`, { 
          params: { email: email } 
      });

      if (response.data.durum === 'basarili') {
        setGecmisVerileri(response.data.veriler);
      }
    } catch (error) {
      console.error("Geçmiş verileri çekilemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const tarihFormatla = (tarihString) => {
    const tarih = new Date(tarihString);
    return `${tarih.getDate()}/${tarih.getMonth() + 1}/${tarih.getFullYear()} ${tarih.getHours()}:${tarih.getMinutes() < 10 ? '0' : ''}${tarih.getMinutes()}`;
  };

  // ==========================================
  // DOKTOR RAPORU OLUŞTURMA (PDF)
  // ==========================================
  const raporIndir = async () => {
    if (gecmisVerileri.length === 0) {
      return Alert.alert("Hata", "Rapor oluşturulacak geçmiş kaydı bulunmuyor.");
    }

    try {
      const bugun = new Date().toLocaleDateString('tr-TR');
      
      // Tablo satırlarını dinamik olarak oluştur
      let tabloSatirlari = '';
      gecmisVerileri.forEach(kayit => {
          // Kan şekeri rengini ayarla (Yüksekse kırmızı, düşükse mavi, normalse yeşil)
          let renk = '#333';
          if (kayit.olculen_kan_sekeri > 140) renk = '#D32F2F'; // Kırmızı (Hiperglisemi)
          else if (kayit.olculen_kan_sekeri < 70 && kayit.olculen_kan_sekeri > 0) renk = '#1976D2'; // Mavi (Hipoglisemi)
          else if (kayit.olculen_kan_sekeri > 0) renk = '#388E3C'; // Yeşil (Normal)

          tabloSatirlari += `
            <tr>
              <td>${tarihFormatla(kayit.tarih)}</td>
              <td>${kayit.yemek_ismi}</td>
              <td>${kayit.alinan_karbonhidrat}g</td>
              <td style="color: ${renk}; font-weight: bold;">${kayit.olculen_kan_sekeri}</td>
              <td>${kayit.onerilen_insulin} Ü</td>
            </tr>
          `;
      });

      // PDF'in Profesyonel HTML Tasarımı
      const htmlIcerik = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #8E24AA; padding-bottom: 10px; margin-bottom: 30px; }
              .title { color: #6A1B9A; font-size: 28px; margin: 0; }
              .subtitle { color: #666; font-size: 16px; margin-top: 5px; }
              .info-box { background-color: #F3E5F5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
              .info-text { margin: 5px 0; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; font-size: 14px; }
              th { background-color: #8E24AA; color: white; padding: 12px; text-align: left; }
              td { border-bottom: 1px solid #ddd; padding: 12px; }
              tr:nth-child(even) { background-color: #fafafa; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">Akıllı Diyabet Asistanı</h1>
              <p class="subtitle">Hasta Klinik Özet Raporu</p>
            </div>
            
            <div class="info-box">
              <p class="info-text"><strong>Hasta Adı Soyadı:</strong> ${hastaAd || 'Belirtilmemiş'}</p>
              <p class="info-text"><strong>E-Posta:</strong> ${hastaEmail}</p>
              <p class="info-text"><strong>Rapor Oluşturulma Tarihi:</strong> ${bugun}</p>
            </div>

            <table>
              <tr>
                <th>Tarih & Saat</th>
                <th>Kayıt Türü / Yemek</th>
                <th>Karb. (g)</th>
                <th>Kan Şekeri (mg/dL)</th>
                <th>Vurulan İnsülin</th>
              </tr>
              ${tabloSatirlari}
            </table>

            <div class="footer">
              Bu rapor Akıllı Diyabet Asistanı mobil uygulaması tarafından doktor bilgilendirmesi amacıyla otomatik olarak üretilmiştir.
            </div>
          </body>
        </html>
      `;

      // HTML'den PDF dosyası oluştur
      const { uri } = await Print.printToFileAsync({
        html: htmlIcerik,
        base64: false
      });

      // Telefonun yerel paylaşım (WhatsApp, E-posta, Dosyalar vb.) menüsünü aç
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Doktor Raporunu Paylaş',
        UTI: 'com.adobe.pdf'
      });

    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Rapor oluşturulurken bir sorun meydana geldi.");
    }
  };

  const grafikIcinVeriHazirla = () => {
    if (gecmisVerileri.length === 0) return { etiketler: ['Yok'], veriler: [0] };
    const sonVeriler = gecmisVerileri.slice(0, 7).reverse();
    
    const etiketler = sonVeriler.map(veri => {
        const t = new Date(veri.tarih);
        return `${t.getHours()}:${t.getMinutes() < 10 ? '0' : ''}${t.getMinutes()}`;
    });
    const veriler = sonVeriler.map(veri => veri.olculen_kan_sekeri);

    return { etiketler, veriler };
  };

  const grafikVerisi = grafikIcinVeriHazirla();

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.foodName}>{item.yemek_ismi}</Text>
        <Text style={styles.dateText}>{tarihFormatla(item.tarih)}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.detailText}>Miktar: <Text style={styles.boldText}>{item.tuketilen_gramaj}g</Text></Text>
        <Text style={styles.detailText}>Alınan Karb: <Text style={styles.boldText}>{item.alinan_karbonhidrat}g</Text></Text>
        <Text style={styles.detailText}>Kan Şekeri: <Text style={styles.bloodSugarText}>{item.olculen_kan_sekeri} mg/dL</Text></Text>
      </View>

      <View style={styles.insulinBadge}>
        <Text style={styles.insulinText}>Uygulanan İnsülin: {item.onerilen_insulin} Ünite</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* BUTONLAR YANYANA EKLENDİ */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.chartButton} onPress={() => setGrafikModalGörünür(true)}>
          <Ionicons name="stats-chart" size={18} color="#8E24AA" />
          <Text style={styles.chartButtonText}>Grafik Göster</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.reportButton} onPress={raporIndir}>
          <Ionicons name="document-text" size={18} color="#fff" />
          <Text style={styles.reportButtonText}>Rapor İndir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8E24AA" style={{ marginTop: 50 }} />
      ) : gecmisVerileri.length === 0 ? (
        <Text style={styles.emptyText}>Henüz bir kayıt bulunmuyor.</Text>
      ) : (
        <FlatList
          data={gecmisVerileri}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={grafikModalGörünür} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Kan Şekeri Değişim Trendi</Text>
          <Text style={styles.modalSubtitle}>Son 7 Ölçüm (Saat Bazlı - mg/dL)</Text>

          <View style={styles.chartWrapper}>
            <LineChart
              data={{
                labels: grafikVerisi.etiketler,
                datasets: [{ data: grafikVerisi.veriler }]
              }}
              width={screenWidth - 20}
              height={260}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(142, 36, 170, ${opacity})`, 
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#6A1B9A" } 
              }}
              bezier
              style={{ 
                marginVertical: 8, 
                borderRadius: 16,
                paddingRight: 40,
                paddingLeft: 15
              }}
            />
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={() => setGrafikModalGörünür(false)}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.closeButtonText}>Kapat ve Listeye Dön</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F0F9', paddingHorizontal: 15, paddingTop: 10 }, 
  
  // YENİ BUTON TASARIMLARI (Yanyana yerleşmesi için)
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  chartButton: { flex: 1, backgroundColor: '#F3E5F5', flexDirection: 'row', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CE93D8', alignItems: 'center', justifyContent: 'center', elevation: 2, marginRight: 8 },
  chartButtonText: { color: '#8E24AA', fontWeight: 'bold', fontSize: 14, marginLeft: 6 }, 
  
  reportButton: { flex: 1, backgroundColor: '#8E24AA', flexDirection: 'row', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3, marginLeft: 8 },
  reportButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },

  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#E1BEE7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  foodName: { fontSize: 18, fontWeight: 'bold', color: '#6A1B9A' }, 
  dateText: { fontSize: 12, color: '#9e9e9e' },
  cardBody: { marginBottom: 15 },
  detailText: { fontSize: 14, color: '#555', marginBottom: 4 },
  boldText: { fontWeight: 'bold', color: '#333' },
  bloodSugarText: { fontWeight: 'bold', color: '#D32F2F' }, 
  insulinBadge: { backgroundColor: '#F3E5F5', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E1BEE7' },
  insulinText: { color: '#8E24AA', fontWeight: 'bold', fontSize: 15 }, 
  modalContainer: { flex: 1, backgroundColor: '#F4F0F9', padding: 20, paddingTop: 40, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1BEE7' },
  closeButton: { marginTop: 40, backgroundColor: '#8E24AA', flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12, elevation: 2, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});