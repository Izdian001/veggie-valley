'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { formatBDT } from '@/lib/currency'

export default function CartPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cartId, setCartId] = useState(null)
  const [items, setItems] = useState([])
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Get or create cart for the user
  const getOrCreateCart = async (userId) => {
    try {
      console.log('Checking for existing cart for user:', userId)
      
      // First, try to get existing cart
      const { data: existingCart, error: fetchError } = await supabase
        .from('cart')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is expected
        console.error('Error fetching cart:', fetchError)
        throw new Error(`Failed to fetch cart: ${fetchError.message}`)
      }

      if (existingCart?.id) {
        console.log('Found existing cart:', existingCart.id)
        return existingCart.id
      }

      console.log('No existing cart found, creating new cart')
      
      // If no cart exists, create a new one
      const { data: newCart, error: createError } = await supabase
        .from('cart')
        .insert({ user_id: userId })
        .select('id')
        .single()

      if (createError || !newCart) {
        const errorMsg = createError?.message || 'Failed to create cart: No data returned'
        console.error('Error creating cart:', errorMsg)
        throw new Error(`Failed to create cart: ${errorMsg}`)
      }

      console.log('Created new cart:', newCart.id)
      return newCart.id
      
    } catch (error) {
      console.error('Error in getOrCreateCart:', error)
      throw new Error(`Cart operation failed: ${error.message}`)
    }
  }

  // Load cart items
  const loadCartItems = async (cartId) => {
    if (!cartId) {
      console.error('No cart ID provided to loadCartItems')
      throw new Error('Invalid cart ID')
    }

    try {
      console.log('Loading cart items for cart:', cartId)
      
      const { data: cartItems, error, status, statusText } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          products (
            id,
            name,
            price,
            images,
            seller_id
          )
        `)
        .eq('cart_id', cartId)

      console.log('Cart items query status:', status, statusText)
      
      if (error) {
        console.error('Error loading cart items:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Failed to load cart items: ${error.message}`)
      }

      if (!Array.isArray(cartItems)) {
        console.error('Invalid cart items format:', cartItems)
        return []
      }

      console.log(`Successfully loaded ${cartItems.length} cart items`)
      return cartItems
      
    } catch (error) {
      console.error('Error in loadCartItems:', {
        message: error.message,
        stack: error.stack
      })
      throw new Error(`Failed to load cart: ${error.message}`)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing cart...')
        
        // Check authentication
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) {
          console.error('Auth error:', authError)
          throw new Error('Authentication failed')
        }
        
        const me = auth?.user
        if (!me) {
          console.log('No user found, redirecting to auth')
          router.push('/auth')
          return
        }

        console.log('User authenticated:', me.id)
        setUser(me)

        // Get or create cart
        console.log('Getting or creating cart...')
        const cartId = await getOrCreateCart(me.id)
        console.log('Using cart ID:', cartId)
        
        if (!cartId) {
          throw new Error('Failed to get or create cart')
        }
        
        setCartId(cartId)

        // Load cart items
        console.log('Loading cart items...')
        const cartItems = await loadCartItems(cartId)
        console.log('Loaded cart items:', cartItems)
        
        if (!Array.isArray(cartItems)) {
          console.error('Invalid cart items data:', cartItems)
          throw new Error('Invalid cart data received')
        }
        
        setItems(cartItems)
        
      } catch (error) {
        console.error('Cart initialization error:', error)
        setErrorMsg(error.message || 'Failed to load cart. Please try again.')
      } finally {
        console.log('Cart initialization complete')
        setLoading(false)
      }
    }

    init()
  }, [router])

  // Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))

    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Failed to update quantity')
    } finally {
      setUpdating(false)
    }
  }

  // Remove item from cart
  const removeItem = async (itemId) => {
    if (!confirm('Remove this item from your cart?')) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      // Update local state
      setItems(items.filter(item => item.id !== itemId))

    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setUpdating(false)
    }
  }

  // Calculate total
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (Number(item.products?.price || 0) * item.quantity)
    }, 0)
  }, [items])

  // Handle checkout with multiple sellers
  const proceedToPayment = async () => {
    if (items.length === 0) {
      setErrorMsg('Your cart is empty')
      return
    }
    
    if (!user) {
      setErrorMsg('Please sign in to proceed to checkout')
      router.push('/auth')
      return
    }
    
    setUpdating(true)
    setErrorMsg('')
    
    try {
      // Group items by seller
      const itemsBySeller = items.reduce((acc, item) => {
        const sellerId = item.products?.seller_id;
        if (!sellerId) {
          console.warn('Item has no seller_id:', item);
          return acc;
        }
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {});

      // Create orders for each seller
      const orders = await Promise.all(
        Object.entries(itemsBySeller).map(async ([sellerId, sellerItems]) => {
          // Calculate total for this seller's items
          const sellerTotal = sellerItems.reduce((sum, item) => {
            return sum + ((item.products?.price || 0) * item.quantity);
          }, 0);

          // Create order for this seller
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              buyer_id: user.id,
              seller_id: sellerId,
              status: 'pending',
              total_amount: sellerTotal,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (orderError) throw orderError;

          // Create order items for this seller
          const orderItems = sellerItems.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.products?.price || 0,  // Add unit_price from product
            created_at: new Date().toISOString()
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (itemsError) throw itemsError;

          return order.id;
        })
      );

      // Don't clear the cart after successful order
      // Items will remain in the cart for future purchases

      // Redirect to the first order's payment page
      if (orders.length > 0) {
        router.push(`/orders/${orders[0]}/pay`);
      } else {
        throw new Error('No orders were created');
      }

    } catch (error) {
      console.error('Error during checkout:', error);
      setErrorMsg(error.message || 'Failed to process your order. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      
      {loading ? (
        <p>Loading cart...</p>
      ) : errorMsg ? (
        <p className="text-red-500">{errorMsg}</p>
      ) : items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="border p-4 rounded-lg flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {item.products?.images?.[0] && (
                  <img 
                    src={item.products.images[0]} 
                    alt={item.products.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium">{item.products?.name}</h3>
                  <p>{formatBDT(item.products?.price || 0)} × {item.quantity}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={updating || item.quantity <= 1}
                    className="px-2 py-1 border rounded"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={updating}
                    className="px-2 py-1 border rounded"
                  >
                    +
                  </button>
                </div>
                
                <button 
                  onClick={() => removeItem(item.id)}
                  disabled={updating}
                  className="text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="font-bold">Total:</span>
              <span className="text-xl font-bold">{formatBDT(total)}</span>
            </div>
            
            <button
              onClick={proceedToPayment}
              disabled={updating || items.length === 0}
              className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {updating ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}