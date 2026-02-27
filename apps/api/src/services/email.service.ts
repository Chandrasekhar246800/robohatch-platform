import sgMail from '@sendgrid/mail';
import { prisma } from '../config/prisma';

// 🔒 SECURITY: Validate SendGrid credentials at startup
// ✅ PRODUCTION REQUIREMENT: Fail fast if email not configured in production
if (!process.env.SENDGRID_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 CRITICAL: SENDGRID_API_KEY not set in production!');
    console.error('   Email notifications are REQUIRED for production.');
    console.error('   Set SENDGRID_API_KEY environment variable to fix this.');
    throw new Error('SENDGRID_API_KEY is required in production');
  } else {
    console.warn('⚠️  WARNING: SENDGRID_API_KEY not set - Email notifications disabled in development');
  }
}

const SENDGRID_ENABLED = !!process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@robohatch.in';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'RoboHatch';
const ORDERS_EMAIL = process.env.ORDERS_EMAIL || 'robohatchorders@gmail.com';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'robohatchofficial@gmail.com';

if (SENDGRID_ENABLED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log('✅ SendGrid email service initialized');
  console.log(`   From: ${FROM_NAME} <${FROM_EMAIL}>`);
  console.log(`   Orders notifications: ${ORDERS_EMAIL}`);
  console.log(`   Contact/Support: ${CONTACT_EMAIL}`);
} else {
  console.warn('⚠️  Email notifications DISABLED - emails will be logged only (DEV MODE)');
}

export class EmailService {
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: { product: true }
          },
          shippingAddress: true,
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const itemsList = order.items
        .map((item: any) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${item.price}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${Number(item.price) * item.quantity}</td>
          </tr>
        `)
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #1a1a1a; color: #fff; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .content h3 { color: #1a1a1a; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; }
            th { padding: 12px 10px; text-align: left; background: #1a1a1a; color: #fff; border-bottom: 2px solid #ddd; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: bold; text-align: right; padding: 15px 0; background: #fff; margin: 10px 0; }
            .button { display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #e5e5e5; }
            .address-box { background: #fff; padding: 15px; border-left: 4px solid #1a1a1a; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for shopping with RoboHatch</p>
            </div>
            <div class="content">
              <p>Hi <strong>${order.user.name || 'Valued Customer'}</strong>,</p>
              <p>Your order has been confirmed and is being prepared for shipment. We'll notify you once it's on its way!</p>
              
              <h3>📦 Order Details</h3>
              <table style="background: #fff; border: 1px solid #ddd;">
                <tr>
                  <td><strong>Order ID:</strong></td>
                  <td>${order.id}</td>
                </tr>
                <tr>
                  <td><strong>Order Date:</strong></td>
                  <td>${new Date(order.createdAt).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</td>
                </tr>
                <tr>
                  <td><strong>Order Status:</strong></td>
                  <td><span style="background: #22c55e; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px;">CONFIRMED</span></td>
                </tr>
              </table>
              
              <h3>🛍️ Items Ordered</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div class="total">
                <strong>Order Total: ₹${order.total}</strong>
              </div>
              
              <h3>📍 Shipping Address</h3>
              <div class="address-box">
                <strong>${order.shippingAddress?.fullName}</strong><br>
                ${order.shippingAddress?.addressLine1}<br>
                ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
                ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.postalCode}<br>
                ${order.shippingAddress?.country}<br>
                📞 ${order.shippingAddress?.phone}
              </div>
              
              <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <strong>⏱️ Estimated Delivery:</strong> 5-7 business days<br>
                Your order will be shipped within 2-3 business days.
              </p>
              
              <div style="text-align: center;">
                <a href="https://robohatch.in/account/orders/${order.id}" class="button">
                  Track Your Order
                </a>
              </div>
            </div>
            <div class="footer">
              <p><strong>RoboHatch - Premium 3D Printed Products</strong></p>
              <p>Urbanrise Revolution 1, C-Block - 726, Padur, Chennai-603103</p>
              <p>📞 +91 95055 51727 | ✉️ founder@robohatch.in</p>
              <p style="margin-top: 15px; font-size: 11px;">
                Questions? Reply to this email or contact our support team.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: order.user.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `Order Confirmed #${order.id.substring(0, 8)} - RoboHatch`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Order confirmation email sent to ${order.user.email} for order ${order.id}`);
      } else {
        console.log(`📧 [MOCK] Order confirmation email would be sent to ${order.user.email}`);
        console.log(`   Subject: ${msg.subject}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send order confirmation email:', error.message);
      // Don't throw - email failure shouldn't break order flow
    }
  }

  /**
   * Send payment success email
   */
  async sendPaymentSuccess(orderId: string, paymentId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          payment: true,
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #22c55e; color: #fff; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .receipt { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #22c55e; }
            .amount { font-size: 32px; font-weight: bold; color: #22c55e; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #e5e5e5; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Payment Received!</h1>
              <p style="margin: 10px 0 0 0;">Your payment was processed successfully</p>
            </div>
            <div class="content">
              <p>Hi <strong>${order.user.name || 'Valued Customer'}</strong>,</p>
              <p>We've successfully received your payment. Your order is now confirmed and will be processed shortly!</p>
              
              <div class="receipt">
                <h3 style="margin-top: 0; color: #22c55e; text-align: center;">💳 Payment Receipt</h3>
                
                <div class="amount">₹${order.total}</div>
                
                <table style="width: 100%; margin-top: 20px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Payment ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace;">${paymentId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Order ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace;">${order.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Payment Date:</td>
                    <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Payment Method:</td>
                    <td style="padding: 8px 0; text-align: right;">${order.payment?.method || 'UPI/Card/NetBanking'}</td>
                  </tr>
                  <tr style="border-top: 2px solid #22c55e;">
                    <td style="padding: 12px 0; font-weight: bold;">Total Paid:</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">₹${order.total}</td>
                  </tr>
                </table>
              </div>
              
              <p style="background: #d1fae5; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0;">
                <strong>✨ What's Next?</strong><br>
                Your order will be prepared and shipped within 2-3 business days. You'll receive a shipping notification with tracking details.</p>
              
              <div style="text-align: center;">
                <a href="https://robohatch.in/account/orders/${order.id}" class="button">
                  View Order Details
                </a>
              </div>
            </div>
            <div class="footer">
              <p><strong>Need help?</strong> Contact us at +91 95055 51727 or founder@robohatch.in</p>
              <p style="margin-top: 10px; font-size: 10px;">This is an automated receipt. Please save for your records.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: order.user.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `Payment Received ₹${order.total} - RoboHatch`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Payment success email sent to ${order.user.email}`);
      } else {
        console.log(`📧 [MOCK] Payment success email would be sent to ${order.user.email}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send payment email:', error.message);
    }
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(orderId: string, trackingId?: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          shippingAddress: true,
          items: { include: { product: true } }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const trackingInfo = trackingId
        ? `<div style="background: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
             <h3 style="margin: 0 0 10px 0;">📦 Tracking Number</h3>
             <p style="font-size: 24px; font-family: monospace; color: #1a1a1a; margin: 10px 0;">${trackingId}</p>
             <a href="https://shiprocket.co/tracking/${trackingId}" style="color: #3b82f6; text-decoration: none;">Track Your Shipment →</a>
           </div>`
        : '<p style="background: #e0e7ff; padding: 15px; border-left: 4px solid #3b82f6;">Your tracking details will be updated shortly.</p>';

      const itemsList = order.items.map((item: any) => 
        `<li>${item.quantity}x ${item.product.name}</li>`
      ).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: #3b82f6; color: #fff; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0;">📦 Your Order Has Shipped!</h1>
              <p style="margin: 10px 0 0 0;">Your RoboHatch order is on its way</p>
            </div>
            <div style="padding: 30px 20px; background: #f9f9f9;">
              <p>Hi <strong>${order.user.name || 'Customer'}</strong>,</p>
              <p>Great news! Your order has been shipped and is on its way to you!</p>
              
              ${trackingInfo}
              
              <h3 style="color: #1a1a1a;">📋 Order Summary</h3>
              <div style="background: #fff; padding: 15px; border-radius: 5px;">
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Items:</strong></p>
                <ul>${itemsList}</ul>
              </div>
              
              <h3 style="color: #1a1a1a;">📍 Delivery Address</h3>
              <div style="background: #fff; padding: 15px; border-left: 4px solid #3b82f6;">
                <strong>${order.shippingAddress?.fullName}</strong><br>
                ${order.shippingAddress?.addressLine1}<br>
                ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
                ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.postalCode}<br>
                📞 ${order.shippingAddress?.phone}
              </div>
              
              <p style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <strong>⏱️ Estimated Delivery:</strong> 3-5 business days from shipment date
              </p>
              
              <p>Please ensure someone is available to receive the package. If you have any questions, feel free to contact us!</p>
            </div>
            <div style="text-align: center; padding: 20px; background: #e5e5e5; color: #666; font-size: 12px;">
              <p><strong>RoboHatch</strong><br>
              📞 +91 95055 51727 | ✉️ founder@robohatch.in</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: order.user.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `Order Shipped #${order.id.substring(0, 8)} - RoboHatch`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Shipping notification sent to ${order.user.email}`);
      } else {
        console.log(`📧 [MOCK] Shipping notification would be sent to ${order.user.email}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send shipping email:', error.message);
    }
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmation(orderId: string, refundAmount: number, refundId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="background: #ef4444; color: #fff; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0;">💰 Refund Processed</h1>
              <p style="margin: 10px 0 0 0;">Your refund has been initiated</p>
            </div>
            <div style="padding: 30px 20px; background: #f9f9f9;">
              <p>Hi <strong>${order.user.name || 'Customer'}</strong>,</p>
              <p>Your refund request has been processed successfully. The amount will be credited to your original payment method.</p>
              
              <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ef4444;">
                <h3 style="margin-top: 0; text-align: center; color: #ef4444;">Refund Details</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Order ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace;">${order.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-family: monospace;">${refundId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund Date:</td>
                    <td style="padding: 8px 0; text-align: right;">${new Date().toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style="border-top: 2px solid #ef4444;">
                    <td style="padding: 12px 0; font-weight: bold;">Refund Amount:</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 24px; color: #ef4444;">₹${refundAmount}</td>
                  </tr>
                </table>
              </div>
              
              <p style="background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444;">
                <strong>⏱️ Processing Time:</strong> The refund will be credited to your original payment method within <strong>5-7 business days</strong>. 
                The exact timeline depends on your bank or payment provider.
              </p>
              
              <p>If you have any questions about this refund or don't receive it within the specified time, please contact us immediately.</p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                We're sorry to see you go. If there was an issue with your order, please let us know so we can improve our service.
              </p>
            </div>
            <div style="text-align: center; padding: 20px; background: #e5e5e5; color: #666; font-size: 12px;">
              <p><strong>Questions about your refund?</strong><br>
              Contact us: +91 95055 51727 | founder@robohatch.in</p>
              <p style="margin-top: 10px; font-size: 10px;">Reference ID: ${refundId}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: order.user.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `Refund Processed ₹${refundAmount} - RoboHatch`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Refund confirmation sent to ${order.user.email}`);
      } else {
        console.log(`📧 [MOCK] Refund confirmation would be sent to ${order.user.email}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send refund email:', error.message);
    }
  }

  /**
   * Send password reset email
   * ✅ NEW: For forgot password functionality
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    try {
      const resetLink = `https://robohatch.in/reset-password?token=${resetToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #1a1a1a; color: #fff; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .button { display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #e5e5e5; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>We received a request to reset your RoboHatch account password.</p>
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 13px; color: #666;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetLink}">${resetLink}</a>
              </p>
              
              <div class="warning">
                <strong>⏱️ Important:</strong><br>
                • This link will expire in 1 hour<br>
                • If you didn't request this, please ignore this email<br>
                • Your password will remain unchanged unless you click the link above
              </div>
              
              <p style="margin-top: 20px; font-size: 13px; color: #666;">
                If you have any questions or concerns, please contact our support team.
              </p>
            </div>
            <div class="footer">
              <p><strong>RoboHatch - Premium 3D Printed Products</strong></p>
              <p>Urbanrise Revolution 1, C-Block - 726, Padur, Chennai-603103</p>
              <p>📞 +91 95055 51727 | ✉️ founder@robohatch.in</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: 'Reset Your Password - RoboHatch',
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Password reset email sent to ${email}`);
      } else {
        console.log(`📧 [MOCK] Password reset email would be sent to ${email}`);
        console.log(`   Reset link: ${resetLink}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error.message);
      throw error; // Throw here because password reset must complete
    }
  }

  /**
   * Send order cancellation email
   * ✅ NEW: Notify user when order is cancelled
   */
  async sendOrderCancellation(orderId: string, reason?: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: { product: true }
          },
          payment: true,
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const refundInfo =
        order.payment && order.payment.status === 'CAPTURED'
          ? `<div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <strong>💰 Refund Information:</strong><br>
              Your refund of ₹${order.total} will be processed within 5-7 business days.<br>
              The amount will be credited to your original payment method.
            </div>`
          : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #dc2626; color: #fff; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #e5e5e5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Order Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${order.user.name || 'Valued Customer'}</strong>,</p>
              <p>Your order #${order.id.substring(0, 8)} has been cancelled.</p>
              
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              
              ${refundInfo}
              
              <p style="margin-top: 20px;">
                <strong>Order Total:</strong> ₹${order.total}<br>
                <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}
              </p>
              
              <p>We're sorry to see this order cancelled. If you have any questions or need assistance with a new order, please don't hesitate to contact us.</p>
              
              <p style="margin-top: 20px; font-size: 13px; color: #666;">
                If you didn't request this cancellation, please contact us immediately at:<br>
                📞 +91 95055 51727 | ✉️ founder@robohatch.in
              </p>
            </div>
            <div class="footer">
              <p><strong>RoboHatch - Premium 3D Printed Products</strong></p>
              <p>Urbanrise Revolution 1, C-Block - 726, Padur, Chennai-603103</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: order.user.email,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `Order Cancelled #${order.id.substring(0, 8)} - RoboHatch`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Cancellation email sent to ${order.user.email}`);
      } else {
        console.log(`📧 [MOCK] Cancellation email would be sent to ${order.user.email}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send cancellation email:', error.message);
    }
  }

  /**
   * Send admin notification for new order
   * Sends order details to robohatchorders@gmail.com for fulfillment
   */
  async sendAdminOrderNotification(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: { product: true }
          },
          shippingAddress: true,
          payment: true,
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const itemsList = order.items
        .map((item: any) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${Number(item.price) * item.quantity}</td>
          </tr>
        `)
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 700px; margin: 0 auto; }
            .header { background: #F27405; color: #fff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 20px; background: #fff; }
            .alert-box { background: #fef3c7; border-left: 4px solid #F27405; padding: 15px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { padding: 10px; text-align: left; background: #1a1a1a; color: #fff; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            .section { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .section h3 { margin-top: 0; color: #1a1a1a; }
            .total { font-size: 20px; font-weight: bold; text-align: right; padding: 15px; background: #F27405; color: #fff; margin: 15px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 NEW ORDER RECEIVED</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Order #${order.id.substring(0, 8).toUpperCase()}</p>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <strong>⚡ ACTION REQUIRED:</strong> Process this order and prepare for shipment<br>
                <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              <div class="section">
                <h3>👤 Customer Information</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Name:</td>
                    <td>${order.user.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Email:</td>
                    <td>${order.user.email}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Phone:</td>
                    <td>${order.shippingAddress?.phone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">User ID:</td>
                    <td>${order.userId}</td>
                  </tr>
                </table>
              </div>

              <div class="section">
                <h3>📦 Items to Ship</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style="text-align: center;">Quantity</th>
                      <th style="text-align: right;">Price</th>
                      <th style="text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                  </tbody>
                </table>
                
                <div class="total">
                  Order Total: ₹${order.total}
                </div>
              </div>

              <div class="section">
                <h3>📍 Shipping Address</h3>
                <p style="margin: 10px 0; font-size: 15px; line-height: 1.8;">
                  <strong>${order.shippingAddress?.fullName}</strong><br>
                  ${order.shippingAddress?.addressLine1}<br>
                  ${order.shippingAddress?.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
                  ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.postalCode}<br>
                  ${order.shippingAddress?.country}<br>
                  📞 ${order.shippingAddress?.phone}
                </p>
              </div>

              <div class="section">
                <h3>💳 Payment Information</h3>
                <table>
                  <tr>
                    <td style="width: 30%; font-weight: bold;">Payment ID:</td>
                    <td>${order.payment?.gatewayPaymentId || 'Pending'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Order ID:</td>
                    <td>${order.payment?.gatewayOrderId || order.id}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Status:</td>
                    <td><strong style="color: #22c55e;">✓ PAID</strong></td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">Amount:</td>
                    <td><strong>₹${order.total}</strong></td>
                  </tr>
                </table>
              </div>

              <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #166534;">📋 Next Steps:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li>Verify product availability in inventory</li>
                  <li>Pack items securely with invoice</li>
                  <li>Update order status to "PROCESSING"</li>
                  <li>Generate shipping label and arrange pickup</li>
                  <li>Update order status to "SHIPPED" with tracking number</li>
                  <li>Notify customer via email/WhatsApp</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="https://robohatch.in/admin/orders/${order.id}" 
                   style="display: inline-block; background: #F27405; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  View Order in Admin Panel
                </a>
              </div>
            </div>

            <div class="footer">
              <p><strong>RoboHatch Admin - Order Management System</strong></p>
              <p>This is an automated notification for order fulfillment</p>
              <p style="margin-top: 10px; font-size: 11px;">
                For urgent issues, contact: +91 95055 51727
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: ORDERS_EMAIL,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: `🚨 NEW ORDER #${order.id.substring(0, 8).toUpperCase()} - ₹${order.total} - ${order.user.name || 'Customer'}`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Admin order notification sent to ${ORDERS_EMAIL} for order ${order.id}`);
      } else {
        console.log(`📧 [MOCK] Admin notification would be sent to ${ORDERS_EMAIL}`);
        console.log(`   Subject: ${msg.subject}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send admin order notification:', error.message);
      // Don't throw - email failure shouldn't break order flow
    }
  }

  /**
   * Send contact form submission to admin
   * Sends customer inquiry to robohatchorders@gmail.com
   */
  async sendContactFormNotification(contactData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #3B82F6; color: #fff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 20px; background: #fff; }
            .info-row { background: #f9f9f9; padding: 12px 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #3B82F6; }
            .info-label { font-weight: bold; color: #1a1a1a; margin-bottom: 5px; }
            .info-value { color: #555; }
            .message-box { background: #fff; border: 2px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 New Contact Form Submission</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">From: RoboHatch Website</p>
            </div>
            
            <div class="content">
              <p style="margin: 0 0 20px 0; color: #666;">
                Received: ${new Date(contactData.timestamp).toLocaleString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata'
                })}
              </p>

              <div class="info-row">
                <div class="info-label">👤 Customer Name</div>
                <div class="info-value">${contactData.name}</div>
              </div>

              <div class="info-row">
                <div class="info-label">📧 Email Address</div>
                <div class="info-value">
                  <a href="mailto:${contactData.email}" style="color: #3B82F6; text-decoration: none;">
                    ${contactData.email}
                  </a>
                </div>
              </div>

              ${contactData.phone ? `
              <div class="info-row">
                <div class="info-label">📞 Phone Number</div>
                <div class="info-value">
                  <a href="tel:${contactData.phone}" style="color: #3B82F6; text-decoration: none;">
                    ${contactData.phone}
                  </a>
                </div>
              </div>
              ` : ''}

              <div class="info-row">
                <div class="info-label">📋 Subject</div>
                <div class="info-value"><strong>${contactData.subject}</strong></div>
              </div>

              <div class="message-box">
                <div class="info-label" style="margin-bottom: 10px;">💬 Message</div>
                <p style="margin: 0; white-space: pre-wrap; color: #333; line-height: 1.8;">${contactData.message}</p>
              </div>

              <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #166534;">📋 Next Steps:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #166534;">
                  <li>Review the customer inquiry</li>
                  <li>Reply to <strong>${contactData.email}</strong> within 24 hours</li>
                  <li>Mark as resolved in admin panel</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="mailto:${contactData.email}?subject=Re: ${encodeURIComponent(contactData.subject)}" 
                   style="display: inline-block; background: #3B82F6; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Reply to Customer
                </a>
              </div>
            </div>

            <div class="footer">
              <p><strong>RoboHatch - Contact Form Notification</strong></p>
              <p>This is an automated notification from your website contact form</p>
              <p style="margin-top: 10px; font-size: 11px;">
                To manage contact submissions, visit the admin panel
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: CONTACT_EMAIL,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        replyTo: contactData.email, // Customer's email for easy reply
        subject: `📬 Contact Form: ${contactData.subject} - ${contactData.name}`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ Contact form notification sent to ${CONTACT_EMAIL} from ${contactData.email}`);
      } else {
        console.log(`📧 [MOCK] Contact form notification would be sent to ${CONTACT_EMAIL}`);
        console.log(`   From: ${contactData.name} <${contactData.email}>`);
        console.log(`   Subject: ${msg.subject}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send contact form notification:', error.message);
      // Don't throw - email failure shouldn't break contact form submission
    }
  }

  /**
   * Send 3D design upload notification to admin
   */
  async send3DDesignNotification(designData: {
    customerName: string;
    customerEmail: string;
    designName: string;
    material: string;
    color: string;
    quantity: number;
    fileUrl: string;
    fileName: string;
    fileSize: string;
    estimatedPrice: number;
    infillPercentage: number;
    layerHeight: number;
  }): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .label { font-weight: bold; color: #6366f1; margin-bottom: 5px; }
            .value { color: #333; margin-bottom: 15px; }
            .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .price-highlight { font-size: 24px; color: #6366f1; font-weight: bold; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎨 New 3D Design Upload</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Custom printing request received</p>
            </div>

            <div class="content">
              <div class="alert">
                <strong>⚡ Action Required:</strong> Review the 3D design file and provide final quote to customer
              </div>

              <div class="section">
                <h2 style="margin-top: 0; color: #6366f1;">📋 Customer Information</h2>
                <div class="label">Customer Name:</div>
                <div class="value">${designData.customerName}</div>
                
                <div class="label">Email:</div>
                <div class="value">${designData.customerEmail}</div>
              </div>

              <div class="section">
                <h2 style="margin-top: 0; color: #6366f1;">🎯 Design Details</h2>
                <div class="label">Design Name:</div>
                <div class="value"><strong>${designData.designName}</strong></div>
                
                <div class="label">File Name:</div>
                <div class="value">${designData.fileName}</div>
                
                <div class="label">File Size:</div>
                <div class="value">${designData.fileSize}</div>
                
                <div class="label">Download File:</div>
                <div class="value">
                  <a href="${designData.fileUrl}" style="color: #6366f1;">📥 Download 3D File</a>
                </div>
              </div>

              <div class="section">
                <h2 style="margin-top: 0; color: #6366f1;">⚙️ Print Specifications</h2>
                <div class="specs-grid">
                  <div>
                    <div class="label">Material:</div>
                    <div class="value">${designData.material.toUpperCase()}</div>
                  </div>
                  <div>
                    <div class="label">Color:</div>
                    <div class="value">${designData.color}</div>
                  </div>
                  <div>
                    <div class="label">Quantity:</div>
                    <div class="value">${designData.quantity} piece(s)</div>
                  </div>
                  <div>
                    <div class="label">Infill:</div>
                    <div class="value">${designData.infillPercentage}%</div>
                  </div>
                  <div>
                    <div class="label">Layer Height:</div>
                    <div class="value">${designData.layerHeight}mm</div>
                  </div>
                </div>
              </div>

              <div class="section" style="text-align: center;">
                <h2 style="margin-top: 0; color: #6366f1;">💰 Estimated Price</h2>
                <div class="price-highlight">₹${designData.estimatedPrice.toLocaleString()}</div>
                <p style="color: #6b7280; font-size: 13px; margin-top: 5px;">
                  * Auto-calculated estimate. Review file and update pricing if needed.
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${designData.fileUrl}" class="button">
                  📥 Download File
                </a>
                <a href="mailto:${designData.customerEmail}" class="button">
                  ✉️ Contact Customer
                </a>
              </div>
            </div>

            <div class="footer">
              <p><strong>RoboHatch - 3D Design Upload Notification</strong></p>
              <p>This is an automated notification for new 3D design submissions</p>
              <p style="margin-top: 10px;">
                Review the design and send final quote to customer as soon as possible
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: ORDERS_EMAIL, // Send to orders email
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        replyTo: designData.customerEmail,
        subject: `🎨 New 3D Design: ${designData.designName} - ${designData.customerName}`,
        html,
      };

      if (SENDGRID_ENABLED) {
        await sgMail.send(msg);
        console.log(`✅ 3D design notification sent to ${ORDERS_EMAIL} for ${designData.designName}`);
      } else {
        console.log(`📧 [MOCK] 3D design notification would be sent to ${ORDERS_EMAIL}`);
        console.log(`   Design: ${designData.designName}`);
        console.log(`   Customer: ${designData.customerName} <${designData.customerEmail}>`);
        console.log(`   Estimated Price: ₹${designData.estimatedPrice}`);
      }
    } catch (error: any) {
      console.error('❌ Failed to send 3D design notification:', error.message);
      // Don't throw - email failure shouldn't break design submission
    }
  }
}

export const emailService = new EmailService();
