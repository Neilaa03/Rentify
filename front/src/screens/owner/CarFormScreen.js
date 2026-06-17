import React, { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'react-native';

import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { fetchJson } from '../../services/api';
import {
  createCarDocument,
  createCarImage,
  createOwnerCar,
  createOwnerListing,
  updateOwnerCar,
  updateOwnerListing,
  uploadCarDocument,
  uploadCarImage,
  deleteDocument } from
'../../services/owner';import { useTranslation } from "react-i18next";
import { getLanguageMeta } from '../../i18n';
import { getFriendlyError } from '../../utils/friendlyError';
import { useTheme } from '../../contexts/ThemeContext';
import AppBackground from '../../components/layout/AppBackground';

const fuelOptions = ['Essence', 'Diesel', 'Hybride', 'Electrique'];
const transmissionOptions = ['Automatique', 'Manuelle'];

LocaleConfig.locales.fr = {
  monthNames: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui"
};
LocaleConfig.locales.en = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.locales.ar = {
  monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  monthNamesShort: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
  dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  dayNamesShort: ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
  today: 'اليوم'
};
LocaleConfig.defaultLocale = 'fr';

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const allowedDocumentMimeTypes = [
'application/pdf',
'image/jpeg',
'image/png',
'image/webp'];


const inferDocumentMimeType = (file) => {
  const explicit = String(file?.mimeType || '').toLowerCase();
  if (allowedDocumentMimeTypes.includes(explicit)) return explicit;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const buildRangeMarks = (startDate, endDate) => {
  if (!startDate) return {};

  if (!endDate || endDate < startDate) {
    return {
      [startDate]: {
        customStyles: {
          container: { backgroundColor: '#cf62ff', borderRadius: 16 },
          text: { color: '#11162B', fontWeight: '700' }
        }
      }
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
          text: { color: '#11162B', fontWeight: '700' }
        }
      };
    cursor.setDate(cursor.getDate() + 1);
  }

  return marks;
};

const getNativeDocumentModules = () => {
  if (Platform.OS === 'web') return { FileSystem: null, FileSystemLegacy: null, Sharing: null };
  try {
    const FileSystem = require('expo-file-system');
    const FileSystemLegacy = require('expo-file-system/legacy');
    const Sharing = require('expo-sharing');
    return { FileSystem, FileSystemLegacy, Sharing };
  } catch (_error) {
    return { FileSystem: null, FileSystemLegacy: null, Sharing: null };
  }
};

const guessDocumentFilename = ({ url, type }) => {
  const safeType = String(type || 'document').toLowerCase();
  const fallback = `${safeType}_${Date.now()}.pdf`;
  if (!url) return fallback;

  try {
    const withoutQuery = String(url).split('?')[0];
    const parts = withoutQuery.split('/').filter(Boolean);
    const lastPart = decodeURIComponent(parts[parts.length - 1] || '');
    if (!lastPart) return fallback;
    if (lastPart.toLowerCase().endsWith('.pdf')) return lastPart;
    return `${lastPart}.pdf`;
  } catch (_e) {
    return fallback;
  }
};

const OwnerCarFormScreen = ({ navigation, route }) => {const { t, i18n } = useTranslation();
  LocaleConfig.defaultLocale = getLanguageMeta(i18n.language).code;
  const { colors } = useTheme();
  const token = route?.params?.token;
  const user = route?.params?.user;
  const mode = route?.params?.mode || 'create';
  const listing = route?.params?.listing;
  const car = route?.params?.car;

  const isCreateCar = mode === 'create_car';
  const isEditCar = mode === 'edit_car';
  const isCarForm = isCreateCar || isEditCar;
  const isCreateCarAndListing = mode === 'create';
  const isCreateListingOnly = mode === 'create_listing';

  const prefill = isCarForm ? car : listing || car;

  const getPrefillDocument = (type, label) => {
    const doc = prefill?.documents?.find((item) => item.documentType === type);
    return {
      id: doc?.id,
      uri: doc?.documentUrl || '',
      name: label,
      status: doc?.status || (doc?.documentUrl ? 'pending' : 'missing'),
      documentUrl: doc?.documentUrl || '',
      ocrResult: doc?.ocrResult || doc?.ocr_result || null
    };
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cars, setCars] = useState([]);
  const [isRangeCalendarOpen, setIsRangeCalendarOpen] = useState(false);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);
  const [stagedDocuments, setStagedDocuments] = useState({});
  const [draftCarId, setDraftCarId] = useState(prefill?.id || car?.id || '');

  const [form, setForm] = useState({
    brand: prefill?.brand || '',
    model: prefill?.model || '',
    year: prefill?.year ? String(prefill.year) : '',
    color: prefill?.color || '',
    fuelType: prefill?.fuelType || prefill?.fuel_type || 'Diesel',
    transmission: prefill?.transmission || 'Automatique',
    seats: prefill?.seats ? String(prefill.seats) : '',
    mileage: prefill?.mileage ? String(prefill.mileage) : '',
    registrationNumber: prefill?.registrationNumber || prefill?.registration_number || '',
    carId: listing?.carId || '',
    title: listing?.title || '',
    pricePerDay: listing?.pricePerDay ? String(listing.pricePerDay) : '',
    pickupAddress: listing?.pickupAddress || listing?.pickup_address || '',
    deliveryFee: listing?.deliveryFee !== undefined ? String(listing.deliveryFee) : listing?.delivery_fee !== undefined ? String(listing.delivery_fee) : '0',
    city: listing?.city || '',
    country: listing?.country || 'Algeria',
    description: prefill?.description || '',
    availableFrom: listing?.availableFrom || '',
    availableTo: listing?.availableTo || '',
    documents: {
      carte_grise: getPrefillDocument('carte_grise', t("screens.owner.carformscreen.carteGrise")),
      insurance: getPrefillDocument('insurance', t("screens.owner.carformscreen.assurance")),
      technical_control: getPrefillDocument('technical_control', 'Controle technique')
    },
    images:
    prefill?.images?.map((img, index) => ({
      id: img.id,
      uri: img.image_url || img.imageUrl,
      isPrimary: img.is_primary || index === 0,
      isUploaded: true
    })) || [],
    imageUrls: []
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setDocumentField = (documentType, value) =>
  setForm((prev) => ({
    ...prev,
    documents: {
      ...prev.documents,
      [documentType]: value
    }
  }));

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Validé';
      case 'rejected':
        return t("screens.agency.agencydocumentsscreen.rejete");
      case 'manual_review':
        return 'En révision';
      case 'pending':
        return t("screens.admin.admincarsscreen.enAttente");
      default:
        return t("screens.agency.agencydocumentsscreen.manquant");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#2ecc71';
      case 'rejected':
        return '#ff6b6b';
      case 'manual_review':
        return '#ffb020';
      case 'pending':
        return '#f1c40f';
      default:
        return '#95a5a6';
    }
  };

  const getDocumentReason = (document) => {
    const reason = document?.ocrResult?.verificationReason || document?.rejectionReason || '';
    if (!reason) return '';

    if (document?.status === 'rejected') {
      return `Motif du rejet: ${reason}`;
    }

    if (document?.status === 'manual_review') {
      return `Motif de révision: ${reason}`;
    }

    return reason;
  };

  const buildCarPayload = () => ({
    brand: form.brand.trim(),
    model: form.model.trim(),
    year: Number(form.year),
    color: form.color.trim(),
    fuelType: form.fuelType,
    transmission: form.transmission,
    mileage: form.mileage ? Number(form.mileage) : undefined,
    seats: Number(form.seats),
    registrationNumber: form.registrationNumber.trim(),
    description: form.description.trim()
  });

  const canCreateDraftCar = () =>
    Boolean(
      token &&
      form.brand.trim() &&
      form.model.trim() &&
      form.year &&
      form.fuelType &&
      form.transmission &&
      form.seats
    );

  const ensureDraftCar = async () => {
    if (draftCarId) return draftCarId;
    if (!canCreateDraftCar()) return null;

    const createdCar = await createOwnerCar({
      token,
      payload: buildCarPayload()
    });

    const nextCarId = createdCar?.id || '';
    if (nextCarId) {
      setDraftCarId(nextCarId);
      setField('carId', nextCarId);
    }

    return nextCarId || null;
  };

  const uploadDocumentForCar = async ({ carId, documentType, staged }) => {
    const uploaded = await uploadCarDocument({
      token,
      carId,
      documentType,
      file: {
        uri: staged.uri,
        name: staged.name || `${documentType}.pdf`,
        type: inferDocumentMimeType(staged),
        file: staged.file || null
      }
    });

    return uploaded;
  };

  const selectLatestDocumentsByType = (documents = []) => {
    const sorted = [...documents].sort(
      (left, right) =>
        new Date(right?.updatedAt || right?.createdAt || 0) - new Date(left?.updatedAt || left?.createdAt || 0)
    );

    return sorted.reduce((acc, document) => {
      if (!document?.documentType || acc[document.documentType]) return acc;
      acc[document.documentType] = document;
      return acc;
    }, {});
  };

  const handleDocumentPress = async (type) => {
    const document = form.documents[type];
    const candidateUrl =
    typeof document?.documentUrl === 'string' && document.documentUrl.trim() ||
    typeof document?.uri === 'string' && document.uri.trim() ||
    '';

    if (candidateUrl) {
      try {
        await Linking.openURL(candidateUrl);
      } catch (_error) {
        Alert.alert(t("screens.owner.carformscreen.erreur"), t("screens.owner.carformscreen.impossibleDouvrirCeDocumentLocal"));
      }
    }

    try {
      await Linking.openURL(candidateUrl);
    } catch (error) {
      console.warn('Document open failed', error);
      Alert.alert(t("screens.owner.carformscreen.erreur"), t("screens.owner.carformscreen.impossibleDouvrirCeDocument"));
    }
  };

  const handleDocumentDelete = async (type) => {
    const document = form.documents[type];
    if (document?.id) {
      try {
        await deleteDocument({ token, documentId: document.id });
      } catch (error) {
        Alert.alert(t("screens.owner.carformscreen.erreur"), getFriendlyError(error, t));
        return;
      }
    }

    setDocumentField(type, {
      id: undefined,
      uri: '',
      name: document?.name || type,
      status: 'missing',
      documentUrl: ''
    });
  };

  const pickDocument = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedDocumentMimeTypes,
        copyToCacheDirectory: true
      });

      if (result?.canceled) return;

      const asset = Array.isArray(result?.assets) ? result.assets[0] : result;
      const uri = asset?.uri;
      const name = asset?.name;
      const mimeType = asset?.mimeType || asset?.type;

      if (!uri || !name) return;

      const isValidMime = allowedDocumentMimeTypes.includes(mimeType);
      if (!isValidMime) {
        return Alert.alert(t("screens.owner.carformscreen.formatNonAutorise"), t("screens.owner.carformscreen.choisissezUnFichierPdfOuUneImage"));
      }

      setStagedDocuments((prev) => ({
        ...prev,
        [type]: {
          uri,
          name,
          mimeType,
          file: asset?.file || null
        }
      }));
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert(t("screens.owner.carformscreen.erreur"), t("screens.owner.carformscreen.impossibleDeSelectionnerLeDocument"));
    }
  };

  const confirmDocumentUpload = async (type) => {
    const staged = stagedDocuments[type];
    if (!staged) return;

    const targetCarId = car?.id || draftCarId || form?.carId || null;

    if (!targetCarId) {
      const createdDraftCarId = await ensureDraftCar();
      if (createdDraftCarId) {
        try {
          setIsSubmitting(true);
          const uploaded = await uploadDocumentForCar({
            carId: createdDraftCarId,
            documentType: type,
            staged
          });

          setDocumentField(type, {
            ...form.documents[type],
            id: uploaded?.id || form.documents[type]?.id,
            uri: uploaded?.documentUrl || staged.uri,
            documentUrl: uploaded?.documentUrl || staged.uri,
            name: staged.name,
            mimeType: staged.mimeType,
            status: uploaded?.status || 'pending',
            ocrResult: uploaded?.ocrResult || uploaded?.ocr_result || form.documents[type]?.ocrResult || null
          });

          if ((uploaded?.status || 'pending') === 'rejected' && uploaded?.ocrResult?.verificationReason) {
            Alert.alert(t("screens.owner.carformscreen.documentRejete"), uploaded.ocrResult.verificationReason);
          }

          setStagedDocuments((prev) => {
            const updated = { ...prev };
            delete updated[type];
            return updated;
          });
          return;
        } catch (error) {
          Alert.alert(t("screens.owner.carformscreen.erreur"), getFriendlyError(error, t));
          return;
        } finally {
          setIsSubmitting(false);
        }
      }

      setDocumentField(type, {
        ...form.documents[type],
        uri: staged.uri,
        name: staged.name,
        mimeType: staged.mimeType,
        file: staged.file || null,
        status: 'pending'
      });
      setStagedDocuments((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });
      Alert.alert(t("screens.owner.carformscreen.documentPret"), t("screens.owner.carformscreen.leDocumentEstPretEtSeraEnvoye"));
      return;
    }

    try {
      setIsSubmitting(true);
      const uploaded = await uploadDocumentForCar({
        carId: targetCarId,
        documentType: type,
        staged
      });

      setDocumentField(type, {
        ...form.documents[type],
        id: uploaded?.id || form.documents[type]?.id,
        uri: uploaded?.documentUrl || staged.uri,
        documentUrl: uploaded?.documentUrl || staged.uri,
        name: staged.name,
        mimeType: staged.mimeType,
        status: uploaded?.status || 'pending',
        ocrResult: uploaded?.ocrResult || uploaded?.ocr_result || form.documents[type]?.ocrResult || null
      });

      if ((uploaded?.status || 'pending') === 'rejected' && uploaded?.ocrResult?.verificationReason) {
        Alert.alert(t("screens.owner.carformscreen.documentRejete"), uploaded.ocrResult.verificationReason);
      }

      setStagedDocuments((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });
    } catch (error) {
      Alert.alert(t("screens.owner.carformscreen.erreur"), getFriendlyError(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDocumentUpload = (type) => {
    setStagedDocuments((prev) => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const addImageField = () =>
  setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));

  const removeImageField = (index) =>
  setForm((prev) => ({
    ...prev,
    imageUrls: prev.imageUrls.filter((_, idx) => idx !== index)
  }));

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
    if (isCarForm) {
      return Boolean(
        form.brand.trim() &&
        form.model.trim() &&
        form.year &&
        form.fuelType &&
        form.transmission &&
        form.seats
      );
    }

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
    if (!isCreateCarAndListing) return common;

    const hasAllDocuments = ['carte_grise', 'insurance', 'technical_control'].every(
      (key) => form.documents[key]?.uri?.trim()
    );

    return Boolean(
      common &&
      form.brand.trim() &&
      form.model.trim() &&
      form.year &&
      form.fuelType &&
      form.transmission &&
      form.seats &&
      hasAllDocuments
    );
  }, [form, isCreateCarAndListing, isCreateListingOnly, isCarForm]);

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
        isActive: false
      }
    });
  };

  const pickImages = async () => {
    if (form.images.length >= 3) {
      return Alert.alert(t("screens.owner.carformscreen.limiteAtteinte"), t("screens.owner.carformscreen.maximum3Photos")


      );
    }

    const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
      ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 3 - form.images.length
    });

    if (!result.canceled) {
      const newImages = result.assets.map(
        (asset, index) => ({
          uri: asset.uri,
          isPrimary:
          form.images.length === 0 && index === 0,
          isUploaded: false
        })
      );

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
  };

  const createCarExtras = async (carId) => {
    const existingDocumentUrls = {
      carte_grise: prefill?.documents?.find((doc) => doc.documentType === 'carte_grise')?.documentUrl,
      insurance: prefill?.documents?.find((doc) => doc.documentType === 'insurance')?.documentUrl,
      technical_control: prefill?.documents?.find((doc) => doc.documentType === 'technical_control')?.documentUrl
    };

    const existingImageUrls = new Set(prefill?.images?.map((image) => image.imageUrl) || []);

    const uploadDocuments = Object.entries(form.documents)
    //.filter(([, document]) => document?.uri?.trim())
    .filter(([, document]) => Boolean(document?.uri)).
    filter(([, document]) => {
      const isRemoteUrl = typeof document?.uri === 'string' && document.uri.startsWith('http');
      return !(document?.id && isRemoteUrl);
    }).
    filter(([documentType, document]) => document.uri !== existingDocumentUrls[documentType]).
    map(async ([documentType, document]) => {
      const isRemoteUrl = typeof document.uri === 'string' && document.uri.startsWith('http');

      if (isRemoteUrl) {
        const created = await createCarDocument({
          token,
          payload: {
            carId,
            documentType,
            documentUrl: document.uri.trim()
          }
        });
        return { documentType, uploaded: created };
      }

      //   setForm(prev => ({
      //       ...prev,
      //       documents: {
      //           ...prev.documents,
      //           [documentType]: {
      //               ...prev.documents[documentType],
      //               uri: uploadedDoc.documentUrl,
      //           },
      //       },
      //   }));

      const uploaded = await uploadCarDocument({
        token,
        carId,
        documentType,
        file: {
          uri: document.uri,
          name: document.name || `${documentType}.pdf`,
          type: document.mimeType || 'application/octet-stream',
          file: document.file || null
        }
      });
      return { documentType, uploaded };
    });

    const uploadImages = form.images.
    filter((image) => image?.uri && !existingImageUrls.has(image.uri)).
    map((image, index) => {
      const isRemoteUrl = typeof image.uri === 'string' && image.uri.startsWith('http');

      if (image.isUploaded && isRemoteUrl) {
        return createCarImage({
          token,
          payload: {
            carId,
            imageUrl: image.uri,
            isPrimary: image.isPrimary
          }
        });
      }

      return uploadCarImage({
        token,
        carId,
        file: {
          uri: image.uri,
          name: image.name || `car-image-${carId}-${index}.jpg`,
          type: image.mimeType || 'image/jpeg'
        },
        isPrimary: image.isPrimary
      });
    });

    const uploadedDocuments = await Promise.all(uploadDocuments);
    await Promise.all(uploadImages);

    if (uploadedDocuments.length > 0) {
      try {
        const refreshedDocuments = await fetchJson(`/api/documents?carId=${carId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const latestDocumentsByType = selectLatestDocumentsByType(Array.isArray(refreshedDocuments) ? refreshedDocuments : []);

        setForm((prev) => {
          const nextDocuments = { ...prev.documents };

          for (const [documentType, serverDocument] of Object.entries(latestDocumentsByType)) {
            if (!nextDocuments[documentType]) continue;

            nextDocuments[documentType] = {
              ...nextDocuments[documentType],
              id: serverDocument.id || nextDocuments[documentType]?.id,
              uri: serverDocument.documentUrl || nextDocuments[documentType]?.uri || '',
              documentUrl: serverDocument.documentUrl || nextDocuments[documentType]?.documentUrl || '',
              status: serverDocument.status || nextDocuments[documentType]?.status || 'pending',
              ocrResult: serverDocument.ocrResult || serverDocument.ocr_result || nextDocuments[documentType]?.ocrResult || null
            };
          }

          return {
            ...prev,
            documents: nextDocuments
          };
        });

        const rejectedDoc = Object.values(latestDocumentsByType).find(
          (doc) =>
            String(doc?.status || '').toLowerCase() === 'rejected' &&
            String(doc?.ocrResult?.verificationReason || doc?.ocr_result?.verificationReason || '').trim()
        );

        if (rejectedDoc) {
          const firstReason =
            rejectedDoc?.ocrResult?.verificationReason ||
            rejectedDoc?.ocr_result?.verificationReason ||
            t("screens.owner.carformscreen.documentRejete");
          Alert.alert(t("screens.owner.carformscreen.documentRejete"), firstReason);
        }
      } catch (_refreshError) {
        const rejectedUploads = uploadedDocuments.filter(
          (result) =>
            String(result?.uploaded?.status || '').toLowerCase() === 'rejected' &&
            String(result?.uploaded?.ocrResult?.verificationReason || result?.uploaded?.ocr_result?.verificationReason || '').trim()
        );

        setForm((prev) => {
          const nextDocuments = { ...prev.documents };
          for (const result of uploadedDocuments) {
            const documentType = result?.documentType;
            const uploadedUrl = result?.uploaded?.documentUrl;
            const uploadedId = result?.uploaded?.id;
            if (!documentType || !uploadedUrl || !nextDocuments[documentType]) continue;

            nextDocuments[documentType] = {
              ...nextDocuments[documentType],
              id: uploadedId || nextDocuments[documentType]?.id,
              uri: uploadedUrl,
              documentUrl: uploadedUrl,
              status: result?.uploaded?.status || nextDocuments[documentType]?.status || 'pending',
              ocrResult: result?.uploaded?.ocrResult || result?.uploaded?.ocr_result || nextDocuments[documentType]?.ocrResult || null
            };
          }

          return {
            ...prev,
            documents: nextDocuments
          };
        });

        if (rejectedUploads.length > 0) {
          const firstReason =
            rejectedUploads[0]?.uploaded?.ocrResult?.verificationReason ||
            rejectedUploads[0]?.uploaded?.ocr_result?.verificationReason ||
            t("screens.owner.carformscreen.documentRejete");
          Alert.alert(t("screens.owner.carformscreen.documentRejete"), firstReason);
        }
      }
    }
  };

  const submitCreateCar = async () => {
    if (!createOwnerCar) {
      throw new Error('createOwnerCar function is not available. Please restart the app.');
    }

    const carId = draftCarId || (await createOwnerCar({
      token,
      payload: buildCarPayload()
    }))?.id;
    if (!carId) throw new Error('Création du véhicule échouée');

    if (draftCarId) {
      await updateOwnerCar({
        token,
        carId,
        payload: buildCarPayload()
      });
    }

    await createCarExtras(carId);
  };

  const submitUpdateCar = async () => {
    if (!updateOwnerCar) {
      throw new Error('updateOwnerCar function is not available. Please restart the app.');
    }

    const updatedCar = await updateOwnerCar({
      token,
      carId: car.id,
      payload: buildCarPayload()
    });

    const carId = updatedCar?.id || car.id;
    await createCarExtras(carId);
  };

  const submitCreate = async () => {
    const carPayload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      color: form.color.trim(),
      fuelType: form.fuelType,
      transmission: form.transmission,
      mileage: form.mileage ? Number(form.mileage) : 0,
      seats: Number(form.seats),
      description: form.description.trim()
    };

    const carId = draftCarId || (await createOwnerCar({
      token,
      payload: carPayload
    }))?.id;
    if (!carId) throw new Error('Creation du vehicule echouee');

    if (draftCarId) {
      await updateOwnerCar({
        token,
        carId,
        payload: carPayload
      });
    }

    await createCarExtras(carId);

    await createOwnerListing({
      token,
      payload: {
        carId,
        title: form.title.trim(),
        description: form.description.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        pricePerDay: Number(form.pricePerDay),
        pickupAddress: form.pickupAddress.trim(),
        deliveryFee: Number(form.deliveryFee || 0),
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        isActive: false
      }
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
        isActive: false
      }
    });
  };

  const submit = async () => {
    if (!canSubmit) return Alert.alert(t("screens.owner.carformscreen.champsRequis"), t("screens.owner.carformscreen.veuillezRemplirLesChampsObligatoires"));

    if (Object.keys(stagedDocuments).length > 0) {
      return Alert.alert(t("screens.owner.carformscreen.documentsEnAttente"), t("screens.owner.carformscreen.veuillezConfirmerOuAnnulerLesDocumentsEn")


      );
    }

    setIsSubmitting(true);
    try {
      if (isCreateCar) await submitCreateCar();else
      if (isEditCar) await submitUpdateCar();else
      if (isCreateCarAndListing) await submitCreate();else
      if (isCreateListingOnly) await submitCreateListingOnly();else
      await submitEdit();

      if (isCarForm) {
        navigation.navigate('OwnerCars', { token, user });
      } else {
        navigation.navigate('OwnerListings', { token, user });
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(t("screens.owner.carformscreen.erreur"), getFriendlyError(error, t));
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
    <AppBackground contentStyle={[styles.safeArea, { backgroundColor: 'transparent' }]}>
      <View style={[styles.container, { backgroundColor: colors.overlay }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isCreateCarAndListing ? 'Publier un véhicule' : isCreateCar ? t("screens.owner.carsscreen.ajouterUnVehicule") : isCreateListingOnly ? 'Nouvelle annonce' : isEditCar ? 'Modifier le véhicule' : 'Modifier annonce'}</Text>
          {isEditCar && car?.id ?
          <TouchableOpacity
            onPress={() => navigation.navigate('OwnerCarReviews', { token, carId: car.id, car })}
            style={styles.iconBtn}
            activeOpacity={0.85}>
            
              <Ionicons name="chatbubbles-outline" size={20} color={colors.text} />
            </TouchableOpacity> :

          <View style={styles.iconBtn} />
          }
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isCreateListingOnly ?
          <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.owner.carformscreen.vehicule")}</Text>
              <View style={styles.optionRow}>
                {cars.map((car) =>
              <TouchableOpacity key={car.id} style={[styles.optionPill, form.carId === car.id && styles.optionPillActive]} onPress={() => setField('carId', car.id)}>
                    <Text style={[styles.optionText, { color: colors.textMuted }, form.carId === car.id && { color: colors.text, fontWeight: '700' }]}>{car.brand} {car.model}</Text>
                  </TouchableOpacity>
              )}
              </View>
            </> :
          null}

          {isCarForm || isCreateCarAndListing ?
          <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.owner.carformscreen.photosDuVehicule")}</Text>
              <Text style={[styles.helpText, { color: colors.textMuted }]}>{t("screens.owner.carformscreen.touchezUneImagePourLaDefinirComme")}</Text>

              <View style={styles.imagesGrid}>
                {form.images.map((image, index) =>
              <TouchableOpacity
                key={index}
                style={[
                styles.imageCard,
                image.isPrimary && styles.primaryImageCard]
                }
                onPress={() => {
                  setForm((prev) => ({
                    ...prev,
                    images: prev.images.map((img, idx) => ({
                      ...img,
                      isPrimary: idx === index
                    }))
                  }));
                }}>
                
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />

                    {image.isPrimary ?
                <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>{t("screens.owner.carformscreen.principale")}</Text>
                      </View> :

                <View style={styles.secondaryBadge}>
                        <Text style={styles.secondaryText}>{t("screens.owner.carformscreen.definirPrincipale")}</Text>
                      </View>
                }

                    <TouchableOpacity
                  style={styles.deleteImageBtn}
                  onPress={() => {
                    setForm((prev) => {
                      const updatedImages = prev.images.filter((_, idx) => idx !== index);
                      if (!updatedImages.some((img) => img.isPrimary) && updatedImages.length > 0) {
                        updatedImages[0].isPrimary = true;
                      }
                      return {
                        ...prev,
                        images: updatedImages
                      };
                    });
                  }}>
                  
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
              )}

                {form.images.length < 3 &&
              <TouchableOpacity style={styles.addImageCard} onPress={pickImages}>
                    <Ionicons name="add" size={32} color="#8f7dff" />
                  </TouchableOpacity>
              }
              </View>

                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{isCarForm ? isEditCar ? 'Modifier le véhicule' : t("screens.owner.carsscreen.ajouterUnVehicule") : 'Informations générales'}</Text>

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.marque")}</Text>
                  <TextInput style={styles.input} value={form.brand} onChangeText={(v) => setField('brand', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.modele")}</Text>
                  <TextInput style={styles.input} value={form.model} onChangeText={(v) => setField('model', v)} />
                </View>
              </View>

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.annee")}</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.year} onChangeText={(v) => setField('year', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.couleur")}</Text>
                  <TextInput style={styles.input} value={form.color} onChangeText={(v) => setField('color', v)} />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.carburant")}</Text>
              <View style={styles.optionRow}>
                {fuelOptions.map((fuel) =>
              <TouchableOpacity
                key={fuel}
                style={[styles.optionPill, form.fuelType === fuel && styles.optionPillActive]}
                onPress={() => setField('fuelType', fuel)}>
                
                    <Text style={[styles.optionText, form.fuelType === fuel && styles.optionTextActive]}>{fuel}</Text>
                  </TouchableOpacity>
              )}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.boite")}</Text>
              <View style={styles.optionRow}>
                {transmissionOptions.map((option) =>
              <TouchableOpacity
                key={option}
                style={[styles.optionPill, form.transmission === option && styles.optionPillActive]}
                onPress={() => setField('transmission', option)}>
                
                    <Text style={[styles.optionText, form.transmission === option && styles.optionTextActive]}>{option}</Text>
                  </TouchableOpacity>
              )}
              </View>

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.places")}</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.seats} onChangeText={(v) => setField('seats', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.kilometrage")}</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.mileage} onChangeText={(v) => setField('mileage', v)} />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.immatriculation")}</Text>
              <TextInput style={styles.input} value={form.registrationNumber} onChangeText={(v) => setField('registrationNumber', v)} />

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.description")}</Text>
              <TextInput style={[styles.input, styles.textArea]} multiline value={form.description} onChangeText={(v) => setField('description', v)} />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.owner.carformscreen.documentsDuVehicule")}</Text>
              <View style={styles.documentsContainer}>
                {[
              {
                key: 'carte_grise',
                label: t("screens.owner.carformscreen.carteGrise")
              },
              {
                key: 'insurance',
                label: t("screens.owner.carformscreen.assurance")
              },
              {
                key: 'technical_control',
                label: t("screens.owner.carformscreen.controleTechnique")
              }].
              map((doc) => {
                const document = form.documents[doc.key] || {};
                const staged = stagedDocuments[doc.key];

                if (staged) {
                  return (
                    <View key={doc.key} style={styles.documentCard}>
                        <Ionicons
                        name="document-text-outline"
                        size={24}
                        color="#ffb347" />
                      
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docTitle}>{doc.label}</Text>
                          <Text style={styles.docName} numberOfLines={1}>
                            {staged.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#ffb347', marginTop: 4 }}>{t("screens.owner.carformscreen.nouveauFichierNonEnregistre")}

                        </Text>
                        </View>
                        <View style={styles.documentActions}>
                          <TouchableOpacity
                          style={[styles.documentActionBtn, { backgroundColor: 'rgba(46, 204, 113, 0.2)' }]}
                          onPress={() => confirmDocumentUpload(doc.key)}>
                          
                            <Ionicons name="checkmark-outline" size={18} color="#2ecc71" />
                          </TouchableOpacity>
                          <TouchableOpacity
                          style={[styles.documentActionBtn, { backgroundColor: 'rgba(255, 107, 107, 0.2)' }]}
                          onPress={() => cancelDocumentUpload(doc.key)}>
                          
                            <Ionicons name="close-outline" size={18} color="#ff6b6b" />
                          </TouchableOpacity>
                        </View>
                      </View>);

                }

                return (
                  <TouchableOpacity
                    key={doc.key}
                    style={styles.documentCard}
                    onPress={() => handleDocumentPress(doc.key)}>
                    
                      <Ionicons
                      name="document-text-outline"
                      size={24}
                      color="#8f7dff" />
                    

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docTitle, { color: colors.text }]}>{doc.label}</Text>
                        <Text style={[styles.docName, { color: colors.textMuted }]} numberOfLines={1}>
                          {document.uri ? document.name : 'Ajouter un document'}
                        </Text>
                        <View
                        style={[
                        styles.docStatusBadge,
                        { backgroundColor: getStatusColor(document.status) }]
                        }>
                        
                          <Text style={[styles.docStatusText, { color: colors.text }]}>
                            {getStatusText(document.status)}
                          </Text>
                        </View>
                        {getDocumentReason(document) ?
                      <Text style={[styles.docReasonText, { color: colors.textMuted }]} numberOfLines={2}>
                            {getDocumentReason(document)}
                          </Text> :
                      null}
                      </View>

                      <View style={styles.documentActions}>
                        {document.uri ?
                      <>
                            <TouchableOpacity
                          style={styles.documentActionBtn}
                          onPress={() => pickDocument(doc.key)}>
                          
                              <Ionicons name="create-outline" size={18} color="#8f7dff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                          style={styles.documentActionBtn}
                          onPress={() => handleDocumentDelete(doc.key)}>
                          
                              <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                            </TouchableOpacity>
                          </> :

                      <TouchableOpacity
                        style={styles.documentActionBtn}
                        onPress={() => pickDocument(doc.key)}>
                        
                            <Ionicons name="cloud-upload-outline" size={18} color="#8f7dff" />
                          </TouchableOpacity>
                      }
                      </View>
                    </TouchableOpacity>);

              })}
              </View>
            </> :
          null}

          {!isCarForm ?
          <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("screens.owner.carformscreen.tarificationLocalisation")}</Text>
              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.titreAnnonce")}</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={(v) => setField('title', v)} />

              <View style={styles.twoCols}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.prixJourDa")}</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={form.pricePerDay} onChangeText={(v) => setField('pricePerDay', v)} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.ville")}</Text>
                  <TextInput style={styles.input} value={form.city} onChangeText={(v) => setField('city', v)} />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.adresseDeRecuperationChezVousAgence")}</Text>
              <TextInput
              style={styles.input}
              value={form.pickupAddress}
              onChangeText={(v) => setField('pickupAddress', v)}
              placeholder={t("screens.owner.carformscreen.ex12RueAlger")}
              placeholderTextColor="#9aa3d8" />
            

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.fraisDeLivraisonDa")}</Text>
              <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.deliveryFee}
              onChangeText={(v) => setField('deliveryFee', v)}
              placeholder="0"
              placeholderTextColor="#9aa3d8" />
            

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.pays")}</Text>
              <TextInput style={styles.input} value={form.country} onChangeText={(v) => setField('country', v)} />

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.description2")}</Text>
              <TextInput style={[styles.input, styles.textArea]} multiline value={form.description} onChangeText={(v) => setField('description', v)} />

              <Text style={[styles.label, { color: colors.text }]}>{t("screens.owner.carformscreen.selectionnezVosDates")}</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => setIsRangeCalendarOpen((prev) => !prev)}>
                <Text style={form.availableFrom ? styles.dateValue : styles.datePlaceholder}>
                  {form.availableFrom ? `${form.availableFrom} -> ${form.availableTo || '...'}` : 'Choisir la periode'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#cfd3ff" />
              </TouchableOpacity>

              {isRangeCalendarOpen ?
            <View style={styles.datePickerWrap}>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#8A2BE2' }]} /><Text style={styles.legendText}>{t("screens.owner.carformscreen.selection")}</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#B9A5E8' }]} /><Text style={styles.legendText}>{t("screens.owner.carformscreen.indisponible")}</Text></View>
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
                  textSectionTitleColor: '#5D678E',
                  monthTextColor: '#11162B',
                  dayTextColor: '#11162B',
                  todayTextColor: '#8A2BE2',
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
                      backgroundColor: '#E1D8F7',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }
                  }
                }} />
              
                  <Text style={styles.hint}>{isSelectingEndDate ? 'Selectionnez la date de fin.' : 'Periode selectionnee.'}</Text>
                </View> :
            null}
            </> :
          null}

          <TouchableOpacity style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]} onPress={submit} disabled={!canSubmit || isSubmitting}>
            <Text style={styles.submitText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </AppBackground>);

};

// Debug: Log if updateOwnerCar is available on mount
if (!globalThis.__updateOwnerCarLogged) {
  globalThis.__updateOwnerCarLogged = true;
  console.log('[carFormScreen] updateOwnerCar available:', typeof updateOwnerCar);
}

export default OwnerCarFormScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(225,216,247,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.16)'
  },
  headerTitle: { color: '#11162B', fontSize: 22, fontWeight: '800' },
  content: { paddingBottom: 24 },
  sectionTitle: { color: '#11162B', marginTop: 12, marginBottom: 8, fontSize: 18, fontWeight: '800' },
  helpText: { color: '#5D678E', marginBottom: 8, fontSize: 13 },
  label: { color: '#11162B', marginTop: 8, marginBottom: 6, fontWeight: '600' },
  twoCols: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.22)',
    backgroundColor: 'rgba(225,216,247,0.78)',
    color: '#11162B',
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  imageInput: { flex: 1 },
  imageRemoveBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A2BE2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8
  },
  addImageButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { color: '#5D678E', marginTop: 8, marginBottom: 4, lineHeight: 20 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: 2 },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(225,216,247,0.68)'
  },
  optionPillActive: { backgroundColor: 'rgba(138,43,226,0.18)', borderColor: '#8A2BE2' },
  optionText: { color: '#5D678E', fontWeight: '500' },
  optionTextActive: { color: '#11162B', fontWeight: '700' },
  dateInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.22)',
    backgroundColor: 'rgba(225,216,247,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateValue: { color: '#11162B' },
  datePlaceholder: { color: '#5D678E' },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.22)',
    backgroundColor: '#E1D8F7',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  legendRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingHorizontal: 8 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(117,94,171,0.22)',
    backgroundColor: 'rgba(225,216,247,0.76)',
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  legendDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  legendText: { color: '#11162B', fontWeight: '700', fontSize: 12 },
  submitBtn: { marginTop: 16, borderRadius: 12, backgroundColor: '#8A2BE2', alignItems: 'center', paddingVertical: 13 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  imagesGrid: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 12 },
  imageCard: {
    width: 100,
    height: 100,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  primaryImageCard: { borderColor: '#8A2BE2' },
  previewImage: { width: '100%', height: '100%' },
  addImageCard: {
    width: 100,
    height: 100,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(225,216,247,0.78)'
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(17,22,43,0.12)',
    width: 28,
    height: 28,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center'
  },
  primaryBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#8A2BE2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  primaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  secondaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(138,43,226,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  secondaryText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  documentsContainer: { gap: 12, marginTop: 10 },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(225,216,247,0.78)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(146,151,214,0.25)'
  },
  docTitle: { color: '#11162B', fontWeight: '700' },
  docName: { color: '#5D678E', marginTop: 4, maxWidth: 160 },
  docStatusBadge: { marginTop: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  docStatusText: { color: '#11162B', fontSize: 11, fontWeight: '700' },
  docReasonText: { marginTop: 6, color: '#5D678E', fontSize: 12, lineHeight: 16, maxWidth: 190 },
  documentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  documentActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,22,43,0.08)'
  }
});
