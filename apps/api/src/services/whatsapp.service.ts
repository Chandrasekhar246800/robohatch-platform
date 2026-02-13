/**
 * WhatsApp Notification Service
 * 
 * Supports multiple WhatsApp Business API providers:
 * - Interakt (interakt.ai)
 * - WATI (wati.io)
 * - AiSensy (aisensy.com)
 * - Twilio WhatsApp API
 * 
 * Setup Instructions:
 * 1. Sign up for any WhatsApp Business API provider
 * 2. Get your API credentials
 * 3. Add to Railway environment variables:
 *    - WHATSAPP_PROVIDER=interakt|wati|aisensy|twilio
 *    - WHATSAPP_API_KEY=your_api_key
 *    - WHATSAPP_API_URL=provider_webhook_url
 *    - WHATSAPP_ORDERS_GROUP=group_chat_id (for orders)
 *    - WHATSAPP_CONTACTS_GROUP=group_chat_id (for contact forms)
 */

import axios from 'axios';
import environment from '../config/environment';

interface WhatsAppConfig {
  provider: string;
  apiKey: string;
  apiUrl: string;
  ordersGroup: string;
  contactsGroup: string;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const provider = process.env.WHATSAPP_PROVIDER;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const apiUrl = process.env.WHATSAPP_API_URL;
    const ordersGroup = process.env.WHATSAPP_ORDERS_GROUP;
    const contactsGroup = process.env.WHATSAPP_CONTACTS_GROUP;

    if (!provider || !apiKey || !apiUrl || !ordersGroup || !contactsGroup) {
      console.log('⚠️  WhatsApp notifications DISABLED - Missing configuration');
      console.log('   Set these environment variables to enable WhatsApp notifications:');
      console.log('   - WHATSAPP_PROVIDER (interakt|wati|aisensy|twilio)');
      console.log('   - WHATSAPP_API_KEY');
      console.log('   - WHATSAPP_API_URL');
      console.log('   - WHATSAPP_ORDERS_GROUP');
      console.log('   - WHATSAPP_CONTACTS_GROUP');
      this.enabled = false;
      return;
    }

    this.config = {
      provider,
      apiKey,
      apiUrl,
      ordersGroup,
      contactsGroup,
    };

    this.enabled = true;
    console.log('✅ WhatsApp notifications ENABLED');
    console.log(`   Provider: ${provider}`);
  }

  /**
   * Send new order notification to orders WhatsApp group
   */
  async sendOrderNotification(orderData: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    total: number;
    shippingAddress: string;
  }) {
    if (!this.enabled || !this.config) {
      console.log('📱 WhatsApp disabled - Order notification skipped');
      return;
    }

    try {
      // Format message
      const message = this.formatOrderMessage(orderData);

      // Send message based on provider
      await this.sendMessage(this.config.ordersGroup, message);

      console.log(`✅ Order notification sent to WhatsApp: ${orderData.orderId}`);
    } catch (error: any) {
      console.error('❌ Failed to send WhatsApp order notification:', error.message);
      // Don't throw - notification failure shouldn't break order creation
    }
  }

  /**
   * Send contact form submission to contacts WhatsApp group
   */
  async sendContactFormNotification(contactData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    timestamp: Date;
  }) {
    if (!this.enabled || !this.config) {
      console.log('📱 WhatsApp disabled - Contact form notification skipped');
      return;
    }

    try {
      // Format message
      const message = this.formatContactMessage(contactData);

      // Send message based on provider
      await this.sendMessage(this.config.contactsGroup, message);

      console.log('✅ Contact form notification sent to WhatsApp');
    } catch (error: any) {
      console.error('❌ Failed to send WhatsApp contact notification:', error.message);
      // Don't throw - notification failure shouldn't break form submission
    }
  }

  /**
   * Format order notification message
   */
  private formatOrderMessage(data: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    total: number;
    shippingAddress: string;
  }): string {
    const itemsList = data.items
      .map(item => `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`)
      .join('\n');

    return `🛒 *NEW ORDER RECEIVED*

📦 Order ID: ${data.orderId}

👤 *Customer Details:*
Name: ${data.customerName}
Phone: ${data.customerPhone}
Email: ${data.customerEmail}

📝 *Items:*
${itemsList}

💰 *Payment Summary:*
Subtotal: ₹${data.subtotal}
*Total: ₹${data.total}*

📍 *Shipping Address:*
${data.shippingAddress}

⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

🌐 View Order: https://www.robohatch.in/admin/orders`;
  }

  /**
   * Format contact form notification message
   */
  private formatContactMessage(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    timestamp: Date;
  }): string {
    return `📬 *NEW CONTACT FORM SUBMISSION*

👤 *From:*
Name: ${data.name}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}

📋 *Subject:* ${data.subject}

💬 *Message:*
${data.message}

⏰ Time: ${data.timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

💡 Tip: Reply to customer at ${data.email}`;
  }

  /**
   * Send message via configured provider
   */
  private async sendMessage(to: string, message: string) {
    if (!this.config) return;

    const { provider, apiKey, apiUrl } = this.config;

    switch (provider.toLowerCase()) {
      case 'interakt':
        await this.sendViaInterakt(to, message, apiKey, apiUrl);
        break;
      case 'wati':
        await this.sendViaWATI(to, message, apiKey, apiUrl);
        break;
      case 'aisensy':
        await this.sendViaAiSensy(to, message, apiKey, apiUrl);
        break;
      case 'twilio':
        await this.sendViaTwilio(to, message, apiKey, apiUrl);
        break;
      default:
        throw new Error(`Unsupported WhatsApp provider: ${provider}`);
    }
  }

  /**
   * Interakt API integration
   */
  private async sendViaInterakt(to: string, message: string, apiKey: string, apiUrl: string) {
    await axios.post(
      apiUrl,
      {
        countryCode: '+91',
        phoneNumber: to,
        type: 'Text',
        data: {
          message: message,
        },
      },
      {
        headers: {
          Authorization: `Basic ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * WATI API integration
   */
  private async sendViaWATI(to: string, message: string, apiKey: string, apiUrl: string) {
    await axios.post(
      `${apiUrl}/sendTemplateMessage`,
      {
        whatsappNumber: to,
        template_name: 'custom_message', // You need to create this template in WATI
        broadcast_name: 'RoboHatch Notifications',
        parameters: [
          {
            name: 'body',
            value: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * AiSensy API integration
   */
  private async sendViaAiSensy(to: string, message: string, apiKey: string, apiUrl: string) {
    await axios.post(
      apiUrl,
      {
        apiKey: apiKey,
        campaignName: 'roboHatch_notifications',
        destination: to,
        userName: 'RoboHatch',
        templateParams: [message],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Twilio WhatsApp API integration
   */
  private async sendViaTwilio(to: string, message: string, apiKey: string, apiUrl: string) {
    // Twilio format: AccountSID:AuthToken encoded in base64
    await axios.post(
      apiUrl,
      new URLSearchParams({
        From: 'whatsapp:+14155238886', // Twilio sandbox number
        To: `whatsapp:${to}`,
        Body: message,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  }
}

export default new WhatsAppService();
