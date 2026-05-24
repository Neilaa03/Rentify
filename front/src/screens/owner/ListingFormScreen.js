import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { fetchJson } from '../../services/api';
import {
  createOwnerListing,
  updateOwnerListing,
} from '../../services/owner';
import OwnerBottomNavigation from '../../components/navigation/OwnerBottomNavigation';

LocaleConfig.locales.fr = {
  monthNames: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildRangeMarks = (startDate, endDate) => {
  if (!startDate) return {};

  if (!endDate || endDate < startDate) {
    return {
      [startDate]: {
        customStyles: {
          container: { backgroundColor: '#cf62ff', borderRadius: 16 },
          text: { color: '#fff', fontWeight: '700' },
        },
      },
    };
  }

  const marks = {};
  let cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const key = toYmd(cursor);
    const isEdge = key === startDate || key === endDate;
    marks[key] = {
      customStyles: {
        container: { backgroundColor: isEdge ? '#cf62ff' : '#7f69ea', borderRadius: 16 },
        text: { color: '#fff', fontWeight: '700' },
      },
    };
    cursor.setDate(cursor.getDate() + 1);
  }

  return marks;
};

const OwnerListingFormScreen = ({ navigation, route }) => {
  const token = route?.params?.token;
  const user = route?.params?.user;
  const mode = route?.params?.mode || 'create';
  const listing = route?.params?.listing;

  const isCreateListingOnly = mode === 'create_listing' || mode === 'create';
  const isEdit = mode === 'edit';

  const prefill = listing || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState([]);
  const [isRangeCalendarOpen, setIsRangeCalendarOpen] = useState(false);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);

  const [form, setForm] = useState({
    carId: listing?.carId || '',
    title: listing?.title || '',
    pricePerDay: listing?.pricePerDay ? String(listing.pricePerDay) : '',
    pickupAddress: listing?.pickupAddress || listing?.pickup_address || '',
    deliveryFee: listing?.deliveryFee !== undefined ? String(listing.deliveryFee) : listing?.delivery_fee !== undefined ? String(listing.delivery_fee) : '0',
    city: listing?.city || '',
    country: listing?.country || 'Algeria',
    description: listing?.description || '',
    availableFrom: listing?.availableFrom || '',
    availableTo: listing?.availableTo || '',
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isCreateListingOnly) return;
    const loadCars = async () => {
      const result = await fetchJson('/api/cars', { headers: { Authorization: `Bearer ${token}` } });
      const ownerCars = (Array.isArray(result) ? result : []).filter((car) => car.ownerId === user?.id);
      setCars(ownerCars);
      if (!form.carId && ownerCars.length > 0) setField('carId', ownerCars[0].id);
    };
    loadCars();
  }, [isCreateListingOnly, token, user?.id]);

  const canSubmit = useMemo(() => {
    const common = Boolean(
      form.title.trim() &&
        form.pricePerDay &&
        form.pickupAddress.trim() &&
        form.city.trim() &&
        form.country.trim() &&
        form.availableFrom &&
        form.availableTo
    );

    if (isCreateListingOnly) return Boolean(common && form.carId);
    return common;
  }, [form, isCreateListingOnly]);

  const submitEdit = async () => {
    await updateOwnerListing({
      token,
      listingId: listing.id,
      payload: {
        title: form.title.trim(),
        description: form.description.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        pricePerDay: Number(form.pricePerDay),
        pickupAddress: form.pickupAddress.trim(),
        deliveryFee: Number(form.deliveryFee || 0),
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        isActive: false,
      },
    });
  };

  const submitCreateListingOnly = async () => {
    await createOwnerListing({
      token,
      payload: {
        carId: form.carId,
        title: form.title.trim(),
        description: form.description.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        pricePerDay: Number(form.pricePerDay),
        pickupAddress: form.pickupAddress.trim(),
        deliveryFee: Number(form.deliveryFee || 0),
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        isActive: false,
      },
    });
  };

  const submit = async () => {
    if (!canSubmit) return Alert.alert('Champs requis', 'Veuillez remplir les champs obligatoires.');

    setIsSubmitting(true);
    try {
      if (isCreateListingOnly) await submitCreateListingOnly();
      else await submitEdit();

      navigation.navigate('OwnerListings', { token, user });
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Sauvegarde impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markedDates = useMemo(() => buildRangeMarks(form.availableFrom, form.availableTo), [form.availableFrom, form.availableTo]);

  const handleRangeDayPress = (day) => {
    const selected = day?.dateString;
    if (!selected) return;

    if (!form.availableFrom || !isSelectingEndDate) {
      setField('availableFrom', selected);
      setField('availableTo', '');
      setIsSelectingEndDate(true);
      return;
    }

    if (selected < form.availableFrom) {
      setField('availableFrom', selected);
      setField('availableTo', '');
      setIsSelectingEndDate(true);
      return;
    }

    setField('availableTo', selected);
    setIsSelectingEndDate(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>{isCreateListingOnly ? 'Nouvelle annonce' : 'Modifier annonce'}</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isCreateListingOnly ? (
            <>
              <Text style={styles.sectionTitle}>Vehicule</Text>
              <View style={styles.optionRow}>
                {cars.map((car) => (
                  <TouchableOpacity key={car.id} style={[styles.optionPill, form.carId === car.id && styles.optionPillActive]} onPress={() => setField('carId', car.id)}>
                    <Text style={[styles.optionText, form.carId === car.id && styles.optionTextActive]}>{car.brand} {car.model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Tarification & Localisation</Text>
          <Text style={styles.label}>Titre annonce *</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={(v) => setField('title', v)} />

          <View style={styles.twoCols}>
            <View style={styles.col}><Text style={styles.label}>Prix / jour (DA) *</Text><TextInput style={styles.input} keyboardType="numeric" value={form.pricePerDay} onChangeText={(v) => setField('pricePerDay', v)} /></View>
            <View style={styles.col}><Text style={styles.label}>Ville *</Text><TextInput style={styles.input} value={form.city} onChangeText={(v) => setField('city', v)} /></View>
          </View>

          <Text style={styles.label}>Adresse de recuperation (chez vous / agence) *</Text>
          <TextInput style={styles.input} value={form.pickupAddress} onChangeText={(v) => setField('pickupAddress', v)} placeholder="Ex: 12 Rue ..., Alger" placeholderTextColor="#9aa3d8" />

          <Text style={styles.label}>Frais de livraison (DA)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={form.deliveryFee} onChangeText={(v) => setField('deliveryFee', v)} placeholder="0" placeholderTextColor="#9aa3d8" />

          <Text style={styles.label}>Pays *</Text>
          <TextInput style={styles.input} value={form.country} onChangeText={(v) => setField('country', v)} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline value={form.description} onChangeText={(v) => setField('description', v)} />

          <Text style={styles.label}>Selectionnez vos dates *</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setIsRangeCalendarOpen((prev) => !prev)}>
            <Text style={form.availableFrom ? styles.dateValue : styles.datePlaceholder}>
              {form.availableFrom ? `${form.availableFrom} -> ${form.availableTo || '...'}` : 'Choisir la periode'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#cfd3ff" />
          </TouchableOpacity>

          {isRangeCalendarOpen ? (
            <View style={styles.datePickerWrap}>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#cf62ff' }]} /><Text style={styles.legendText}>Selection</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2f3568' }]} /><Text style={styles.legendText}>Indisponible</Text></View>
              </View>

              <Calendar
                markingType="custom"
                markedDates={markedDates}
                onDayPress={handleRangeDayPress}
                firstDay={1}
                monthFormat={'MMMM yyyy'}
                current={form.availableFrom || undefined}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: '#e4e8ff',
                  monthTextColor: '#fff',
                  dayTextColor: '#fff',
                  todayTextColor: '#cf62ff',
                  arrowColor: '#cf62ff',
                  textMonthFontSize: 30 / 1.6,
                  textMonthFontWeight: '700',
                  textDayHeaderFontSize: 15,
                  textDayHeaderFontWeight: '700',
                  'stylesheet.day.basic': {
                    base: {
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: '#2f3568',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  },
                }}
              />
              <Text style={styles.hint}>{isSelectingEndDate ? 'Selectionnez la date de fin.' : 'Periode selectionnee.'}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]} onPress={submit} disabled={!canSubmit || isSubmitting}>
            <Text style={styles.submitText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <OwnerBottomNavigation navigation={navigation} route={route} active="add" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#0a0c24' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  content: { paddingBottom: 104 },
  sectionTitle: { color: '#fff', marginTop: 12, marginBottom: 8, fontSize: 18, fontWeight: '800' },
  label: { color: '#d8dcf7', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  twoCols: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(146,151,214,0.25)', backgroundColor: 'rgba(21,23,58,0.9)', color: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  hint: { color: '#bfc5ed', marginTop: 8, marginBottom: 4, lineHeight: 20 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: 2 },
  optionPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(146,151,214,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  optionPillActive: { backgroundColor: 'rgba(143,125,255,0.22)', borderColor: '#8f7dff' },
  optionText: { color: '#aeb4dc', fontWeight: '500' },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  dateInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)',
    backgroundColor: 'rgba(21,23,58,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateValue: { color: '#fff' },
  datePlaceholder: { color: '#8389b6' },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.35)',
    backgroundColor: '#1b245b',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  legendRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingHorizontal: 8 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1,
    borderColor: 'rgba(186,192,241,0.35)', backgroundColor: '#2a3269', paddingHorizontal: 12, paddingVertical: 7,
  },
  legendDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  legendText: { color: '#e7ebff', fontWeight: '700', fontSize: 12 },
  submitBtn: { marginTop: 16, borderRadius: 12, backgroundColor: '#8f7dff', alignItems: 'center', paddingVertical: 13 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default OwnerListingFormScreen;
