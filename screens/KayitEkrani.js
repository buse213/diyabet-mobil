import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function KayitEkrani({ navigation }) {
    const [ad, setAd] = useState('');
    const [email, setEmail] = useState('');
    const [sifre, setSifre] = useState('');

    const API_URL = 'https://api-gateway-gq75.onrender.com';

    const handleKayit = async () => {
        if (!ad || !email || !sifre) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/kayit`, { ad, email, sifre });

            if (response.data.durum === 'basarili') {
                // ESKİ PROFİL KALINTILARINI TELEFONDAN SİLİYORUZ
                await AsyncStorage.removeItem('kullanici_yas');
                await AsyncStorage.removeItem('kullanici_kilo');
                await AsyncStorage.removeItem('kullanici_diyabetYili');
                await AsyncStorage.removeItem('hasta_icr');
                await AsyncStorage.removeItem('hasta_isf');

                Alert.alert('Başarılı', 'Kayıt başarılı! Lütfen giriş yapınız.', [
                    { text: 'Giriş Yap', onPress: () => navigation.replace('Giris') } 
                ]);
            } else {
                Alert.alert('Hata', response.data.mesaj);
            }
        } catch (error) {
            // GERÇEK HATAYI YAKALAMA (Hata Ayıklama İçin)
            Alert.alert('Gerçek Hata!', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.logoContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="person-add" size={45} color="#BA68C8" />
                        </View>
                        <Text style={styles.title}>Akıllı Diyabet Asistanı</Text>
                        <Text style={styles.subtitle}>Yeni Bir Hesap Oluşturun</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Ad Soyad</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#8E24AA" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Örn: Buse Çam" value={ad} onChangeText={setAd} />
                        </View>

                        <Text style={styles.label}>E-Posta Adresi</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#8E24AA" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Örn: ornek@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        </View>

                        <Text style={styles.label}>Şifre</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#8E24AA" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="••••••••" value={sifre} onChangeText={setSifre} secureTextEntry />
                        </View>

                        <TouchableOpacity style={styles.registerBtn} onPress={handleKayit}>
                            <Text style={styles.registerBtnText}>KAYIT OL</Text>
                        </TouchableOpacity>

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginText}>Zaten bir hesabınız var mı? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Giris')}>
                                <Text style={styles.loginLink}>Giriş Yap</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F0F9' },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    logoContainer: { alignItems: 'center', marginBottom: 30 },
    iconCircle: { width: 90, height: 90, backgroundColor: '#F3E5F5', borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#CE93D8' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 5 },
    subtitle: { fontSize: 16, color: '#666' },
    formContainer: { width: '100%', backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 8, marginLeft: 5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBF8FD', borderWidth: 1, borderColor: '#E1BEE7', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 15, color: '#333' },
    registerBtn: { backgroundColor: '#8E24AA', borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2 },
    registerBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    loginText: { color: '#666', fontSize: 14 },
    loginLink: { color: '#8E24AA', fontSize: 14, fontWeight: 'bold' },
});