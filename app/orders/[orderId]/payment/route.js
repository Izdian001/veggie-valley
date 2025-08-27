import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request, { params }) {
  const { id: orderId } = params; // Extract orderId from dynamic route

  // Safeguard and extract orderId from request URL if params.id is undefined
  let validatedOrderId = orderId;
  if (!validatedOrderId) {
    console.error('Invalid order ID (undefined) in payment callback');
    const url = new URL(request.url || (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    validatedOrderId = url.pathname.split('/')[2]; // Extract orderId from /orders/[orderId]/payment/...
    if (!validatedOrderId) {
      console.warn('Falling back to orders list due to missing orderId');
      return NextResponse.redirect(new URL('/orders?payment=error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    }
  }

  try {
    const formData = await request.formData();
    const status = formData.get('status');
    const tran_id = formData.get('tran_id');
    const error_msg = formData.get('error'); // For fail/error cases

    console.log('Payment callback received:', { orderId: validatedOrderId, status, tran_id, error_msg });

    if (status === 'VALID' || status === 'VALIDATED') {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', transaction_id: tran_id })
        .eq('id', validatedOrderId);

      if (error) {
        console.error('Supabase update error:', error.message);
        return NextResponse.redirect(new URL(`/orders/${validatedOrderId}?payment=error`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
      }
      console.log(`Order ${validatedOrderId} updated to paid with transaction ${tran_id}`);
      return NextResponse.redirect(new URL(`/orders/${validatedOrderId}?payment=success`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    } else if (status || error_msg) {
      // Handle fail, cancel, or error cases
      const paymentStatus = status ? 'fail' : (error_msg ? 'error' : 'cancel');
      console.warn(`Payment status ${paymentStatus} for order ${validatedOrderId}`);
      return NextResponse.redirect(new URL(`/orders/${validatedOrderId}?payment=${paymentStatus}`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    } else {
      console.error('No valid payment status or error message received');
      return NextResponse.redirect(new URL(`/orders/${validatedOrderId}?payment=error`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    }
  } catch (error) {
    console.error('Payment callback error:', error.message);
    return NextResponse.redirect(new URL(`/orders/${validatedOrderId}?payment=error`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  }
}