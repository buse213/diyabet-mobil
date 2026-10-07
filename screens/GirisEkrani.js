import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function GirisEkrani({ navigation }) { 
    const [email, setEmail] = useState('');
    const [sifre, setSifre] = useState('');

    const API_URL = 'http://10.203.121.146:3000'; 

    const handleGiris = async () => {
        if (!email || !sifre) {
            Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin.');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/giris`, { email, sifre });

            if (response.data.durum === 'basarili') {
                const kullanici = response.data.kullanici;

                await AsyncStorage.setItem('oturum_durumu', 'aktif');
                await AsyncStorage.setItem('hasta_ad', kullanici.ad || '');
                await AsyncStorage.setItem('hasta_email', kullanici.email || '');
                
                // VERİTABANINDA BİLGİ VARSA TELEFONA YAZ, BOŞSA TELEFONDAN SİL
                if(kullanici.yas) await AsyncStorage.setItem('kullanici_yas', String(kullanici.yas));
                else await AsyncStorage.removeItem('kullanici_yas');

                if(kullanici.kilo) await AsyncStorage.setItem('kullanici_kilo', String(kullanici.kilo));
                else await AsyncStorage.removeItem('kullanici_kilo');

                if(kullanici.diyabet_yili) await AsyncStorage.setItem('kullanici_diyabetYili', String(kullanici.diyabet_yili));
                else await AsyncStorage.removeItem('kullanici_diyabetYili');

                if(kullanici.icr) await AsyncStorage.setItem('hasta_icr', String(kullanici.icr));
                else await AsyncStorage.removeItem('hasta_icr');

                if(kullanici.isf) await AsyncStorage.setItem('hasta_isf', String(kullanici.isf));
                else await AsyncStorage.removeItem('hasta_isf');

                if (!kullanici.icr || !kullanici.isf) {
                    navigation.replace('Profil', { isNewUser: true });
                } else {
                    navigation.replace('MainTabs'); 
                }
            } else {
                Alert.alert('Hata', response.data.mesaj);
            }
        } catch (error) {
            const mesaj = error.response?.data?.mesaj || 'Giriş sırasında sunucuya ulaşılamadı.';
            Alert.alert('Hata', mesaj);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.logoContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="medical" size={50} color="#BA68C8" />
                        </View>
                        <Text style={styles.title}>Akıllı Diyabet Asistanı</Text>
                        <Text style={styles.subtitle}>Tekrar Hoş Geldiniz</Text>
                    </View>

                    <View style={styles.formContainer}>
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

                        <TouchableOpacity style={styles.loginBtn} onPress={handleGiris}>
                            <Text style={styles.loginBtnText}>GİRİŞ YAP</Text>
                        </TouchableOpacity>

                        <View style={styles.registerContainer}>
                            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Kayit')}>
                                <Text style={styles.registerLink}>Kayıt Ol</Text>
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
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    iconCircle: { width: 90, height: 90, backgroundColor: '#F3E5F5', borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#CE93D8' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 5 },
    subtitle: { fontSize: 16, color: '#666' },
    formContainer: { width: '100%', backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 8, marginLeft: 5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBF8FD', borderWidth: 1, borderColor: '#E1BEE7', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, fontSize: 15, color: '#333' },
    loginBtn: { backgroundColor: '#8E24AA', borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2 },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    registerText: { color: '#666', fontSize: 14 },
    registerLink: { color: '#8E24AA', fontSize: 14, fontWeight: 'bold' },
});