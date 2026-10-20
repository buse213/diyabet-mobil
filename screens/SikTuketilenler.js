import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SikTuketilenler = ({ navigation }) => {
  const [yemekler, setYemekler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const verileriGetir = async () => {
      try {
      // Yeni hali:
const email = await AsyncStorage.getItem('hasta_email');
        
        if (!email) {
          console.error("Kullanıcı e-postası bulunamadı!");
          setYukleniyor(false);
          return;
        }

        // Kendi Render API Gateway adresin ve dinamik email parametresi
        const apiLink = `https://api-gateway-gq75.onrender.com/api/sik-tuketilenler?email=${email}`;
        
        const res = await fetch(apiLink);
        const data = await res.json();
        
        setYemekler(data);
        setYukleniyor(false);

      } catch (err) {
        console.error("Veri çekilemedi:", err);
        setYukleniyor(false);
      }
    };

    verileriGetir();
  }, []);

  const renderYemekKarti = ({ item }) => (
    <TouchableOpacity 
        style={styles.kart}
        onPress={() => console.log(`${item.turkce_isim} seçildi`)}
    >
      <View style={styles.kartIcerik}>
        <Text style={styles.yemekIsmi}>{item.turkce_isim}</Text>
        <Text style={styles.karbonhidrat}>{item.karbonhidrat_miktari}g Karb</Text>
      </View>
      <View style={styles.rozet}>
        <Text style={styles.rozetMetin}>{item.tuketim_sayisi} Kez</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.baslik}>En Çok Tükettiklerin</Text>
      
      {yukleniyor ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={yemekler}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderYemekKarti}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  baslik: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    marginTop: 40,
  },
  kart: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  kartIcerik: {
    flex: 1,
  },
  yemekIsmi: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 5,
  },
  karbonhidrat: {
    fontSize: 15,
    color: '#7F8C8D',
  },
  rozet: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rozetMetin: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
  }
});

export default SikTuketilenler;