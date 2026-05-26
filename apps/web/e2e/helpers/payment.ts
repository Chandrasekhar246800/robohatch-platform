import crypto from 'crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { e2eEnv } from './env';
import { authedPost } from './auth';

type RazorpayMode = 'success' | 'failure' | 'cancel' | 'duplicate' | 'noop';

type ShippingAddress = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export function signRazorpayVerification(orderId: string, paymentId: string) {
  if (!e2eEnv.razorpayKeySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is required for payment validation tests');
  }

  return crypto
    .createHmac('sha256', e2eEnv.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export function signRazorpayWebhook(rawBody: string) {
  if (!e2eEnv.razorpayWebhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is required for webhook validation tests');
  }

  return crypto
    .createHmac('sha256', e2eEnv.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
}

export async function sendSignedWebhook(request: APIRequestContext, body: Record<string, unknown>, eventId?: string) {
  const rawBody = JSON.stringify(body);
  const signature = signRazorpayWebhook(rawBody);

  return request.post('/api/webhook/razorpay', {
    data: body,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      ...(eventId ? { 'x-razorpay-event-id': eventId } : {}),
    },
  });
}

export async function createPaymentOrder(page: Page, shippingAddress: ShippingAddress) {
  const response = await authedPost(page, '/api/payment/orders', { shippingAddress });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  return payload.data;
}

export async function createRazorpayOrder(page: Page, orderId: string) {
  const response = await authedPost(page, `/api/payment/create-order/${orderId}`, {});
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  return payload.data;
}

export async function verifyPayment(page: Page, orderId: string, paymentId: string) {
  const signature = signRazorpayVerification(orderId, paymentId);
  const response = await authedPost(page, '/api/payment/verify', {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function installRazorpayMock(page: Page, mode: RazorpayMode, overrides: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ mockMode, mockOverrides }) => {
      class MockRazorpay {
        options: any;
        listeners: Record<string, Function>;

        constructor(options: any) {
          this.options = options;
          this.listeners = {};
          (window as any).__latestRazorpayOptions = options;
        }

        on(eventName: string, handler: Function) {
          this.listeners[eventName] = handler;
        }

        open() {
          window.setTimeout(() => {
            const baseResponse = {
              razorpay_order_id: this.options.order_id || mockOverrides.order_id || 'order_test_123',
              razorpay_payment_id: mockOverrides.paymentId || 'pay_test_123',
              razorpay_signature: mockOverrides.signature || 'sig_test_123',
            };

            if (mockMode === 'success') {
              this.options.handler?.(baseResponse);
              return;
            }

            if (mockMode === 'duplicate') {
              this.options.handler?.(baseResponse);
              this.options.handler?.(baseResponse);
              return;
            }

            if (mockMode === 'noop') {
              return;
            }

            if (mockMode === 'failure') {
              this.listeners['payment.failed']?.({ error: { description: mockOverrides.description || 'Payment failed' } });
              return;
            }

            if (mockMode === 'cancel') {
              this.options.modal?.ondismiss?.();
            }
          }, 50);
        }
      }

      (window as any).Razorpay = MockRazorpay;
    },
    { mockMode: mode, mockOverrides: overrides }
  );
}

export async function completePaymentWithVerification(page: Page, orderId: string, paymentId: string) {
  const signature = signRazorpayVerification(orderId, paymentId);
  const response = await page.request.post('/api/payment/verify', {
    data: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}