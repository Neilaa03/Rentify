import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import ListingCard from '../components/cards/ListingCard';
import { getListings } from '../services/listings';
import { getNotificationUnreadCount } from '../services/notifications';

const HomeScreen = ({ navigation, route }) => {
    const [activeTab, setActiveTab] = useState('Accueil');
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState('Tous');
    const [activeSort, setActiveSort] = useState('Populaire');
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notificationLoading, setNotificationLoading] = useState(false);

    const filterOptions = [
        'Tous',
        'Boîte: Auto',
        'Boîte: Manuelle',
        'Carburant: Essence',
        'Carburant: Diesel',
    ];
    const sortOptions = ['Populaire', 'Prix ↑', 'Prix ↓', 'Note'];
    const [showFilterOptions, setShowFilterOptions] = useState(false);
    const [showSortOptions, setShowSortOptions] = useState(false);

    const loadListings = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getListings();
            setListings(data);
        } catch (err) {
            setError(err.message || 'Impossible de charger les annonces');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUnreadNotifications = async () => {
        try {
            setNotificationLoading(true);
            const count = await getNotificationUnreadCount();
            setUnreadNotifications(count);
        } catch (err) {
            console.warn('Failed to load notification count:', err);
            setUnreadNotifications(0);
        } finally {
            setNotificationLoading(false);
        }
    };

    useEffect(() => {
        loadListings();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUnreadNotifications();
        }, [])
    );

    const filteredListings = useMemo(() => listings
        .filter((listing) => {
            const normalizedSearch = searchValue.trim().toLowerCase();
            const matchSearch =
                normalizedSearch.length === 0 ||
                `${listing.brand} ${listing.model} ${listing.city}`.toLowerCase().includes(normalizedSearch);

            const matchFilter =
                activeFilter === 'Tous' ||
                (activeFilter === 'Boîte: Auto' && listing.transmission.toLowerCase() === 'auto') ||
                (activeFilter === 'Boîte: Manuelle' && listing.transmission.toLowerCase() === 'manuelle') ||
                (activeFilter === 'Carburant: Essence' && listing.fuel.toLowerCase() === 'essence') ||
                (activeFilter === 'Carburant: Diesel' && listing.fuel.toLowerCase() === 'diesel');

            return matchSearch && matchFilter;
        })
        .sort((a, b) => {
            if (activeSort === 'Prix ↑') return a.pricePerDay - b.pricePerDay;
            if (activeSort === 'Prix ↓') return b.pricePerDay - a.pricePerDay;
            if (activeSort === 'Note') return b.rating - a.rating;
            return b.rating - a.rating;
        }), [listings, searchValue, activeFilter, activeSort]);

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>Tous les véhicules</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.notificationButton}
                                onPress={() => navigation.navigate('NotificationScreen')}
                            >
                                <Ionicons name="notifications-outline" size={24} color="#fff" />
                                {unreadNotifications > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationBadgeText}>
                                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerIcon}>
                                <Ionicons name="heart-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.logoutButton}
                                onPress={() => navigation.navigate('Landing')}
                            >
                                <Ionicons name="log-out" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView 
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={20} color="#9aa0c8" />
                            <TextInput
                                value={searchValue}
                                onChangeText={setSearchValue}
                                placeholder="Rechercher une voiture ou une ville"
                                placeholderTextColor="#7c82ab"
                                style={styles.searchInput}
                            />
                        </View>

                        <View style={styles.actionsRow}>
                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => {
                                        setShowFilterOptions((prev) => !prev);
                                        setShowSortOptions(false);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="funnel-outline" size={16} color="#d6dbff" />
                                    <Text style={styles.actionButtonText}>Filtrer: {activeFilter}</Text>
                                </TouchableOpacity>
                                {showFilterOptions && (
                                    <View style={styles.dropdown}>
                                        {filterOptions.map((option) => {
                                            const isActive = option === activeFilter;
                                            return (
                                                <TouchableOpacity
                                                    key={option}
                                                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                                                    onPress={() => {
                                                        setActiveFilter(option);
                                                        setShowFilterOptions(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                                                        {option}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => {
                                        setShowSortOptions((prev) => !prev);
                                        setShowFilterOptions(false);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="swap-vertical-outline" size={16} color="#d6dbff" />
                                    <Text style={styles.actionButtonText}>Trier: {activeSort}</Text>
                                </TouchableOpacity>
                                {showSortOptions && (
                                    <View style={styles.dropdown}>
                                        {sortOptions.map((option) => {
                                            const isActive = option === activeSort;
                                            return (
                                                <TouchableOpacity
                                                    key={option}
                                                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                                                    onPress={() => {
                                                        setActiveSort(option);
                                                        setShowSortOptions(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                                                        {option}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </View>

                        {isLoading && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>Chargement des vehicules...</Text>
                            </View>
                        )}
                        {!isLoading && error ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>Erreur</Text>
                                <Text style={styles.emptySubtitle}>{error}</Text>
                                <TouchableOpacity style={styles.retryButton} onPress={loadListings}>
                                    <Text style={styles.retryButtonText}>Reessayer</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {!isLoading && !error && filteredListings.map((listing) => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                onPress={() => navigation.navigate('ListingDetails', { listing })}
                            />
                        ))}
                        {!isLoading && !error && filteredListings.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>Aucun véhicule trouvé</Text>
                                <Text style={styles.emptySubtitle}>Essaie une autre recherche ou un autre filtre.</Text>
                            </View>
                        )}
                        <View style={{ height: 8 }} />
                    </ScrollView>
                </SafeAreaView>
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
        backgroundColor: 'rgba(2,3,14,0.62)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        paddingTop: 10,
    },
    logo: {
        fontSize: 33 / 2,
        fontWeight: '700',
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
    notificationButton: {
        padding: 8,
        marginRight: 8,
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff4f5e',
        paddingHorizontal: 4,
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 90,
    },
    searchBar: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.22)',
        backgroundColor: 'rgba(18, 21, 46, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    searchInput: {
        marginLeft: 10,
        color: '#f4f6ff',
        flex: 1,
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    actionBlock: {
        width: '48.5%',
        position: 'relative',
        zIndex: 4,
    },
    actionButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.22)',
        backgroundColor: 'rgba(15, 18, 40, 0.85)',
        minHeight: 42,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtonText: {
        marginLeft: 6,
        color: '#d6dbff',
        fontWeight: '600',
        fontSize: 12,
        flexShrink: 1,
    },
    dropdown: {
        position: 'absolute',
        top: 46,
        left: 0,
        right: 0,
        backgroundColor: '#181b3d',
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.24)',
        borderRadius: 12,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(145, 152, 229, 0.14)',
    },
    dropdownItemActive: {
        backgroundColor: 'rgba(108, 77, 255, 0.35)',
    },
    dropdownItemText: {
        color: '#b5bce3',
        fontSize: 13,
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: '#fff',
    },
    emptyState: {
        marginTop: 12,
        marginBottom: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.2)',
        backgroundColor: 'rgba(13, 16, 35, 0.82)',
        padding: 14,
    },
    emptyTitle: {
        color: '#f4f6ff',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    emptySubtitle: {
        color: '#949cc7',
        fontSize: 12,
    },
    retryButton: {
        marginTop: 12,
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(108, 77, 255, 0.35)',
        borderWidth: 1,
        borderColor: 'rgba(143, 108, 255, 0.65)',
    },
    retryButtonText: {
        color: '#f4f6ff',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default HomeScreen;
