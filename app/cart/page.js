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
  const [items, setItems] = useState([]) // [{ id, product_id, quantity, unit_price, product: {...} }]
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

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

        // fetch role to ensure buyer-only access (best-effort)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', me.id)
            .maybeSingle()
          setRole(profile?.role || null)
          if (profile?.role && profile.role !== 'buyer') {
            router.push('/dashboard')
            return
          }
        } catch (e) {
          // If profiles are protected by RLS, don't block cart; treat as buyer by default
          console.warn('Could not load profile role; proceeding as buyer')
        }

        // Find or create cart
        let cid = null
        const { data: existingCart, error: cartSelErr } = await supabase
          .from('cart')
          .select('id')
          .eq('user_id', me.id)
          .maybeSingle()
        // If select failed due to RLS or not found, try to create the cart instead of failing hard
        cid = existingCart?.id || null
        if (!cid) {
          const { data: newCart, error: cartInsErr } = await supabase
            .from('cart')
            .insert({ user_id: me.id })
            .select('id')
            .single()
          if (cartInsErr) throw cartInsErr
          cid = newCart.id
        }
        setCartId(cid)

        await loadItems(cid)
      } catch (e) {
        console.error('Error initializing cart page', e)
        setErrorMsg(e?.message || 'Failed to load cart')
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadItems = async (cid) => {
    try {
      const { data: rows, error } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('cart_id', cid)
      if (error) throw error

      const productIds = [...new Set((rows || []).map(r => r.product_id))]
      let productsMap = {}
      if (productIds.length > 0) {
        const { data: prods, error: prodErr } = await supabase
          .from('products')
          .select('id, name, price, unit, images, seller_id')
          .in('id', productIds)
        if (prodErr) throw prodErr
        productsMap = (prods || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {})
      }

      const enriched = (rows || []).map(r => ({
        ...r,
        product: productsMap[r.product_id] || null,
      }))
      setItems(enriched)
      setErrorMsg('')
    } catch (e) {
      console.error('Failed to load items', e)
      setItems([])
      setErrorMsg(e?.message || 'Failed to load cart items')
    }
  }

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.product?.price || 0) * (it.quantity || 0)), 0)
  }, [items])

  const updateQuantity = async (itemId, newQty) => {
    if (newQty <= 0) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', itemId)
      if (error) throw error
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, quantity: newQty } : it))
    } catch (e) {
      console.error('Failed to update quantity', e)
      alert('Failed to update quantity')
    } finally {
      setUpdating(false)
    }
  }

  const removeItem = async (itemId) => {
    if (!confirm('Remove this item from your cart?')) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
      if (error) throw error
      setItems(prev => prev.filter(it => it.id !== itemId))
    } catch (e) {
      console.error('Failed to remove item', e)
      alert('Failed to remove item')
    } finally {
      setUpdating(false)
    }
  }

  const proceedToPayment = async () => {
    try {
      if (!user) {
        router.push('/auth');
        return;
      }
      if (items.length === 0) {
        alert('Your cart is empty.');
        return;
      }

      // Get user's address
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('address, phone')
        .eq('id', user.id)
        .single();

      const deliveryAddress = userProfile?.address || 'Default Delivery Address';
      const phone = userProfile?.phone || '';

      // Group items by seller
      const itemsBySeller = {};
      items.forEach(item => {
        if (!item.product?.seller_id) return;
        if (!itemsBySeller[item.product.seller_id]) {
          itemsBySeller[item.product.seller_id] = [];
        }
        itemsBySeller[item.product.seller_id].push(item);
      });

      // Create orders for each seller
      const orderPromises = Object.entries(itemsBySeller).map(async ([sellerId, sellerItems]) => {
        // Calculate order total
        const orderTotal = sellerItems.reduce((sum, item) => {
          return sum + (Number(item.product?.price || 0) * Number(item.quantity || 0));
        }, 0);

        // Create the order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            status: 'pending',
            total_amount: orderTotal,
            order_date: new Date().toISOString(),
            delivery_address: deliveryAddress,
            phone: phone,
            payment_status: 'pending'
          })
          .select('*')
          .single();

        if (orderError) throw orderError;

        // Prepare order items
        const orderItems = sellerItems.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: Number(item.product?.price || 0),
        }));

        // Add order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Notify seller
        await supabase.from('messages').insert({
          order_id: order.id,
          sender_id: user.id,
          receiver_id: sellerId,
          message_text: `New order #${order.id} has been placed with ${sellerItems.length} item(s)`,
          created_at: new Date().toISOString()
        });

        return order;
      });

      // Wait for all orders to be created
      const orders = await Promise.all(orderPromises);
      
      if (orders.length === 0) {
        throw new Error('No valid items to order');
      }

      // Clear the cart after successful order creation
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

      // Redirect to the first order's payment page
      router.push(`/orders/${orders[0].id}/pay`);

    } catch (e) {
      console.error('Failed to proceed to payment', e);
      alert(e.message || 'Failed to create order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Go to Products
          </button>
        </div>
        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <p className="text-gray-600 mb-4">Your cart is empty.</p>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map(it => (
                <div key={it.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {it.product?.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.product.images[0]} alt={it.product?.name || 'Product'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🥬</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{it.product?.name || 'Product'}</p>
                    <p className="text-sm text-gray-500">{formatBDT(it.product?.price ?? 0)}/{it.product?.unit || 'unit'}</p>
                    <div className="mt-2 flex items-center gap-4">
                      <span className="text-sm text-gray-600">Quantity: {it.quantity}</span>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="text-red-600 hover:underline"
                        disabled={updating}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatBDT(((it.product?.price ?? 0) * (it.quantity || 0)))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-gray-900 border-t pt-3 mt-3">
                  <span>Total</span>
                  <span>{formatBDT(total)}</span>
                </div>
                <button
                  onClick={proceedToPayment}
                  className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
