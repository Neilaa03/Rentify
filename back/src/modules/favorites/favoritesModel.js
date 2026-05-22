import { supabase } from '../../config/supabase.js';
import { listingBaseSelect, toListingDto } from '../car-listings/listingModel.js';

const FAVORITES_TABLE = 'favorites';

export const getUserFavorites = async ({ userId }) => {
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select(`created_at, listings!inner(${listingBaseSelect})`)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const items = (data || [])
    .map((row) => row?.listings)
    .filter(Boolean)
    .map(toListingDto);

  return {
    ids: items.map((item) => item.id),
    items,
  };
};

export const isListingFavorited = async ({ userId, listingId }) => {
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id && data?.is_active);
};

export const addFavorite = async ({ userId, listingId }) => {
  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .upsert(
      [
        {
          user_id: userId,
          listing_id: listingId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'user_id,listing_id' }
    );

  if (error) throw error;
};

export const removeFavorite = async ({ userId, listingId }) => {
  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('listing_id', listingId);

  if (error) throw error;
};
