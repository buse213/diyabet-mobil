import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SikTuketilenler = ({ navigation }) => {
  const [yemekler, setYemekler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const verileriGetir = async () => {
      try {
        const email = await AsyncStorage.getItem('hasta_email');
        
        if (!email) {
          console.error("Kullanıcı e-postası bulunamadı!");
          setYukleniyor(false);
          return;
        }

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
        style={styles.card}
        onPress={() => console.log(`${item.turkce_isim} seçildi`)}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="restaurant-outline" size={24} color="#8E24AA" />
        </View>
        <Text style={styles.foodName}>{item.turkce_isim}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.tuketim_sayisi} Kez</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>En Çok Tükettiklerin</Text>
      
      {yukleniyor ? (
        <ActivityIndicator size="large" color="#8E24AA" style={{ marginTop: 50 }} />
      ) : yemekler.length === 0 ? (
        <Text style={styles.emptyText}>Henüz sık tüketilen bir yemek bulunmuyor.</Text>
      ) : (
        <FlatList
          data={yemekler}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderYemekKarti}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F0F9', // Diğer sayfalardaki ortak arkaplan
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6A1B9A', // Ortak koyu mor başlık rengi
    marginBottom: 20,
    marginTop: 20,
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16, // Ortak köşeli hatlar
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E1BEE7', // İnce açık mor çerçeve
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#F3E5F5',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  foodName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2C3E50',
    flexShrink: 1, // Uzun isimlerin taşmasını engeller
  },
  badge: {
    backgroundColor: '#F3E5F5', // Ortak açık mor arkaplan
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CE93D8',
  },
  badgeText: {
    color: '#8E24AA', // Ortak vurgu moru
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  }
});

export default SikTuketilenler;