import { NextResponse } from 'next/server';
import axios from 'axios'; // Use axios for HTTP requests

export async function POST(request) {
  const { orderId, total } = await request.json();

  const data = new URLSearchParams({
    store_id: process.env.STORE_ID,
    store_passwd: process.env.STORE_PASSWD,
    total_amount: total,
    currency: 'BDT', // Sandbox defaults to BDT
    tran_id: `VV_${orderId}_${Date.now()}`, // Unique ID
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/payment/success`,
    fail_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/payment/fail`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/payment/cancel`,
    ipn_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/ipn`,
    shipping_method: 'NO',
    product_name: 'Veggie Valley Order',
    product_category: 'Food',
    product_profile: 'general',
    cus_name: 'Customer', // Fetch from DB if needed
    cus_email: 'customer@example.com',
    cus_add1: 'Dhaka',
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: '01711111111',
    cus_fax: '01711111111',
    ship_name: 'Customer',
    ship_add1: 'Dhaka',
    ship_add2: 'Dhaka',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: 1000,
    ship_country: 'Bangladesh',
  }).toString();

  try {
    const response = await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result = response.data;
    if (result.status === 'SUCCESS' && result.GatewayPageURL) {
      return NextResponse.json({ GatewayPageURL: result.GatewayPageURL });
    } else {
      return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}