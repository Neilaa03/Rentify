import React from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';import { useTranslation } from "react-i18next";
import { useTheme } from '../../contexts/ThemeContext';


const LandingScreen = ({ navigation }) => {const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
            <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.background}
        resizeMode="cover">
        
                <SafeAreaView style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                    <View style={styles.header}>
                        <Text style={[styles.brandName, { color: colors.text }]}>{t("screens.client.landingscreen.rentify")}</Text>
                        <Text style={[styles.tagline, { color: colors.textMuted }]}>{t("screens.client.landingscreen.driveTheWorldsFinestVehicles")}</Text>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Register')}>
              
                            <Text style={[styles.buttonText, { color: colors.white }]}>{t("screens.client.landingscreen.getStarted")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.secondary }]}
              onPress={() => navigation.navigate('Login')}>
              
                            <Text style={[styles.buttonText, { color: colors.white }]}>{t("screens.client.landingscreen.iAlreadyHaveAnAccount")}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('ClientApp')}>
              
                            <Text style={[styles.buttonText, { color: colors.text }]}>{t("screens.client.landingscreen.skipForNow")}</Text>
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
    fontSize: 48,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 18,
    marginTop: 10,
    opacity: 0.8
  },
  footer: {
    marginBottom: 20
  },
  primaryButton: {
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    height: 60,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600'
  }
});

export default LandingScreen;
