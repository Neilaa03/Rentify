import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import ListingCard from '../../components/cards/ListingCard';
import MessageIconButton from '../../components/messaging/MessageIconButton';
import NotificationIconButton from '../../components/notifications/NotificationIconButton';
import { getListings } from '../../services/listings';
import { useFavorites } from '../../contexts/FavoritesContext';
import storage from '../../utils/storage';

const HomeScreen = ({ navigation, route }) => {
    const [activeTab, setActiveTab] = useState('Accueil');
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState('Tous');
    const [activeSort, setActiveSort] = useState('Populaire');
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { isFavorite, toggleFavorite } = useFavorites();
    const [showPhoneReminder, setShowPhoneReminder] = useState(false);
    const [phoneReminderDismissedThisSession, setPhoneReminderDismissedThisSession] = useState(false);

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

    useEffect(() => {
        loadListings();
    }, []);

    const hydratePhoneReminder = async () => {
            const cached = await storage.getItemAsync('userProfile');
            if (!cached) return;
            try {
                const profile = JSON.parse(cached);
                const phone = String(profile?.phone || '').trim();
                const provider = String(profile?.authProvider || profile?.auth_provider || '').toLowerCase();
                const isGoogleConnected = provider === 'google' || provider === 'hybrid';

                if (phone || !isGoogleConnected) {
                    setShowPhoneReminder(false);
                    return;
                }

                setShowPhoneReminder(!phoneReminderDismissedThisSession);
            } catch {
                // ignore
            }
    };

    useEffect(() => {
        hydratePhoneReminder();
        const unsub = navigation?.addListener?.('focus', hydratePhoneReminder);
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [navigation]);

    const goToPhoneInProfile = () => {
        const parent = navigation?.getParent?.();
        if (parent?.navigate) {
            parent.navigate('ProfileTab', { screen: 'Profile', params: { openPersonalInfo: true } });
            return;
        }
        navigation.navigate('Profile', { openPersonalInfo: true });
    };

    const dismissPhoneReminder = async () => {
        setShowPhoneReminder(false);
        setPhoneReminderDismissedThisSession(true);
    };

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
                source={require('../../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
              >
                <SafeAreaView style={styles.overlay}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>Tous les véhicules</Text>
                        <View style={styles.headerRight}>
                            <NotificationIconButton navigation={navigation} style={styles.notificationButton} iconSize={24} />
                            <MessageIconButton navigation={navigation} style={styles.logoutButton} iconSize={24} />
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

                        {showPhoneReminder && (
                            <View style={styles.reminderCard}>
                                <View style={styles.reminderTopRow}>
                                    <View style={styles.reminderLeft}>
                                        <View style={styles.reminderIcon}>
                                            <Ionicons name="call-outline" size={16} color="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.reminderTitle}>Ajoute ton numero</Text>
                                            <Text style={styles.reminderSubtitle}>Pour faciliter les reservations et le contact.</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={dismissPhoneReminder} style={styles.reminderDismiss} accessibilityRole="button">
                                        <Ionicons name="close" size={16} color="#cdd3ff" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={goToPhoneInProfile} style={styles.reminderAction} activeOpacity={0.85}>
                                    <Text style={styles.reminderActionText}>Definir mon numero</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

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
                                isFavorite={isFavorite(listing.id)}
                                onToggleFavorite={() => toggleFavorite(listing.id)}
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
    reminderCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.22)',
        backgroundColor: 'rgba(23, 26, 54, 0.9)',
        padding: 12,
        marginBottom: 12,
    },
    reminderTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    reminderLeft: { flexDirection: 'row', gap: 10, flex: 1, paddingRight: 10 },
    reminderIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(108, 77, 255, 0.55)',
        borderWidth: 1,
        borderColor: 'rgba(143, 108, 255, 0.7)',
    },
    reminderDismiss: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    reminderTitle: { color: '#f4f6ff', fontWeight: '800', fontSize: 13, marginBottom: 2 },
    reminderSubtitle: { color: '#9aa3cf', fontSize: 12, lineHeight: 16 },
    reminderAction: {
        marginTop: 10,
        height: 40,
        borderRadius: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(108, 77, 255, 0.35)',
        borderWidth: 1,
        borderColor: 'rgba(143, 108, 255, 0.65)',
    },
    reminderActionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});

export default HomeScreen;
