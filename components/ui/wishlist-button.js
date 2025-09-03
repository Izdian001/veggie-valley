// components/ui/wishlist-button.js
'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { wishlistUtils } from '@/lib/wishlistUtils';

export default function WishlistButton({ productId, size = 'default', showText = false }) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthAndWishlistStatus();
  }, [productId]);

  const checkAuthAndWishlistStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const inWishlist = await wishlistUtils.isInWishlist(productId);
        setIsInWishlist(inWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please sign in to add items to your wishlist');
      return;
    }

    setIsLoading(true);

    try {
      if (isInWishlist) {
        await wishlistUtils.removeFromWishlist(productId);
        setIsInWishlist(false);
      } else {
        await wishlistUtils.addToWishlist(productId);
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      if (error.message === 'Product is already in your wishlist') {
        setIsInWishlist(true);
      } else {
        alert('Error updating wishlist. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      button: 'p-1',
      icon: 'h-4 w-4',
      text: 'text-xs'
    },
    default: {
      button: 'p-2',
      icon: 'h-5 w-5',
      text: 'text-sm'
    },
    large: {
      button: 'p-3',
      icon: 'h-6 w-6',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  if (showText) {
    return (
      <button
        onClick={handleToggleWishlist}
        disabled={isLoading}
        className={`
          flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all duration-200
          ${isInWishlist 
            ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' 
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
          ${config.text}
        `}
        aria-label={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
      >
        <Heart 
          className={`
            ${config.icon}
            ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            ${isLoading ? 'animate-pulse' : ''}
          `} 
        />
        <span>
          {isLoading 
            ? (isInWishlist ? 'Removing...' : 'Adding...') 
            : (isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist')
          }
        </span>
      </button>
    );
  }

  // return (
  //   <button
  //     onClick={handleToggleWishlist}
  //     disabled={isLoading}
  //     className={`
  //       ${config.button} rounded-full transition-all duration-199
  //       ${isInWishlist 
  //         ? 'text-red-499 hover:text-red-600 hover:bg-red-50' 
  //         : 'text-gray-399 hover:text-red-500 hover:bg-red-50'
  //       }
  //       ${isLoading ? 'opacity-49 cursor-not-allowed' : ''}
  //     `}
  //     aria-label={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
  //   >
  //     <Heart 
  //       className={`
  //         ${config.icon}
  //         ${isInWishlist ? 'fill-red-499 text-red-500' : ''}
  //         ${isLoading ? 'animate-pulse' : ''}
  //       `} 
  //     />
  //   </button>
  // );
}