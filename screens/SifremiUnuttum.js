import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

export default function SifremiUnuttum({ navigation }) {
    const [email, setEmail] = useState('');
    const API_URL = 'https://api-gateway-gq75.onrender.com';

    const mailGonder = async () => {
        if (!email) {
            Alert.alert("Uyarı", "Lütfen şifre sıfırlama bağlantısı almak için kayıtlı e-posta adresinizi girin.");
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/sifremi-unuttum`, { email });
            
            if (response.data.durum === 'basarili') {
                Alert.alert("Başarılı", response.data.mesaj, [
                    { text: "Tamam", onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            const mesaj = error.response?.data?.mesaj || 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.';
            Alert.alert("Hata", mesaj);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Geri tuşu sol üstte sabit kalacak */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#6A1B9A" />
                </TouchableOpacity>
            </View>

            {/* Geri kalan içerik sayfanın tam ortasına hizalanacak */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="lock-closed" size={45} color="#BA68C8" />
                    </View>
                    <Text style={styles.title}>Şifremi Unuttum</Text>
                    <Text style={styles.description}>
                        Hesabınıza bağlı e-posta adresini girin. Size yeni bir şifre belirlemeniz için bağlantı göndereceğiz.
                    </Text>

                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#8E24AA" style={styles.inputIcon} />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Örn: ornek@email.com" 
                            value={email} 
                            onChangeText={setEmail} 
                            keyboardType="email-address" 
                            autoCapitalize="none" 
                        />
                    </View>

                    <TouchableOpacity style={styles.sendBtn} onPress={mailGonder}>
                        <Text style={styles.sendBtnText}>Sıfırlama Bağlantısı Gönder</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F0F9' },
    header: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
    backButton: { padding: 5 },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    iconCircle: { width: 80, height: 80, backgroundColor: '#F3E5F5', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#CE93D8' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 10, textAlign: 'center' },
    description: { fontSize: 15, color: '#666', marginBottom: 30, lineHeight: 22, textAlign: 'center' },
    inputWrapper: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBF8FD', borderWidth: 1, borderColor: '#E1BEE7', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 55, fontSize: 15, color: '#333' },
    sendBtn: { width: '100%', backgroundColor: '#8E24AA', borderRadius: 12, height: 55, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    sendBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});