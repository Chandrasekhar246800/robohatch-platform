import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy - RoboHatch',
  description: 'Learn about RoboHatch refund and cancellation policy. Understand eligibility, timelines, and procedures for returns and refunds.',
  robots: 'index, follow',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund & Cancellation Policy</h1>
          <p className="text-gray-600">
            <strong>Last Updated:</strong> February 12, 2026
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-700 leading-relaxed mb-4">
            At RoboHatch, we are committed to customer satisfaction and stand behind the quality of our products. This Refund and Cancellation Policy outlines the terms and conditions for order cancellations, returns, and refunds.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Please read this policy carefully before placing an order. By purchasing from RoboHatch, you agree to the terms outlined below.
          </p>
        </section>

        {/* Order Cancellation */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Order Cancellation</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">1.1 Cancellation Before Dispatch</h3>
          <p className="text-gray-700 mb-4">
            You may cancel your order before it is dispatched for delivery by contacting us immediately at <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a> or by calling <a href="tel:+919505551727" className="text-primary hover:underline">+91 95055 51727</a>.
          </p>
          <p className="text-gray-700 mb-4">
            Cancellation requests are processed as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Within 2 hours of order placement:</strong> Full refund with no cancellation charges.</li>
            <li><strong>After 2 hours but before dispatch:</strong> Refund minus any processing fees incurred (if applicable).</li>
            <li><strong>After dispatch:</strong> Cancellation not possible. Please refer to our Return Policy below.</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">1.2 Cancellation by RoboHatch</h3>
          <p className="text-gray-700">
            We reserve the right to cancel orders in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
            <li>Product unavailability or out-of-stock situations</li>
            <li>Pricing or product information errors</li>
            <li>Suspected fraudulent or unauthorized transactions</li>
            <li>Inability to verify payment or delivery information</li>
            <li>Force majeure events (natural disasters, pandemics, etc.)</li>
          </ul>
          <p className="text-gray-700 mt-4">
            If we cancel your order, you will receive a full refund to your original payment method within 5-7 business days.
          </p>
        </section>

        {/* Return Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Return Policy</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">2.1 Eligibility for Returns</h3>
          <p className="text-gray-700 mb-4">
            Products can be returned within <strong>7 days of delivery</strong> if they meet the following conditions:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Product is defective, damaged, or broken during transit</li>
            <li>Wrong product or incorrect item was delivered</li>
            <li>Product significantly differs from description or images on the website</li>
            <li>Product has manufacturing defects affecting functionality</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">2.2 Return Process</h3>
          <p className="text-gray-700 mb-4">
            To initiate a return, follow these steps:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 mb-4">
            <li>Contact us within 7 days of delivery at <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a> with your order number and reason for return.</li>
            <li>Provide clear photos/videos of the product showing defects or damage.</li>
            <li>Our team will review your request within 24-48 hours and provide return instructions.</li>
            <li>Pack the product securely in its original packaging (if available) and ship it to the provided address.</li>
            <li>Once we receive and inspect the returned product, we will process your refund or replacement.</li>
          </ol>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">2.3 Return Shipping Costs</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Defective/Damaged Products:</strong> We will cover return shipping costs and arrange pickup.</li>
            <li><strong>Change of Mind:</strong> Customer is responsible for return shipping costs (returns due to change of mind may not be accepted for custom products).</li>
          </ul>
        </section>

        {/* Refund Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Refund Policy</h2>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-3">3.1 Refund Eligibility</h3>
          <p className="text-gray-700 mb-4">
            You are eligible for a refund in the following cases:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Order cancelled before dispatch</li>
            <li>Product is defective, damaged, or incorrect</li>
            <li>Product not delivered within the expected timeframe (after investigation)</li>
            <li>Order cancelled by RoboHatch due to unavailability or errors</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">3.2 Refund Processing Timeline</h3>
          <p className="text-gray-700 mb-4">
            Refunds are processed as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Cancellations before dispatch:</strong> 5-7 business days from cancellation confirmation</li>
            <li><strong>Returns/Replacements:</strong> 5-7 business days after receiving and inspecting the returned product</li>
            <li><strong>Payment gateway delays:</strong> Additional 3-5 business days may be required for bank processing</li>
          </ul>
          <p className="text-gray-700">
            You will be notified via email once your refund has been initiated.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">3.3 Refund Method</h3>
          <p className="text-gray-700 mb-4">
            Refunds will be processed to your <strong>original payment method</strong>:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Credit/Debit Card:</strong> Refunded to the same card used for payment</li>
            <li><strong>UPI/Net Banking:</strong> Refunded to the source bank account</li>
            <li><strong>Wallet:</strong> Refunded to the same wallet account</li>
          </ul>
          <p className="text-gray-700 mt-4">
            Refund processing times may vary depending on your bank or payment provider. Please allow up to 10 business days for the refund to reflect in your account.
          </p>
        </section>

        {/* Non-Refundable Items */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Non-Refundable and Non-Returnable Items</h2>
          <p className="text-gray-700 mb-4">
            The following items are <strong>non-refundable and non-returnable</strong> unless they are defective or damaged:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Custom/Personalized Products:</strong> Items made to your specific design or specifications cannot be returned as they are unique to your order.</li>
            <li><strong>Products with Broken Seals:</strong> Items where protective seals have been removed or tampered with.</li>
            <li><strong>Products Damaged by Customer:</strong> Products damaged due to misuse, mishandling, or improper care after delivery.</li>
            <li><strong>Sale/Clearance Items:</strong> Products purchased during special sales or clearance events (unless defective).</li>
            <li><strong>Digital Products:</strong> Downloadable files or digital content (if applicable).</li>
          </ul>
          <p className="text-gray-700">
            If you receive a defective custom product, we will work with you to provide a replacement or resolution.
          </p>
        </section>

        {/* Replacement Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Replacement Policy</h2>
          <p className="text-gray-700 mb-4">
            If you receive a defective or damaged product, we will gladly offer a replacement as an alternative to a refund:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li>Replacements are subject to product availability</li>
            <li>Replacement will be shipped at no additional cost to you</li>
            <li>If a replacement is unavailable, a full refund will be issued</li>
            <li>Replacement processing may take 7-10 business days</li>
          </ul>
          <p className="text-gray-700">
            To request a replacement, follow the same return process outlined in Section 2.2.
          </p>
        </section>

        {/* Exchange Policy */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Exchange Policy</h2>
          <p className="text-gray-700 mb-4">
            Currently, we do not offer direct exchanges. If you wish to receive a different product:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700">
            <li>Initiate a return for the original product (if eligible)</li>
            <li>Place a new order for the desired product</li>
            <li>Your refund will be processed as per our refund policy</li>
          </ol>
        </section>

        {/* Damaged or Lost in Transit */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Products Damaged or Lost in Transit</h2>
          <p className="text-gray-700 mb-4">
            If your product is damaged during shipping or lost in transit:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
            <li><strong>Damaged in Transit:</strong> Contact us within 48 hours of delivery with photos of the damaged product and packaging. We will arrange a replacement or refund.</li>
            <li><strong>Lost in Transit:</strong> If your order does not arrive within the expected delivery window, contact us. We will investigate with the courier and provide a resolution (replacement or refund).</li>
          </ul>
          <p className="text-gray-700">
            We recommend inspecting the package upon delivery and noting any visible damage with the courier.
          </p>
        </section>

        {/* Contact for Returns */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. How to Contact Us for Returns/Refunds</h2>
          <p className="text-gray-700 mb-4">
            For all return, refund, or cancellation requests, please contact us:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-700">
              <strong>RoboHatch Customer Support</strong><br />
              Email: <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">founder@robohatch.in</a><br />
              Phone: <a href="tel:+919505551727" className="text-primary hover:underline">+91 95055 51727</a><br />
              Business Hours: Monday - Saturday, 10 AM - 6 PM IST
            </p>
          </div>
          <p className="text-gray-700">
            Please include your order number, reason for return/refund, and supporting documentation (photos/videos) for faster processing.
          </p>
        </section>

        {/* Policy Updates */}
        <section className="mb-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Policy Updates</h2>
          <p className="text-gray-700">
            We reserve the right to update or modify this Refund and Cancellation Policy at any time. Changes will be effective immediately upon posting on this page. The "Last Updated" date at the top indicates when the policy was last revised.
          </p>
        </section>

        {/* Important Notes */}
        <section className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Notes</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">•</span>
              <span>All refunds are processed through Razorpay and will be credited to your original payment method.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Custom/personalized products are non-refundable unless defective.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Return eligibility is subject to inspection and approval by RoboHatch.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>Refunds may take 5-10 business days depending on your bank/payment provider.</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span>We recommend reporting damaged products within 48 hours of delivery.</span>
            </li>
          </ul>
        </section>

        {/* Governing Law */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Governing Law</h3>
          <p className="text-gray-700">
            This Refund and Cancellation Policy is governed by the laws of India. All disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.
          </p>
        </section>
      </div>
    </div>
  );
}
