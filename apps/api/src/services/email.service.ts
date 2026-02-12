import sgMail from '@sendgrid/mail';
import { prisma } from '../config/prisma';

// 🔒 SECURITY: Validate SendGrid credentials at startup
if (!process.env.SENDGRID_API_KEY) {
  console.error('🚨 WARNING: SENDGRID_API_KEY not set - Email notifications disabled');
  console.error('   Set SENDGRID_API_KEY environment variable to enable emails');
}

const SENDGRID_ENABLED = !!process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@robohatch.in';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'RoboHatch';

if (SENDGRID_ENABLED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log('✅ SendGrid email service initialized');
  console.log(`   From: ${FROM_NAME} <${FROM_EMAIL}>`);
} else {
  console.warn('⚠️  Email notifications DISABLED - emails will be logged only');
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
}

export const emailService = new EmailService();
