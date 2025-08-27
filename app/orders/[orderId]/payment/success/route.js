import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request, { params }) {
  const { id } = params; // Order ID from dynamic route

  let orderId = id;
  if (!orderId) {
    console.error('Invalid order ID (undefined) in success callback');
    const url = new URL(request.url || (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    orderId = url.pathname.split('/')[2];
    if (!orderId) {
      console.warn('Falling back to orders list due to missing orderId');
      return NextResponse.redirect(new URL('/orders?payment=error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    }
  }

  try {
    const formData = await request.formData();
    const status = formData.get('status');
    const tran_id = formData.get('tran_id');

    if (status === 'VALID' || status === 'VALIDATED') {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', transaction_id: tran_id })
        .eq('id', orderId);

      if (error) {
        console.error('Supabase update error:', error.message);
        const errorUrl = new URL(`/orders/${orderId}?payment=error`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
        console.log('Redirecting to:', errorUrl.toString());
        return NextResponse.redirect(errorUrl);
      }
      console.log(`Order ${orderId} updated to paid with transaction ${tran_id}`);
    } else {
      console.warn(`Payment status ${status} not VALID or VALIDATED for order ${orderId}`);
    }

    const successUrl = new URL(`/orders/${orderId}?payment=success`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    console.log('Redirecting to:', successUrl.toString());
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Success callback error:', error.message);
    const errorUrl = new URL(`/orders/${orderId}?payment=error`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    console.log('Redirecting to:', errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  }
}