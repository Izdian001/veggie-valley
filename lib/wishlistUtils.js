// lib/wishlistUtils.js
import { supabase } from './supabaseClient';

export const wishlistUtils = {
  // Add product to wishlist
  async addToWishlist(productId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in');
      }

      const { data, error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: productId
        })
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation (product already in wishlist)
        if (error.code === '23505') {
          throw new Error('Product is already in your wishlist');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  },

  // Remove product from wishlist
  async removeFromWishlist(productId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in');
      }

      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  // Check if product is in wishlist
  async isInWishlist(productId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return false;
    }
  },

  // Get user's wishlist with product details
  async getUserWishlist() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be logged in');
      }

      const { data, error } = await supabase
        .from('wishlist_with_products')
        .select('*')
        .eq('user_id', user.id)
        .order('added_to_wishlist_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
  },

  // Get wishlist count for a user
  async getWishlistCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  },

  // Migrate localStorage wishlist to database (helper function)
  async migrateLocalStorageWishlist() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const localWishlist = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (localWishlist.length === 0) return;

      // Get existing wishlist items to avoid duplicates
      const { data: existing } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', user.id);

      const existingProductIds = existing?.map(item => item.product_id) || [];
      const newItems = localWishlist.filter(productId => !existingProductIds.includes(productId));

      if (newItems.length > 0) {
        const { error } = await supabase
          .from('wishlist')
          .insert(
            newItems.map(productId => ({
              user_id: user.id,
              product_id: productId
            }))
          );

        if (error) throw error;

        // Clear localStorage after successful migration
        localStorage.removeItem('favorites');
      }
    } catch (error) {
      console.error('Error migrating wishlist:', error);
    }
  }
};