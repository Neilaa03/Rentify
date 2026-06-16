import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ImageBackground, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import ListingCard from '../../components/cards/ListingCard';
import MessageIconButton from '../../components/messaging/MessageIconButton';
import NotificationIconButton from '../../components/notifications/NotificationIconButton';
import AssistantWidget from '../../components/assistant/AssistantWidget';
import CustomCalendar from '../../components/reservation/CustomCalendar';
import { getListings } from '../../services/listings';
import { useFavorites } from '../../contexts/FavoritesContext';
import storage from '../../utils/storage';
import { parseLocalDate, formatLocalYmd } from '../../utils/reservationUtils';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatDateLabel = (value) => {
    if (!value) return '';
    const parsed = parseLocalDate(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: 'short' });
};

const getListingSearchText = (listing) => [
    listing?.brand,
    listing?.model,
    listing?.city,
    listing?.country,
    listing?.pickupAddress,
    listing?.title,
].filter(Boolean).join(' ').toLowerCase();

const getListingCityText = (listing) => String(listing?.city || '').trim().toLowerCase();

const getListingDateWindow = (listing) => {
    const from = listing?.availableFrom || listing?.available_from || null;
    const to = listing?.availableTo || listing?.available_to || null;
    return { from, to };
};

const matchesDateRange = (listing, startDate, endDate) => {
    if (!startDate && !endDate) return true;

    const { from, to } = getListingDateWindow(listing);
    if (!from && !to) return true;

    const rangeStart = parseLocalDate(startDate || endDate);
    const rangeEnd = parseLocalDate(endDate || startDate);
    const availabilityStart = parseLocalDate(from);
    const availabilityEnd = parseLocalDate(to);

    if (!rangeStart || !rangeEnd) return true;

    if (availabilityStart && availabilityEnd) {
        return availabilityStart <= rangeEnd && availabilityEnd >= rangeStart;
    }

    if (availabilityStart) {
        return availabilityStart <= rangeEnd;
    }

    if (availabilityEnd) {
        return availabilityEnd >= rangeStart;
    }

    return true;
};

const sortListingsForDisplay = (items) => [...items].sort((a, b) => {
    const priceA = Number(a?.pricePerDay || 0);
    const priceB = Number(b?.pricePerDay || 0);
    if (priceA !== priceB) return priceA - priceB;
    if (a.availableFrom && b.availableFrom && a.availableFrom !== b.availableFrom) {
        return a.availableFrom.localeCompare(b.availableFrom);
    }
    return (b.rating || 0) - (a.rating || 0);
});

const HomeScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState('home');
    const [searchValue, setSearchValue] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeSort, setActiveSort] = useState('popular');
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { isFavorite, toggleFavorite } = useFavorites();
    const [showPhoneReminder, setShowPhoneReminder] = useState(false);
    const [phoneReminderDismissedThisSession, setPhoneReminderDismissedThisSession] = useState(false);

    const filterOptions = [
        { id: 'all', label: t('common.legacyHome.all') },
        { id: 'auto', label: t('common.legacyHome.gearboxAuto') },
        { id: 'manual', label: t('common.legacyHome.gearboxManual') },
        { id: 'gasoline', label: t('common.legacyHome.fuelGasoline') },
        { id: 'diesel', label: t('common.legacyHome.fuelDiesel') },
    ];
    const sortOptions = [
        { id: 'popular', label: t('common.legacyHome.popular') },
        { id: 'priceAsc', label: t('common.legacyHome.priceAsc') },
        { id: 'priceDesc', label: t('common.legacyHome.priceDesc') },
        { id: 'rating', label: t('common.legacyHome.rating') },
    ];
    const activeFilterLabel = filterOptions.find((option) => option.id === activeFilter)?.label || filterOptions[0].label;
    const activeSortLabel = sortOptions.find((option) => option.id === activeSort)?.label || sortOptions[0].label;
    const [showFilterOptions, setShowFilterOptions] = useState(false);
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [placeValue, setPlaceValue] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const loadListings = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await getListings();
            setListings(data);
        } catch (err) {
            setError(err.message || t('common.legacyHome.loadListingsError'));
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

    const clearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const handleCalendarDayPress = (day) => {
        const dateStr = day?.dateString;
        if (!dateStr) return;

        if (!startDate || (startDate && endDate)) {
            setStartDate(dateStr);
            setEndDate(null);
            return;
        }

        const pressedDate = parseLocalDate(dateStr);
        const startLocal = parseLocalDate(startDate);
        if (!pressedDate || !startLocal) return;

        if (pressedDate < startLocal) {
            setStartDate(dateStr);
            setEndDate(startDate);
            return;
        }

        setEndDate(dateStr);
    };

    const markedDates = useMemo(() => {
        const marked = {};
        if (startDate) {
            marked[startDate] = {
                selected: true,
                startingDay: true,
                endingDay: !endDate,
                color: '#6C4DFF',
                textColor: '#fff',
            };
        }
        if (startDate && endDate) {
            const current = parseLocalDate(startDate);
            const final = parseLocalDate(endDate);
            if (current && final) {
                while (current <= final) {
                    const dateStr = formatLocalYmd(current);
                    if (dateStr) {
                        marked[dateStr] = {
                            selected: true,
                            color: '#6C4DFF',
                            textColor: '#fff',
                            startingDay: dateStr === startDate,
                            endingDay: dateStr === endDate,
                            inRange: dateStr !== startDate && dateStr !== endDate,
                        };
                    }
                    current.setDate(current.getDate() + 1);
                }
            }
        }
        return marked;
    }, [startDate, endDate]);

    const groupedListings = useMemo(() => {
        const normalizedSearch = normalizeText(searchValue);
        const normalizedPlace = normalizeText(placeValue);

        const groupedByCar = new Map();

        listings.forEach((listing) => {
            const groupKey = listing?.carId || listing?.id;
            if (!groupKey) return;

            const current = groupedByCar.get(groupKey) || {
                carId: listing.carId || listing.id,
                brand: listing.brand,
                model: listing.model,
                year: listing.year,
                category: listing.category,
                car: listing.car,
                images: listing.images,
                offers: [],
            };

            current.offers.push(listing);
            groupedByCar.set(groupKey, current);
        });

        return Array.from(groupedByCar.values())
            .map((group) => {
                const offersMatchingCriteria = group.offers.filter((offer) => {
                    const searchMatch =
                        normalizedSearch.length === 0 ||
                        getListingSearchText(offer).includes(normalizedSearch);

                    const placeMatch =
                        normalizedPlace.length === 0 ||
                        getListingCityText(offer).includes(normalizedPlace);

                    const filterMatch =
                        activeFilter === 'all' ||
                        (activeFilter === 'auto' && normalizeText(offer.transmission) === 'auto') ||
                        (activeFilter === 'manual' && normalizeText(offer.transmission) === 'manuelle') ||
                        (activeFilter === 'gasoline' && normalizeText(offer.fuel) === 'essence') ||
                        (activeFilter === 'diesel' && normalizeText(offer.fuel) === 'diesel');

                    const dateMatch = matchesDateRange(offer, startDate, endDate);
                    return searchMatch && placeMatch && filterMatch && dateMatch;
                });

                const visibleOffers = offersMatchingCriteria.length > 0 ? offersMatchingCriteria : [];
                const sortedVisibleOffers = sortListingsForDisplay(visibleOffers.length > 0 ? visibleOffers : group.offers);
                const selectedOffer = sortedVisibleOffers[0] || group.offers[0];

                if (!selectedOffer || offersMatchingCriteria.length === 0 && (normalizedSearch.length > 0 || normalizedPlace.length > 0 || startDate || endDate || activeFilter !== 'all')) {
                    return null;
                }

                const allOffersSorted = sortListingsForDisplay(group.offers);
                const fallbackOffer = sortedVisibleOffers[0] || allOffersSorted[0] || selectedOffer;

                return {
                    ...group,
                    id: group.carId || fallbackOffer?.id,
                    offers: allOffersSorted,
                    selectedOffer: fallbackOffer,
                    offerCount: allOffersSorted.length,
                    matchingOfferCount: offersMatchingCriteria.length,
                    image: fallbackOffer?.image || group.images?.[0] || null,
                    pricePerDay: fallbackOffer?.pricePerDay || 0,
                    city: fallbackOffer?.city || '',
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const aOffer = a.selectedOffer || {};
                const bOffer = b.selectedOffer || {};
                if (activeSort === 'priceAsc') return (aOffer.pricePerDay || 0) - (bOffer.pricePerDay || 0);
                if (activeSort === 'priceDesc') return (bOffer.pricePerDay || 0) - (aOffer.pricePerDay || 0);
                if (activeSort === 'rating') return (bOffer.rating || 0) - (aOffer.rating || 0);
                return (bOffer.rating || 0) - (aOffer.rating || 0);
            });
    }, [listings, searchValue, placeValue, activeFilter, activeSort, startDate, endDate]);

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require('../../assets/background.png')}
                style={styles.background}
                resizeMode="cover"
              >
                <SafeAreaView style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                    <View style={styles.header}>
                        <Text style={[styles.logo, { color: colors.white }]}>{t('screens.client.homescreen.tousLesVehicules')}</Text>
                        <View style={styles.headerRight}>
                            <NotificationIconButton navigation={navigation} style={styles.notificationButton} iconSize={24} />
                            <TouchableOpacity style={styles.headerIcon}>
                                <Ionicons name="heart-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.logoutButton}
                                onPress={() => navigation.navigate('Landing')}
                            >
                                <Ionicons name="log-out" size={24} color="#fff" />
                            </TouchableOpacity>
                            <MessageIconButton navigation={navigation} style={styles.logoutButton} iconSize={24} />
                        </View>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.filterPanel, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                            <View style={styles.filterRow}>
                                <View style={[styles.filterField, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                                    <TextInput
                                        value={placeValue}
                                        onChangeText={setPlaceValue}
                                        placeholder={t('screens.client.homescreen.lieuVilleOuQuartier')}
                                        placeholderTextColor={colors.textMuted}
                                        style={[styles.filterInput, { color: colors.text }]}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[
                                      styles.dateFilterButton,
                                      { backgroundColor: colors.surfaceStrong, borderColor: colors.border },
                                      showDatePicker && { borderColor: colors.primary, backgroundColor: colors.surface }
                                    ]}
                                    onPress={() => setShowDatePicker((prev) => !prev)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.dateFilterButtonText, { color: colors.text }]}>
                                        {startDate
                                            ? endDate
                                                ? `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`
                                                : `${formatDateLabel(startDate)} ...`
                                            : t('screens.client.homescreen.dates')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {(placeValue || startDate || endDate) && (
                                <View style={styles.activeFiltersRow}>
                                    {placeValue ? (
                                        <TouchableOpacity
                                    style={[styles.activeFilterChip, { backgroundColor: colors.surface }]}
                                            onPress={() => setPlaceValue('')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.activeFilterChipText, { color: colors.text }]}>{placeValue}</Text>
                                            <Ionicons name="close" size={12} color={colors.text} />
                                        </TouchableOpacity>
                                    ) : null}
                                    {startDate ? (
                                        <TouchableOpacity
                                        style={[styles.activeFilterChip, { backgroundColor: colors.surface }]}
                                            onPress={clearDateFilters}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.activeFilterChipText, { color: colors.text }]}>
                                                {endDate ? `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}` : formatDateLabel(startDate)}
                                            </Text>
                                            <Ionicons name="close" size={12} color={colors.text} />
                                        </TouchableOpacity>
                                    ) : null}
                                    <TouchableOpacity
                                        style={styles.clearFiltersButton}
                                        onPress={() => {
                                            setPlaceValue('');
                                            clearDateFilters();
                                        }}
                                        activeOpacity={0.8}
                                    >
                                            <Text style={styles.clearFiltersButtonText}>{t('screens.client.homescreen.toutEffacer')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {showDatePicker && (
                                <View style={styles.datePickerCard}>
                                    <Text style={styles.datePickerTitle}>{t('screens.client.homescreen.choisisUnePeriode')}</Text>
                                    <CustomCalendar
                                        onDayPress={handleCalendarDayPress}
                                        markedDates={markedDates}
                                        minDate={null}
                                        maxDate={null}
                                        disabledDates={[]}
                                    />
                                    <View style={styles.datePickerActions}>
                                        <TouchableOpacity
                                            style={styles.datePickerActionGhost}
                                            onPress={() => {
                                                clearDateFilters();
                                                setShowDatePicker(false);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.datePickerActionGhostText}>{t('screens.client.homescreen.reinitialiser')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.datePickerActionPrimary}
                                            onPress={() => setShowDatePicker(false)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.datePickerActionPrimaryText}>{t('screens.client.homescreen.appliquer')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>

                        {showPhoneReminder && (
                            <View style={styles.reminderCard}>
                                <View style={styles.reminderTopRow}>
                                    <View style={styles.reminderLeft}>
                                        <View style={styles.reminderIcon}>
                                            <Ionicons name="call-outline" size={16} color="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.reminderTitle}>{t('screens.client.homescreen.ajouteTonNumero')}</Text>
                                            <Text style={styles.reminderSubtitle}>{t('screens.client.homescreen.pourFaciliterLesReservationsEtLeContact')}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={dismissPhoneReminder} style={styles.reminderDismiss} accessibilityRole="button">
                                        <Ionicons name="close" size={16} color="#cdd3ff" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={goToPhoneInProfile} style={styles.reminderAction} activeOpacity={0.85}>
                                    <Text style={styles.reminderActionText}>{t('screens.client.homescreen.definirMonNumero')}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.actionsRow}>
                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}
                                    onPress={() => {
                                        setShowFilterOptions((prev) => !prev);
                                        setShowSortOptions(false);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="funnel-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('screens.client.homescreen.filtrer')} {activeFilterLabel}</Text>
                                </TouchableOpacity>
                                {showFilterOptions && (
                                    <View style={[styles.dropdown, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                                        {filterOptions.map((option) => {
                                            const isActive = option.id === activeFilter;
                                            return (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    style={[
                                                      styles.dropdownItem,
                                                      { borderColor: colors.border },
                                                      isActive && { backgroundColor: colors.surface, borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => {
                                                        setActiveFilter(option.id);
                                                        setShowFilterOptions(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                      styles.dropdownItemText,
                                                      { color: colors.textMuted },
                                                      isActive && { color: colors.text, fontWeight: '700' }
                                                    ]}>
                                                        {option.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}
                                    onPress={() => {
                                        setShowSortOptions((prev) => !prev);
                                        setShowFilterOptions(false);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('screens.client.homescreen.trier')} {activeSortLabel}</Text>
                                </TouchableOpacity>
                                {showSortOptions && (
                                    <View style={[styles.dropdown, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                                        {sortOptions.map((option) => {
                                            const isActive = option.id === activeSort;
                                            return (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    style={[
                                                      styles.dropdownItem,
                                                      { borderColor: colors.border },
                                                      isActive && { backgroundColor: colors.surface, borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => {
                                                        setActiveSort(option.id);
                                                        setShowSortOptions(false);
                                                    }}
                                                >
                                                    <Text style={[
                                                      styles.dropdownItemText,
                                                      { color: colors.textMuted },
                                                      isActive && { color: colors.text, fontWeight: '700' }
                                                    ]}>
                                                        {option.label}
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
                                <Text style={styles.emptyTitle}>{t('screens.client.homescreen.chargementDesVehicules')}</Text>
                            </View>
                        )}
                        {!isLoading && error ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>{t('screens.client.homescreen.erreur')}</Text>
                                <Text style={styles.emptySubtitle}>{error}</Text>
                                <TouchableOpacity style={styles.retryButton} onPress={loadListings}>
                                    <Text style={styles.retryButtonText}>{t('screens.client.homescreen.reessayer')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {!isLoading && !error && groupedListings.map((listing) => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                isFavorite={isFavorite(listing.selectedOffer?.id || listing.id)}
                                onToggleFavorite={() => toggleFavorite(listing.selectedOffer?.id || listing.id)}
                                onPress={() => navigation.navigate('ListingDetails', {
                                    listing: listing.selectedOffer || listing,
                                    groupedOffers: listing.offers,
                                })}
                            />
                        ))}
                        {!isLoading && !error && groupedListings.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>{t('screens.client.homescreen.aucunVehiculeTrouve')}</Text>
                                <Text style={styles.emptySubtitle}>{t('screens.client.homescreen.essaieUneAutreRechercheOuUnAutre')}</Text>
                            </View>
                        )}
                        <View style={{ height: 8 }} />
                    </ScrollView>
                    <AssistantWidget />
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
    filterPanel: {
        marginBottom: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
        backgroundColor: 'rgba(13, 16, 35, 0.68)',
        padding: 12,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    filterField: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
        backgroundColor: 'rgba(18, 21, 46, 0.92)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    filterInput: {
        flex: 1,
        marginLeft: 8,
        color: '#f4f6ff',
        fontSize: 13,
    },
    dateFilterButton: {
        minHeight: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
        backgroundColor: 'rgba(18, 21, 46, 0.92)',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateFilterButtonActive: {
        borderColor: 'rgba(143, 108, 255, 0.6)',
        backgroundColor: 'rgba(108, 77, 255, 0.2)',
    },
    dateFilterButtonText: {
        color: '#d6dbff',
        fontWeight: '700',
        fontSize: 12,
    },
    activeFiltersRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    activeFilterChip: {
        minHeight: 32,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(108, 77, 255, 0.34)',
        borderWidth: 1,
        borderColor: 'rgba(143, 108, 255, 0.55)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    activeFilterChipText: {
        color: '#fff',
        fontSize: 11.5,
        fontWeight: '700',
    },
    clearFiltersButton: {
        minHeight: 32,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
    },
    clearFiltersButtonText: {
        color: '#c7cdf4',
        fontSize: 11.5,
        fontWeight: '600',
    },
    datePickerCard: {
        marginTop: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
        backgroundColor: 'rgba(10, 12, 28, 0.9)',
        padding: 12,
    },
    datePickerTitle: {
        color: '#f4f6ff',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
    },
    datePickerActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    datePickerActionGhost: {
        flex: 1,
        minHeight: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(145, 152, 229, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    datePickerActionGhostText: {
        color: '#d6dbff',
        fontSize: 12,
        fontWeight: '700',
    },
    datePickerActionPrimary: {
        flex: 1,
        minHeight: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(108, 77, 255, 0.9)',
    },
    datePickerActionPrimaryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
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
    dropdownItemText: {
        fontSize: 13,
        fontWeight: '500',
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
