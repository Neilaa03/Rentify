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
import { fetchJson } from '../services/api';
import {
  createCarDocument,
  createOwnerCar,
  createOwnerListing,
  updateOwnerListing,
} from '../services/owner';

const fuelOptions = ['Essence', 'Diesel', 'Hybride', 'Electrique'];
const transmissionOptions = ['Automatique', 'Manuelle'];

const OwnerListingFormScreen = ({ navigation, route }) => {
  const token = route?.params?.token;
  const user = route?.params?.user;
  const mode = route?.params?.mode || 'create';
  const listing = route?.params?.listing;

  const isCreateCarAndListing = mode === 'create';
  const isCreateListingOnly = mode === 'create_listing';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState({
    brand: listing?.brand || '',
    model: listing?.model || '',
    year: listing?.year ? String(listing.year) : '',
    color: '',
    fuelType: 'Diesel',
    transmission: 'Automatique',
    seats: '',
    mileage: '',
    carId: listing?.carId || '',
    title: listing?.title || '',
    pricePerDay: listing?.pricePerDay ? String(listing.pricePerDay) : '',
    city: listing?.city || '',
    country: listing?.country || 'Algeria',
    description: listing?.description || '',
    availableFrom: listing?.availableFrom || '',
    availableTo: listing?.availableTo || '',
    carteGriseUrl: '',
    insuranceUrl: '',
    technicalControlUrl: '',
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isCreateListingOnly) return;

    const loadCars = async () => {
      const result = await fetchJson('/api/cars', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ownerCars = (Array.isArray(result) ? result : []).filter((car) => car.ownerId === user?.id);
      setCars(ownerCars);
      if (!form.carId && ownerCars.length > 0) {
        setField('carId', ownerCars[0].id);
      }
    };

    loadCars();
  }, [isCreateListingOnly, token, user?.id]);

  const canSubmit = useMemo(() => {
    const common = Boolean(
      form.title.trim() &&
        form.pricePerDay &&
        form.city.trim() &&
        form.country.trim() &&
        form.availableFrom &&
        form.availableTo
    );

    if (isCreateListingOnly) return Boolean(common && form.carId);

    if (!isCreateCarAndListing) return common;

    return Boolean(
      common &&
        form.brand.trim() &&
        form.model.trim() &&
        form.year &&
        form.fuelType &&
        form.transmission &&
        form.seats &&
        form.carteGriseUrl.trim() &&
        form.insuranceUrl.trim() &&
        form.technicalControlUrl.trim()
    );
  }, [form, isCreateCarAndListing, isCreateListingOnly]);

  const submitEdit = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      pricePerDay: Number(form.pricePerDay),
      availableFrom: form.availableFrom,
      availableTo: form.availableTo,
      isActive: false,
    };

    await updateOwnerListing({ token, listingId: listing.id, payload });
  };

  const submitCreate = async () => {
    const newCar = await createOwnerCar({
      token,
      payload: {
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        color: form.color.trim(),
        fuelType: form.fuelType,
        transmission: form.transmission,
        mileage: form.mileage ? Number(form.mileage) : 0,
        seats: Number(form.seats),
        description: form.description.trim(),
      },
    });

    const carId = newCar?.id;
    if (!carId) throw new Error('Creation du véhicule échouée');

    await Promise.all([
      createCarDocument({ token, payload: { carId, documentType: 'carte_grise', documentUrl: form.carteGriseUrl.trim() } }),
      createCarDocument({ token, payload: { carId, documentType: 'insurance', documentUrl: form.insuranceUrl.trim() } }),
      createCarDocument({ token, payload: { carId, documentType: 'technical_control', documentUrl: form.technicalControlUrl.trim() } }),
    ]);

    await createOwnerListing({
      token,
      payload: {
        carId,
        title: form.title.trim(),
        description: form.description.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        pricePerDay: Number(form.pricePerDay),
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
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        isActive: false,
      },
    });
  };

  const submit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs requis', 'Veuillez remplir les champs obligatoires.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreateCarAndListing) {
        await submitCreate();
      } else if (isCreateListingOnly) {
        await submitCreateListingOnly();
      } else {
        await submitEdit();
      }

      navigation.navigate('OwnerListings', { token, user });
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Sauvegarde impossible');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCreateCarAndListing ? 'Publier un véhicule' : isCreateListingOnly ? 'Nouvelle annonce' : 'Modifier annonce'}
          </Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isCreateCarAndListing ? (
            <>
              <Text style={styles.sectionTitle}>Informations générales</Text>
              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={styles.label}>Marque *</Text>
                  <TextInput style={styles.input} value={form.brand} onChangeText={(v) => setField('brand', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Modèle *</Text>
                  <TextInput style={styles.input} value={form.model} onChangeText={(v) => setField('model', v)} />
                </View>
              </View>

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={styles.label}>Année *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.year} onChangeText={(v) => setField('year', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Couleur</Text>
                  <TextInput style={styles.input} value={form.color} onChangeText={(v) => setField('color', v)} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Caractéristiques techniques</Text>
              <View style={styles.optionRow}>
                {fuelOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.optionPill, form.fuelType === item && styles.optionPillActive]} onPress={() => setField('fuelType', item)}>
                    <Text style={[styles.optionText, form.fuelType === item && styles.optionTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.optionRow}>
                {transmissionOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.optionPill, form.transmission === item && styles.optionPillActive]} onPress={() => setField('transmission', item)}>
                    <Text style={[styles.optionText, form.transmission === item && styles.optionTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={styles.label}>Places *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.seats} onChangeText={(v) => setField('seats', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Kilométrage</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.mileage} onChangeText={(v) => setField('mileage', v)} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Documents véhicule requis</Text>
              <Text style={styles.hint}>Ajouter les liens des documents (statut initial: pending).</Text>

              <Text style={styles.label}>Carte grise URL *</Text>
              <TextInput style={styles.input} value={form.carteGriseUrl} placeholder="https://..." placeholderTextColor="#8389b6" autoCapitalize="none" onChangeText={(v) => setField('carteGriseUrl', v)} />

              <Text style={styles.label}>Assurance URL *</Text>
              <TextInput style={styles.input} value={form.insuranceUrl} placeholder="https://..." placeholderTextColor="#8389b6" autoCapitalize="none" onChangeText={(v) => setField('insuranceUrl', v)} />

              <Text style={styles.label}>Contrôle technique URL *</Text>
              <TextInput style={styles.input} value={form.technicalControlUrl} placeholder="https://..." placeholderTextColor="#8389b6" autoCapitalize="none" onChangeText={(v) => setField('technicalControlUrl', v)} />
            </>
          ) : null}

          {isCreateListingOnly ? (
            <>
              <Text style={styles.sectionTitle}>Véhicule</Text>
              <View style={styles.optionRow}>
                {cars.map((car) => (
                  <TouchableOpacity key={car.id} style={[styles.optionPill, form.carId === car.id && styles.optionPillActive]} onPress={() => setField('carId', car.id)}>
                    <Text style={[styles.optionText, form.carId === car.id && styles.optionTextActive]}>{car.brand} {car.model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {cars.length === 0 ? <Text style={styles.hint}>Aucun véhicule trouvé. Ajoutez un véhicule depuis le dashboard.</Text> : null}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Tarification & Localisation</Text>
          <Text style={styles.label}>Titre annonce *</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={(v) => setField('title', v)} />

          <View style={styles.twoCols}>
            <View style={styles.col}>
              <Text style={styles.label}>Prix / jour (DA) *</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.pricePerDay} onChangeText={(v) => setField('pricePerDay', v)} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={(v) => setField('city', v)} />
            </View>
          </View>

          <Text style={styles.label}>Pays *</Text>
          <TextInput style={styles.input} value={form.country} onChangeText={(v) => setField('country', v)} />

          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} multiline value={form.description} onChangeText={(v) => setField('description', v)} />

          <View style={styles.twoCols}>
            <View style={styles.col}>
              <Text style={styles.label}>Disponible du *</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#8389b6" value={form.availableFrom} onChangeText={(v) => setField('availableFrom', v)} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Disponible au *</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#8389b6" value={form.availableTo} onChangeText={(v) => setField('availableTo', v)} />
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]} onPress={submit} disabled={!canSubmit || isSubmitting}>
            <Text style={styles.submitText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0c24' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#0a0c24' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  content: { paddingBottom: 24 },
  sectionTitle: { color: '#fff', marginTop: 12, marginBottom: 8, fontSize: 28 / 1.7, fontWeight: '800' },
  label: { color: '#d8dcf7', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  twoCols: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(146,151,214,0.25)', backgroundColor: 'rgba(21,23,58,0.9)', color: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  hint: { color: '#95a0d1', marginTop: -2, marginBottom: 4, lineHeight: 20 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: 2 },
  optionPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(146,151,214,0.3)', paddingHorizontal: 12, paddingVertical: 8 },
  optionPillActive: { backgroundColor: 'rgba(143,125,255,0.22)', borderColor: '#8f7dff' },
  optionText: { color: '#aeb4dc', fontWeight: '500' },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  submitBtn: { marginTop: 16, borderRadius: 12, backgroundColor: '#8f7dff', alignItems: 'center', paddingVertical: 13 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default OwnerListingFormScreen;
