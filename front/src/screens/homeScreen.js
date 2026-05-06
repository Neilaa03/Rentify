import React, { useState } from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const HomeScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('Explore');

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.overlay}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.logo}>Rentify</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.headerIcon}>
                                <Ionicons name="notifications" size={28} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.logoutButton}
                                onPress={() => navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Landing' }],
                                })}
                            >
                                <Ionicons name="log-out" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Main Content */}
                    <ScrollView 
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.greeting}>
                            <Text style={styles.mainTitle}>Find your drive</Text>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#666" />
                            <Text style={styles.searchPlaceholder}>Search vehicle or location...</Text>
                        </View>

                        {/* Filters */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.filtersContainer}
                        >
                            <View style={[styles.filterChip, styles.activeFilter]}>
                                <Ionicons name="apps" size={18} color="#fff" />
                                <Text style={styles.filterText}>All</Text>
                            </View>
                            <View style={styles.filterChip}>
                                <Ionicons name="car" size={18} color="#666" />
                                <Text style={[styles.filterText, { color: '#666' }]}>Sedan</Text>
                            </View>
                            <View style={styles.filterChip}>
                                <Ionicons name="bus" size={18} color="#666" />
                                <Text style={[styles.filterText, { color: '#666' }]}>SUV</Text>
                            </View>
                            <View style={styles.filterChip}>
                                <Ionicons name="sparkles" size={18} color="#666" />
                                <Text style={[styles.filterText, { color: '#666' }]}>Luxury</Text>
                            </View>
                        </ScrollView>


                        <View style={{ height: 20 }} />
                    </ScrollView>
                </SafeAreaView>

                {/* Footer Navigation */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.footerTab}
                        onPress={() => setActiveTab('Explore')}
                    >
                        <Ionicons
                            name="search" 
                            size={24} 
                            color={activeTab === 'Explore' ? COLORS.primary : '#666'} 
                        />
                        <Text style={[styles.tabLabel, { color: activeTab === 'Explore' ? COLORS.primary : '#666' }]}>
                            Explore
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.footerTab}
                        onPress={() => setActiveTab('Bookings')}
                    >
                        <Ionicons 
                            name="calendar" 
                            size={24} 
                            color={activeTab === 'Bookings' ? COLORS.primary : '#666'} 
                        />
                        <Text style={[styles.tabLabel, { color: activeTab === 'Bookings' ? COLORS.primary : '#666' }]}>
                            Bookings
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.footerTab}
                        onPress={() => setActiveTab('Saved')}
                    >
                        <Ionicons 
                            name="heart" 
                            size={24} 
                            color={activeTab === 'Saved' ? COLORS.primary : '#666'} 
                        />
                        <Text style={[styles.tabLabel, { color: activeTab === 'Saved' ? COLORS.primary : '#666' }]}>
                            Saved
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.footerTab}
                        onPress={() => setActiveTab('Profile')}
                    >
                        <Ionicons 
                            name="person" 
                            size={24} 
                            color={activeTab === 'Profile' ? COLORS.primary : '#666'} 
                        />
                        <Text style={[styles.tabLabel, { color: activeTab === 'Profile' ? COLORS.primary : '#666' }]}>
                            Profile
                        </Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1 },
    overlay: { 
        flex: 1, 
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    logo: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        padding: 8,
        marginRight: 8,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingBottom: 80,
    },
    greeting: {
        marginBottom: 20,
    },
    greetingText: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 4,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    searchPlaceholder: {
        marginLeft: 12,
        color: '#666',
        fontSize: 14,
        flex: 1,
    },
    filtersContainer: {
        marginBottom: 24,
        paddingBottom: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    activeFilter: {
        backgroundColor: '#003d7a',
        borderColor: '#003d7a',
    },
    filterText: {
        marginLeft: 6,
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    featuredCard: {
        backgroundColor: '#003d7a',
        borderRadius: 16,
        padding: 20,
        position: 'relative',
    },
    featuredBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    featuredContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    featuredTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    featuredLocation: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    priceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ff6b35',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    priceText: {
        color: '#fff',
        fontWeight: '600',
        marginRight: 8,
    },
    vehicleCard: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    vehicleImage: {
        height: 180,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleInfo: {
        padding: 16,
    },
    vehicleName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    vehicleDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    vehicleLocation: {
        fontSize: 12,
        color: '#aaa',
        marginLeft: 4,
        marginRight: 12,
    },
    rating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    ratingText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
        marginLeft: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerTab: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    tabLabel: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '500',
    },
});

export default HomeScreen;
