import React from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const LandingScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.brandName}>Rentify</Text>
                        <Text style={styles.tagline}>Drive the world's finest vehicles.</Text>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.buttonText}>Get Started</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.primaryButton} 
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.buttonText}>I already have an account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => navigation.navigate('ClientApp')}
                        >
                            <Text style={styles.buttonText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
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
        color: '#fff'
    },
    tagline: {
        fontSize: 18,
        color: '#fff',
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
        backgroundColor: '#a66eff' 
    },
    secondaryButton: { 
        height: 60, 
        borderRadius: 15, 
        borderWidth: 2, 
        borderColor: '#fff', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    buttonText: { 
        color: '#fff', 
        fontSize: 18, 
        fontWeight: '600' 
    }
});

export default LandingScreen;
