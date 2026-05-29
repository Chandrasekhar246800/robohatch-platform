const fs = require('fs');
const crypto = require('crypto');
const fetch = global.fetch || require('node-fetch');

function parseSetCookieStrings(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/, (?=[^ ;]+=)/) : [];
  const cookies = {};

  for (const cookie of arr) {
    const firstPart = cookie.split(';')[0].trim();
    const eqIndex = firstPart.indexOf('=');
    if (eqIndex > -1) {
      const name = firstPart.slice(0, eqIndex);
      const value = firstPart.slice(eqIndex + 1);
      cookies[name] = value;
    }
  }

  return cookies;
}

(async () => {
  const api = 'http://localhost:5000';
  const email = 'e2e.customer@robohatch.local';
  const password = 'E2E_test_pass_2026!';

  // read env for secrets
  let envText = '';
  try { envText = fs.readFileSync('apps/api/.env', 'utf8'); } catch(e) {}
  const parse = (k) => {
    const m = envText.match(new RegExp(`${k}=(.*)`));
    return m ? m[1].replace(/^\"|\"$/g, '') : null;
  };
  const RAZORPAY_KEY_SECRET = parse('RAZORPAY_KEY_SECRET') || 'rzp_test_dummysecret';
  const RAZORPAY_WEBHOOK_SECRET = parse('RAZORPAY_WEBHOOK_SECRET') || 'rzp_test_dummywebhooksecret';

  function dump(label, obj){ console.log('---', label); console.log(JSON.stringify(obj, null, 2)); }

  function authedJsonHeaders(cookieHeader, csrfToken) {
    return {
      'content-type': 'application/json',
      Cookie: cookieHeader,
      'X-CSRF-Token': csrfToken,
    };
  }

  // login
  let cookies = [];
  const loginRes = await fetch(`${api}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }), redirect: 'manual' });
  const setCookie = loginRes.headers.raw ? loginRes.headers.raw()['set-cookie'] : loginRes.headers.get('set-cookie');
  const parsedCookies = parseSetCookieStrings(setCookie);
  if (Object.keys(parsedCookies).length > 0) {
    cookies = Object.entries(parsedCookies).map(([name, value]) => `${name}=${value}`);
  }
  const cookieHeader = cookies.join('; ');
  const loginBody = await loginRes.json().catch(()=>null);
  dump('login', { status: loginRes.status, body: loginBody, cookies });

  const csrfToken = loginBody?.data?.csrfToken || loginBody?.csrfToken || null;
  dump('csrfBootstrap', {
    status: 200,
    body: {
      success: true,
      data: {
        csrfToken,
      },
    },
    token: csrfToken,
  });
  if (!csrfToken) {
    console.log('ERROR: csrf token not available after login/bootstrap');
    process.exit(2);
  }

  // find product
  const prods = await fetch(`${api}/api/products/all`, { headers: { cookie: cookieHeader } });
  const prodJson = await prods.json().catch(()=>null);
  const product = (prodJson?.data||[]).find(p=>p.name && p.name.startsWith('Founder Validation Product'));
  if (!product) { console.log('ERROR: product not found'); process.exit(2); }
  dump('foundProduct', product);

  // add to cart
  const add = await fetch(`${api}/api/cart/items`, { method: 'POST', headers: authedJsonHeaders(cookieHeader, csrfToken), body: JSON.stringify({ productId: product.id, quantity: 1 }) });
  const addBody = await add.json().catch(()=>null);
  dump('addToCart', { status: add.status, body: addBody });
  if (add.status !== 201) { console.log('Add to cart failed'); process.exit(3); }

  // create order
  const shippingAddress = { fullName: 'E2E Customer', email, phone: '9999999999', addressLine1: '1 Test St', addressLine2: '', city: 'Chennai', state: 'TN', postalCode: '600001', country: 'IN' };
  const createOrder = await fetch(`${api}/api/payment/orders`, { method: 'POST', headers: authedJsonHeaders(cookieHeader, csrfToken), body: JSON.stringify({ shippingAddress }) });
  const createOrderBody = await createOrder.json().catch(()=>null);
  dump('createOrder', { status: createOrder.status, body: createOrderBody });
  if (!(createOrder.status===201 && createOrderBody?.data?.id)) { console.log('Order creation failed'); process.exit(4); }
  const orderId = createOrderBody.data.id;

  // create razorpay order
  const createRazor = await fetch(`${api}/api/payment/create-order/${orderId}`, { method: 'POST', headers: { Cookie: cookieHeader, 'X-CSRF-Token': csrfToken } });
  const createRazorBody = await createRazor.json().catch(()=>null);
  dump('createRazor', { status: createRazor.status, body: createRazorBody });
  if (!createRazorBody?.data?.id) { console.log('Razor order create failed'); process.exit(5); }
  const razorOrderId = createRazorBody.data.id;

  // simulate payment verification
  const paymentId = 'pay_' + Date.now();
  const generated = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${razorOrderId}|${paymentId}`).digest('hex');
  const verify = await fetch(`${api}/api/payment/verify`, { method: 'POST', headers: authedJsonHeaders(cookieHeader, csrfToken), body: JSON.stringify({ razorpay_order_id: razorOrderId, razorpay_payment_id: paymentId, razorpay_signature: generated }) });
  const verifyBody = await verify.json().catch(()=>null);
  dump('verify', { status: verify.status, body: verifyBody });

  // webhook simulation
  const webhookPayload = JSON.stringify({ event: 'payment.captured', payment: { entity: { id: paymentId, order_id: razorOrderId, amount: createRazorBody?.data?.amount || 0, currency: 'INR' } } });
  const webhookSig = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(webhookPayload).digest('hex');
  const webhookResp = await fetch(`${api}/api/webhook/razorpay`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': webhookSig }, body: webhookPayload });
  const webhookBody = await webhookResp.json().catch(()=>null);
  dump('webhook', { status: webhookResp.status, body: webhookBody });

  // final order status
  const orderStatus = await fetch(`${api}/api/payment/status/${orderId}`, { headers: { cookie: cookieHeader } });
  const orderStatusBody = await orderStatus.json().catch(()=>null);
  dump('orderStatus', { status: orderStatus.status, body: orderStatusBody });

  const orderWithPayment = await fetch(`${api}/api/payment/orders/${orderId}`, { headers: { cookie: cookieHeader } });
  const orderWithPaymentBody = await orderWithPayment.json().catch(()=>null);
  dump('orderWithPayment', { status: orderWithPayment.status, body: orderWithPaymentBody });

  console.log('E2E script completed');
  process.exit(0);
})();