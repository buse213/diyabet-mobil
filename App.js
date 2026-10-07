import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AnaSayfaEkrani from './screens/AnaSayfaEkrani';
import AnaEkran from './screens/AnaEkran';
import GecmisEkran from './screens/GecmisEkran';
import ProfilEkran from './screens/ProfilEkran';
import HizliDozEkran from './screens/HizliDozEkran';
import GirisEkrani from './screens/GirisEkrani';
import KayitEkrani from './screens/KayitEkrani';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Ana Sayfa') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Yemek Analizi') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Hızlı Doz') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Geçmişim') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profilim') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8E24AA',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Ana Sayfa" component={AnaSayfaEkrani} />
      <Tab.Screen name="Yemek Analizi" component={AnaEkran} />
      <Tab.Screen name="Hızlı Doz" component={HizliDozEkran} />
      <Tab.Screen name="Geçmişim" component={GecmisEkran} />
      <Tab.Screen name="Profilim" component={ProfilEkran} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const oturumKontrolu = async () => {
      try {
        // ARTIK E-POSTAYA DEĞİL, OTURUM DURUMUNA BAKIYORUZ
        const oturumDurumu = await AsyncStorage.getItem('oturum_durumu');
        if (oturumDurumu === 'aktif') {
          setInitialRoute('MainTabs'); 
        } else {
          setInitialRoute('Giris'); 
        }
      } catch (error) {
        setInitialRoute('Giris');
      }
    };
    oturumKontrolu();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F0F9' }}>
        <ActivityIndicator size="large" color="#8E24AA" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Giris" component={GirisEkrani} />
        <Stack.Screen name="Kayit" component={KayitEkrani} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Profil" component={ProfilEkran} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}