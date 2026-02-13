import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - RoboHatch',
  description: 'Learn how RoboHatch collects, uses, and protects your personal information. Read our comprehensive privacy policy.',
  robots: 'index, follow',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600">
            <strong>Last Updated:</strong> February 12, 2026
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-700 leading-relaxed mb-4">
            At RoboHatch, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By using our website, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our website.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">1.1 Personal Information</h3>
          <p className="text-gray-700 mb-4">
            We may collect personal information that you provide directly to us, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping and billing address</li>
            <li>Payment information (processed securely through Razorpay)</li>
            <li>Account credentials (username and password)</li>
            <li>Order history and preferences</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">1.2 Automatically Collected Information</h3>
          <p className="text-gray-700 mb-4">
            When you visit our website, we may automatically collect certain information about your device and browsing behavior:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
            <li>IP address and device identifiers</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Pages visited and time spent</li>
            <li>Referring website addresses</li>
            <li>Click patterns and navigation paths</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">1.3 Cookies and Tracking Technologies</h3>
          <p className="text-gray-700">
            We use cookies, web beacons, and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand user preferences. You can control cookie settings through your browser, but disabling cookies may affect website functionality.
          </p>
        </section>

        {/* How We Use Information */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            We use the collected information for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Order Processing:</strong> To process and fulfill your orders, including payment processing, shipping, and delivery.</li>
            <li><strong>Account Management:</strong> To create and manage your account, including authentication and access control.</li>
            <li><strong>Customer Service:</strong> To respond to your inquiries, provide support, and resolve issues.</li>
            <li><strong>Communication:</strong> To send order confirmations, shipping updates, and important account notifications.</li>
            <li><strong>Marketing:</strong> To send promotional emails, newsletters, and special offers (with your consent).</li>
            <li><strong>Analytics:</strong> To understand user behavior, improve website functionality, and enhance user experience.</li>
            <li><strong>Security:</strong> To detect and prevent fraud, unauthorized access, and other illegal activities.</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
          </ul>
        </section>

        {/* Payment Processing */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Payment Processing via Razorpay</h2>
          <p className="text-gray-700 mb-4">
            All payment transactions are processed securely through <strong>Razorpay</strong>, a certified Payment Gateway provider. We do not store complete credit/debit card information on our servers.
          </p>
          <p className="text-gray-700 mb-4">
            When you make a payment, your financial information is transmitted directly to Razorpay using industry-standard encryption (SSL/TLS). Razorpay complies with PCI-DSS (Payment Card Industry Data Security Standards) to ensure secure handling of payment data.
          </p>
          <p className="text-gray-700">
            For more information about how Razorpay handles your payment information, please refer to <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Razorpay's Privacy Policy</a>.
          </p>
        </section>

        {/* Information Sharing */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
          <p className="text-gray-700 mb-4">
            We do not sell, rent, or trade your personal information to third parties. However, we may share your information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Payment Processors:</strong> Razorpay for secure payment processing.</li>
            <li><strong>Shipping Partners:</strong> Courier and logistics companies for order fulfillment and delivery.</li>
            <li><strong>Service Providers:</strong> Third-party vendors who assist with website hosting, email services, analytics, and customer support.</li>
            <li><strong>Legal Authorities:</strong> When required by law, court order, or legal process, or to protect our rights and safety.</li>
            <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity.</li>
          </ul>
          <p className="text-gray-700 mt-4">
            All third-party service providers are required to maintain the confidentiality and security of your information.
          </p>
        </section>

        {/* Data Security */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
          <p className="text-gray-700 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. These measures include:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Secure Socket Layer (SSL) encryption for data transmission</li>
            <li>Encrypted storage of sensitive information</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Employee training on data protection practices</li>
          </ul>
          <p className="text-gray-700 mt-4">
            While we strive to protect your personal information, no method of transmission or storage is 100% secure. We cannot guarantee absolute security but continuously work to improve our security practices.
          </p>
        </section>

        {/* Cookies Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
          <p className="text-gray-700 mb-4">
            We use cookies and similar technologies to enhance your experience on our website:
          </p>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Types of Cookies We Use:</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Essential Cookies:</strong> Required for website functionality, including shopping cart and checkout processes.</li>
            <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our website through analytics.</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences and settings for a better user experience.</li>
            <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements based on your interests.</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">Managing Cookies:</h3>
          <p className="text-gray-700">
            You can control and manage cookies through your browser settings. However, disabling certain cookies may affect website functionality and your user experience.
          </p>
        </section>

        {/* Data Retention */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
          <p className="text-gray-700">
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When your information is no longer needed, we will securely delete or anonymize it.
          </p>
        </section>

        {/* Your Rights */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Privacy Rights</h2>
          <p className="text-gray-700 mb-4">
            You have the following rights regarding your personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations).</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
            <li><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to processing of your information for certain purposes.</li>
          </ul>
          <p className="text-gray-700 mt-4">
            To exercise any of these rights, please contact us at <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a>.
          </p>
        </section>

        {/* Third-Party Links */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Links</h2>
          <p className="text-gray-700">
            Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
          </p>
        </section>

        {/* Children's Privacy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
          <p className="text-gray-700">
            Our website is not intended for children under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
          </p>
        </section>

        {/* Changes to Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
          <p className="text-gray-700">
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. The "Last Updated" date at the top of this page indicates when the policy was last revised. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* Contact Information */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Governing Law</h3>
          <p className="text-gray-700">
            This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>
        </section>
      </div>
    </div>
  );
}
