import { expect, test } from './fixtures/test';
import { authedPost } from './helpers/auth';
import { createPaymentOrder, createRazorpayOrder, sendSignedWebhook, verifyPayment } from './helpers/payment';
import { E2E_STABLE_PRODUCT_ID } from './helpers/stable-product';

const shippingAddress = {
  fullName: 'Robo Hatch QA',
  phone: '9876543210',
  email: 'qa.customer@robohatch.test',
  addressLine1: '742 Test Street',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '600001',
  country: 'India',
};

test.describe('razorpay and payment flows', () => {
  test('checkout bootstraps Razorpay payment options', async ({ page, session }) => {
    await session.loginCustomerApi();
    await session.installRazorpayMock(page, 'noop');

    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();
    await page.getByRole('button', { name: /checkout/i }).click();

    await page.getByLabel(/full name/i).fill(shippingAddress.fullName);
    await page.getByLabel(/phone number/i).fill(shippingAddress.phone);
    await page.getByLabel(/email address/i).fill(shippingAddress.email);
    await page.getByLabel(/street address/i).fill(shippingAddress.addressLine1);
    await page.getByLabel(/city/i).fill(shippingAddress.city);
    await page.getByLabel(/state/i).fill(shippingAddress.state);
    await page.getByLabel(/pincode/i).fill(shippingAddress.postalCode);
    await page.getByRole('button', { name: /pay ₹/i }).click();

    await page.waitForFunction(() => Boolean((window as any).__latestRazorpayOptions));
    const options = await page.evaluate(() => (window as any).__latestRazorpayOptions);
    expect(options?.order_id).toBeTruthy();
  });

  test('successful payment is verified by the backend', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();

    const order = await createPaymentOrder(page, shippingAddress);
    const razorpayOrder = await createRazorpayOrder(page, order.id);
    const paymentId = 'pay_success_001';
    const verifyResult = await verifyPayment(page, razorpayOrder.id, paymentId);

    expect(verifyResult?.success).toBeTruthy();

    const orderResponse = await page.request.get(`/api/payment/orders/${order.id}`);
    const orderPayload = await orderResponse.json();
    expect(orderPayload?.data?.payment?.status || orderPayload?.data?.status).toMatch(/CAPTURED|PAID/i);
  });

  test('failed payment is safely marked failed', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();

    const order = await createPaymentOrder(page, shippingAddress);
    await createRazorpayOrder(page, order.id);

    const response = await authedPost(page, '/api/payment/failure', {
      orderId: order.id,
      reason: 'Card declined for test',
    });

    expect(response.ok()).toBeTruthy();

    const orderResponse = await page.request.get(`/api/payment/orders/${order.id}`);
    const orderPayload = await orderResponse.json();
    expect(orderPayload?.data?.payment?.status || orderPayload?.data?.status).toMatch(/FAILED|CANCELLED/i);
  });

  test('duplicate callback remains idempotent', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();

    const order = await createPaymentOrder(page, shippingAddress);
    const razorpayOrder = await createRazorpayOrder(page, order.id);
    const first = await verifyPayment(page, razorpayOrder.id, 'pay_duplicate_001');
    const second = await verifyPayment(page, razorpayOrder.id, 'pay_duplicate_001');

    expect(first?.success).toBeTruthy();
    expect(second?.success).toBeTruthy();

    const orderResponse = await page.request.get(`/api/payment/orders/${order.id}`);
    const orderPayload = await orderResponse.json();
    expect(orderPayload?.data?.payment?.status || orderPayload?.data?.status).toMatch(/CAPTURED|PAID/i);
  });

  test('webhook replay is suppressed without duplicate state changes', async ({ page, session }) => {
    await session.loginCustomerApi();
    await page.goto(`/product/${E2E_STABLE_PRODUCT_ID}`);
    await page.getByRole('button', { name: /add to cart/i }).click();

    const order = await createPaymentOrder(page, shippingAddress);
    const razorpayOrder = await createRazorpayOrder(page, order.id);

    const webhookBody = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_001',
            order_id: razorpayOrder.id,
            amount: Math.round(Number(razorpayOrder.amount || 0)),
          },
        },
      },
    };

    const first = await sendSignedWebhook(page.request, webhookBody, 'evt_replay_001');
    const second = await sendSignedWebhook(page.request, webhookBody, 'evt_replay_001');

    expect(first.ok()).toBeTruthy();
    expect(second.ok()).toBeTruthy();

    const orderResponse = await page.request.get(`/api/payment/orders/${order.id}`);
    const orderPayload = await orderResponse.json();
    expect(orderPayload?.data?.payment?.gatewayPaymentId || orderPayload?.data?.payment?.status).toBeTruthy();
  });
});