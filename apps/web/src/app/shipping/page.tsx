import React from 'react';
import Link from 'next/link';
import { Package, Truck, Clock, Mail, AlertCircle, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Shipping Policy | RoboHatch',
  description: 'Learn about our shipping process, delivery timelines, and tracking information for 3D printed products.',
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Truck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shipping Policy</h1>
          <p className="text-lg text-gray-600">
            Clear information about our shipping process and delivery timelines
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Order Processing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Order Processing</h2>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary p-4 rounded-r-lg mb-4">
              <p className="text-gray-800 font-medium">
                All orders are processed within <span className="text-primary font-bold">1-3 business days</span> after order confirmation.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Once your order is placed and payment is confirmed, our team begins preparing your 3D printed products. 
              Each item is carefully inspected for quality before being packaged for shipment. You will receive an 
              order confirmation email immediately after purchase.
            </p>
          </section>

          {/* Delivery Timeline */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Delivery Timeline</h2>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary p-4 rounded-r-lg mb-4">
              <p className="text-gray-800 font-medium">
                Estimated delivery time: <span className="text-primary font-bold">3-7 business days</span> from order dispatch
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Delivery timelines are estimated and may vary based on your location. Orders within major cities 
              typically arrive within 3-5 business days, while deliveries to remote areas may take up to 7 business days.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Business days exclude weekends (Saturday & Sunday) and public holidays.
              </p>
            </div>
          </section>

          {/* Courier Partners */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Courier Partners</h2>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary p-4 rounded-r-lg mb-4">
              <p className="text-gray-800 font-medium">
                Orders are delivered via <span className="text-primary font-bold">trusted third-party courier partners</span>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              We partner with reputed courier services including DTDC, Delhivery, Blue Dart, and India Post to ensure 
              safe and timely delivery of your orders. The specific courier partner is selected based on your delivery 
              location for optimal service.
            </p>
          </section>

          {/* Tracking Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Order Tracking</h2>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary p-4 rounded-r-lg mb-4">
              <p className="text-gray-800 font-medium">
                Tracking details are sent via <span className="text-primary font-bold">email</span> once your order is dispatched
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              You will receive a shipment confirmation email with your tracking number and courier partner details. 
              Use this tracking number to monitor your order's delivery status in real-time on the courier's website.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Email notifications sent when order is dispatched</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Tracking number valid within 24 hours of dispatch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Real-time status updates on courier partner's website</span>
              </li>
            </ul>
          </section>

          {/* Shipping Address */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Shipping Address</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Please ensure your shipping address is complete and accurate. We are not responsible for delays or 
              non-delivery due to incorrect address information provided by the customer.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Address changes cannot be made after order dispatch. Please verify 
                your address during checkout.
              </p>
            </div>
          </section>

          {/* Delays & Liability */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Delays & Liability</h2>
            </div>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-4">
              <p className="text-gray-800 font-medium">
                <span className="text-red-600 font-bold">Important Notice:</span> Delays caused by third-party 
                courier partners are beyond our control
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              While we make every effort to ensure timely delivery, <strong>RoboHatch is not responsible for 
              delays caused by courier partners, natural disasters, weather conditions, political disruptions, 
              or other unforeseen circumstances</strong> beyond our reasonable control.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Factors that may cause delivery delays include:
            </p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Courier company operational delays or route changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Adverse weather conditions affecting transportation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Public holidays, strikes, or local restrictions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Remote or difficult-to-access delivery locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">•</span>
                <span>Incorrect or incomplete address provided by customer</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              In case of unexpected delays, we will do our best to keep you informed and work with the courier 
              partner to resolve issues. For any shipping concerns, please contact us at{' '}
              <a href="mailto:founder@robohatch.in" className="text-primary hover:underline font-medium">
                founder@robohatch.in
              </a>
              {' '}or call{' '}
              <a href="tel:+919505551727" className="text-primary hover:underline font-medium">
                +91 95055 51727
              </a>.
            </p>
          </section>

          {/* Shipping Charges */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Shipping Charges</h2>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <p className="text-gray-800 font-medium">
                🎉 <span className="text-green-600 font-bold">FREE SHIPPING</span> on all orders across India!
              </p>
            </div>
          </section>

          {/* Contact Support */}
          <section className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Need Help with Your Shipment?</h3>
            <p className="text-gray-700 mb-4">
              Our support team is here to assist you with any shipping queries or concerns.
            </p>
            <div className="space-y-2 text-gray-800">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <strong>Email:</strong>{' '}
                <a href="mailto:founder@robohatch.in" className="text-primary hover:underline">
                  founder@robohatch.in
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <strong>Phone:</strong>{' '}
                <a href="tel:+919505551727" className="text-primary hover:underline">
                  +91 95055 51727
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Related Policies:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/refund" className="text-primary hover:underline font-medium">
              Refund & Cancellation Policy
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/terms" className="text-primary hover:underline font-medium">
              Terms of Service
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: February 12, 2026</p>
        </div>
      </div>
    </div>
  );
}
