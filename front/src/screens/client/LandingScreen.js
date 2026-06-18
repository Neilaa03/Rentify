import React from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';import { useTranslation } from "react-i18next";
import { useAuth } from '../../contexts/AuthContext';


const LandingScreen = ({ navigation }) => {const { t } = useTranslation();
  const { clearSession } = useAuth();

  const skipForNow = async () => {
    await clearSession();
    navigation.navigate('ClientApp');
  };

  return (
    <View style={styles.container}>
            <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.background}
        resizeMode="cover">
        
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.brandName}>{t("screens.client.landingscreen.rentify")}</Text>
                        <Text style={styles.tagline}>{t("screens.client.landingscreen.driveTheWorldsFinestVehicles")}</Text>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Register')}>
              
                            <Text style={styles.buttonText}>{t("screens.client.landingscreen.getStarted")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}>
              
                            <Text style={styles.buttonText}>{t("screens.client.landingscreen.iAlreadyHaveAnAccount")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
              style={styles.secondaryButton}
              onPress={skipForNow}>
              
                            <Text style={styles.buttonText}>{t("screens.client.landingscreen.skipForNow")}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        </View>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  background: {
    flex: 1
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  header: {
    marginTop: 40
  },
  brandName: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#fff',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 10,
    opacity: 0.8
  },
  footer: {
    marginBottom: 20
  },
  primaryButton: {
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#a66eff',
  },
  secondaryButton: {
    height: 72,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700'
  }
});

export default LandingScreen;
