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
    // Check for existing cart
    const { data: existingCart } = await supabase
      .from('cart')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingCart) {
      return existingCart.id
    }

    // Create new cart if none exists
    const { data: newCart, error } = await supabase
      .from('cart')
      .insert({ user_id: userId })
      .select('id')
      .single()

    if (error) throw error
    return newCart.id
  }

  // Load cart items
  const loadCartItems = async (cartId) => {
    const { data: cartItems, error } = await supabase
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
          stock_quantity,
          seller_id
        )
      `)
      .eq('cart_id', cartId)

    if (error) throw error
    return cartItems || []
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const me = auth?.user || null
        
        if (!me) {
          router.push('/auth')
          return
        }

        setUser(me)

        // Get or create cart
        const cartId = await getOrCreateCart(me.id)
        setCartId(cartId)

        // Load cart items
        const cartItems = await loadCartItems(cartId)
        setItems(cartItems)

      } catch (error) {
        console.error('Error initializing cart:', error)
        setErrorMsg('Failed to load cart')
      } finally {
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

  // ... rest of your component code (proceedToPayment, etc.) ...

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