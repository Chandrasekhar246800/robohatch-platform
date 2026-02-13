import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions - RoboHatch',
  description: 'Read the terms and conditions for using RoboHatch services. Understand your rights and obligations when purchasing from our platform.',
  robots: 'index, follow',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
          <p className="text-gray-600">
            <strong>Last Updated:</strong> February 12, 2026
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-700 leading-relaxed mb-4">
            Welcome to RoboHatch. These Terms and Conditions ("Terms") govern your access to and use of our website, products, and services. By accessing or using our website, you agree to be bound by these Terms.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Please read these Terms carefully before using our services. If you do not agree with any part of these Terms, you must not use our website or purchase our products.
          </p>
        </section>

        {/* Acceptance of Terms */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-4">
            By accessing and using the RoboHatch website, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, as well as our Privacy Policy. These Terms apply to all visitors, users, and others who access or use our services.
          </p>
          <p className="text-gray-700">
            We reserve the right to modify these Terms at any time. Your continued use of the website after any changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        {/* Eligibility */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
          <p className="text-gray-700 mb-4">
            You must be at least 18 years of age to use our services and make purchases. By using our website, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding contracts.
          </p>
          <p className="text-gray-700">
            If you are using our services on behalf of a business or organization, you represent that you have the authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Account Registration */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration and Security</h2>
          <p className="text-gray-700 mb-4">
            To access certain features of our website, you may be required to create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized access or security breaches</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p className="text-gray-700">
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or illegal activities.
          </p>
        </section>

        {/* Products and Services */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Products and Services</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">4.1 Product Information</h3>
          <p className="text-gray-700 mb-4">
            We strive to provide accurate descriptions, images, and specifications for all products. However, we do not warrant that product descriptions, images, or other content are error-free, complete, or current. Product colors may vary slightly from images due to monitor settings and photography conditions.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">4.2 Product Availability</h3>
          <p className="text-gray-700 mb-4">
            All products are subject to availability. We reserve the right to limit quantities, discontinue products, or refuse orders at our sole discretion. If a product becomes unavailable after you place an order, we will notify you and provide a refund or alternative solution.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">4.3 Custom Design Services</h3>
          <p className="text-gray-700">
            For custom design orders, you agree to provide clear specifications and approve final designs before production. Custom products are non-refundable unless they contain manufacturing defects or errors on our part.
          </p>
        </section>

        {/* Pricing and Payment */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Pricing and Payment</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">5.1 Pricing</h3>
          <p className="text-gray-700 mb-4">
            All prices are listed in Indian Rupees (INR) and <strong>include 18% GST</strong> as applicable under Indian tax regulations. We reserve the right to change prices at any time without prior notice. Price changes will not affect orders already placed.
          </p>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-4">
            <p className="text-gray-800 font-medium">
              <strong>GST Disclosure:</strong> All product prices shown on our website are <span className="text-green-600 font-bold">inclusive of 18% Goods and Services Tax (GST)</span>. The GST component is clearly displayed at checkout.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">5.2 Payment Processing</h3>
          <p className="text-gray-700 mb-4">
            All payments are processed securely through Razorpay, our authorized payment gateway partner. By making a payment, you authorize us to charge the specified amount to your chosen payment method. We accept:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Credit and Debit Cards (Visa, Mastercard, RuPay, etc.)</li>
            <li>UPI (Google Pay, PhonePe, Paytm, etc.)</li>
            <li>Net Banking</li>
            <li>Digital Wallets</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">5.3 Payment Failure</h3>
          <p className="text-gray-700">
            If your payment fails or is declined, your order will not be processed. We are not responsible for delays or cancellations due to payment issues. Please ensure sufficient funds and correct payment details before placing orders.
          </p>
        </section>

        {/* Orders and Fulfillment */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Orders and Fulfillment</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">6.1 Order Confirmation</h3>
          <p className="text-gray-700 mb-4">
            After placing an order, you will receive an email confirmation with order details. This confirmation does not constitute acceptance of your order. We reserve the right to accept or reject orders at our discretion.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">6.2 Order Processing</h3>
          <p className="text-gray-700 mb-4">
            Orders are typically processed within 1-2 business days. Custom orders may require additional processing time. We will notify you when your order ships with tracking information.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">6.3 Shipping and Delivery</h3>
          <p className="text-gray-700 mb-4">
            We ship to addresses within India only. Delivery times vary based on location and shipping method selected. While we strive for timely delivery, we are not responsible for delays caused by courier services, natural disasters, or other factors beyond our control.
          </p>
          <p className="text-gray-700">
            You are responsible for providing accurate shipping information. We are not liable for orders shipped to incorrect addresses provided by you.
          </p>
        </section>

        {/* Intellectual Property */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property Rights</h2>
          <p className="text-gray-700 mb-4">
            All content on this website, including but not limited to text, graphics, logos, images, product designs, and software, is the property of RoboHatch or its content suppliers and is protected by Indian and international copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-gray-700 mb-4">
            You may not reproduce, distribute, modify, create derivative works, publicly display, or exploit any content from this website without our prior written permission.
          </p>
          <p className="text-gray-700">
            The RoboHatch name, logo, and all related product names are trademarks of RoboHatch. You may not use these trademarks without our express written consent.
          </p>
        </section>

        {/* User Conduct */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Prohibited Uses and User Conduct</h2>
          <p className="text-gray-700 mb-4">
            You agree not to use our website for any unlawful or prohibited purposes, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Violating any applicable laws or regulations</li>
            <li>Infringing upon intellectual property rights</li>
            <li>Transmitting harmful code, viruses, or malware</li>
            <li>Attempting to gain unauthorized access to our systems</li>
            <li>Harassing, threatening, or defaming others</li>
            <li>Impersonating any person or entity</li>
            <li>Engaging in fraudulent activities or payment disputes</li>
            <li>Scraping, data mining, or automated data collection</li>
            <li>Interfering with website functionality or security</li>
          </ul>
        </section>

        {/* Warranty Disclaimer */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Warranty and Disclaimer</h2>
          <p className="text-gray-700 mb-4">
            We strive to provide high-quality products and services. However, our website and products are provided "as is" and "as available" without warranties of any kind, either express or implied.
          </p>
          <p className="text-gray-700 mb-4">
            To the fullest extent permitted by law, we disclaim all warranties, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Non-infringement of third-party rights</li>
            <li>Uninterrupted, error-free, or secure website operation</li>
            <li>Accuracy, reliability, or completeness of content</li>
          </ul>
          <p className="text-gray-700">
            Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-700 mb-4">
            To the maximum extent permitted by law, RoboHatch and its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Your use or inability to use our website or products</li>
            <li>Unauthorized access to or alteration of your data</li>
            <li>Errors, bugs, or interruptions in website functionality</li>
            <li>Loss of profits, revenue, data, or goodwill</li>
            <li>Third-party actions or content</li>
          </ul>
          <p className="text-gray-700">
            Our total liability for any claim arising out of or relating to these Terms or your use of our services shall not exceed the amount you paid to us for the specific product or service in question, or ₹1,000, whichever is lower.
          </p>
        </section>

        {/* Indemnification */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
          <p className="text-gray-700">
            You agree to indemnify, defend, and hold harmless RoboHatch and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising from your violation of these Terms, your use of our website, or your infringement of any third-party rights.
          </p>
        </section>

        {/* Dispute Resolution */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Dispute Resolution</h2>
          <p className="text-gray-700 mb-4">
            If you have any disputes or concerns, please contact us first at <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a>. We will work in good faith to resolve the issue amicably.
          </p>
          <p className="text-gray-700">
            If we cannot resolve the dispute informally, you agree that any legal action or proceeding shall be governed by the laws of India and subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>
        </section>

        {/* Termination */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right to suspend or terminate your access to our website and services at any time, without notice, for any reason, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Violation of these Terms</li>
            <li>Fraudulent or illegal activities</li>
            <li>Harmful conduct toward other users or our business</li>
            <li>Non-payment or payment disputes</li>
          </ul>
          <p className="text-gray-700">
            Upon termination, your right to use the website will immediately cease. Provisions related to intellectual property, disclaimers, liability, and indemnification shall survive termination.
          </p>
        </section>

        {/* Severability */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Severability</h2>
          <p className="text-gray-700">
            If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be replaced with a valid provision that most closely reflects the intent of the original provision.
          </p>
        </section>

        {/* Entire Agreement */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Entire Agreement</h2>
          <p className="text-gray-700">
            These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and RoboHatch regarding the use of our website and services, superseding any prior agreements or understandings.
          </p>
        </section>

        {/* Contact Information */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions or concerns about these Terms & Conditions, please contact us:
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">
              <strong>RoboHatch</strong><br />
              Email: <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a><br />
              Phone: <a href="tel:+919505551727" className="text-primary hover:underline">+91 9505551727</a><br />
              Address: Urbanrise Revolution 1, C-Block 726, Padur, Chennai - 603103, Tamil Nadu, India
            </p>
          </div>
        </section>

        {/* Governing Law */}
        <section className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Governing Law and Jurisdiction</h3>
          <p className="text-gray-700">
            These Terms and Conditions are governed by and construed in accordance with the laws of India. You agree to submit to the exclusive jurisdiction of the courts located in Chennai, Tamil Nadu, India, for the resolution of any disputes arising from these Terms or your use of our services.
          </p>
        </section>

        {/* Acknowledgment */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Acknowledgment</h3>
          <p className="text-gray-700">
            By using our website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </section>
      </div>
    </div>
  );
}
