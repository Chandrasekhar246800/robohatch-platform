'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Package, CreditCard, Truck, RefreshCw, Upload } from 'lucide-react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      category: 'Orders & Products',
      icon: Package,
      questions: [
        {
          question: 'How long does delivery take?',
          answer: 'Orders are processed within 1-3 business days. After dispatch, delivery typically takes 3-7 business days within India, depending on your location. You will receive tracking details via email once your order is shipped.'
        },
        {
          question: 'Do you ship internationally?',
          answer: 'Currently, we ship only within India. International shipping is coming soon. Subscribe to our newsletter to get notified when international shipping becomes available.'
        },
        {
          question: 'Can I track my order?',
          answer: 'Yes! Once your order is dispatched, you will receive an email with tracking details and courier partner information. You can track your order in real-time on the courier\'s website using the provided tracking number.'
        },
        {
          question: 'What if my order arrives damaged?',
          answer: 'We take great care in packaging, but if your order arrives damaged, please contact us within 48 hours with photos of the damaged item. We will arrange a replacement or full refund as per our refund policy.'
        },
      ]
    },
    {
      category: 'Custom Designs',
      icon: Upload,
      questions: [
        {
          question: 'Can I request a custom design?',
          answer: 'Absolutely! We offer custom design services for personalized 3D printed products. Simply upload your 3D file or design requirements through our Custom Design page, and our team will provide a quote within 24-48 hours.'
        },
        {
          question: 'What file formats do you accept for custom designs?',
          answer: 'We accept STL, OBJ, 3MF, and STEP file formats. If you have a different format, please contact us at founder@robohatch.in and we\'ll do our best to accommodate your request.'
        },
        {
          question: 'How much do custom designs cost?',
          answer: 'Custom design pricing depends on factors like size, complexity, material, and quantity. Upload your design file to get an instant quote, or contact us for bulk orders and special requests.'
        },
        {
          question: 'Do you provide design services if I only have an idea?',
          answer: 'Yes! If you don\'t have a 3D file ready, our design team can create one for you. Share your requirements, reference images, and specifications, and we\'ll provide a custom design quote along with the printing cost.'
        },
      ]
    },
    {
      category: 'Payment & Pricing',
      icon: CreditCard,
      questions: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major payment methods via Razorpay, including Credit/Debit Cards (Visa, Mastercard, Amex), UPI, Net Banking, and digital wallets (Paytm, PhonePe, Google Pay, etc.).'
        },
        {
          question: 'Is online payment safe?',
          answer: 'Yes, absolutely! All payments are processed through Razorpay, a certified Payment Gateway. Your payment information is encrypted with 256-bit SSL security and we never store your card details.'
        },
        {
          question: 'Do you charge for shipping?',
          answer: 'We offer FREE SHIPPING on all orders across India! No minimum order value required.'
        },
        {
          question: 'Can I pay Cash on Delivery (COD)?',
          answer: 'Currently, we only accept online payments through Razorpay for faster order processing and better security. COD may be available in the future.'
        },
        {
          question: 'Do you offer bulk order discounts?',
          answer: 'Yes! We offer special pricing for bulk orders and corporate clients. Please contact us at founder@robohatch.in with your requirements for a custom quote.'
        },
      ]
    },
    {
      category: 'Returns & Refunds',
      icon: RefreshCw,
      questions: [
        {
          question: 'What is your return policy?',
          answer: 'We accept returns within 7 days of delivery if the product is defective, damaged, or not as described. Custom-made products and personalized items cannot be returned unless defective. Please refer to our Refund & Cancellation Policy for complete details.'
        },
        {
          question: 'How do I request a refund?',
          answer: 'To request a refund, email us at founder@robohatch.in with your order ID and reason for refund. Include photos if the product is damaged or defective. Approved refunds are processed within 5-7 business days.'
        },
        {
          question: 'Can I cancel my order?',
          answer: 'Yes, you can cancel your order before it is dispatched. Once dispatched, cancellation is not possible, but you can return the product as per our return policy. Contact us immediately at founder@robohatch.in or +91 95055 51727 to cancel.'
        },
        {
          question: 'What if I ordered the wrong item?',
          answer: 'If you ordered the wrong item, please contact us immediately. If the order hasn\'t been dispatched, we can modify or cancel it. If already shipped, you can return it within 7 days of delivery as per our return policy.'
        },
      ]
    },
    {
      category: 'Shipping & Delivery',
      icon: Truck,
      questions: [
        {
          question: 'Which courier partners do you use?',
          answer: 'We partner with trusted courier services including DTDC, Delhivery, Blue Dart, and India Post. The courier partner is selected based on your delivery location for optimal service.'
        },
        {
          question: 'Can I change my delivery address after placing an order?',
          answer: 'Address changes can only be made before the order is dispatched. Please contact us immediately at founder@robohatch.in or +91 95055 51727. Once dispatched, address changes are not possible.'
        },
        {
          question: 'What if nobody is home during delivery?',
          answer: 'The courier partner will attempt delivery 2-3 times. If unsuccessful, the package may be held at the local courier office for pickup, or you can reschedule delivery by contacting the courier partner directly using your tracking number.'
        },
        {
          question: 'Why is my order delayed?',
          answer: 'Delays can occur due to courier partner issues, weather conditions, public holidays, or remote locations. While RoboHatch is not responsible for courier delays beyond our control, we monitor all shipments and will assist in resolving issues. Contact us for support.'
        },
      ]
    },
    {
      category: 'Products & Materials',
      icon: HelpCircle,
      questions: [
        {
          question: 'What materials are used for 3D printing?',
          answer: 'We primarily use PLA (Polylactic Acid) and PETG for most products. PLA is eco-friendly, biodegradable, and available in various colors. For specific material requirements, please contact us for custom orders.'
        },
        {
          question: 'Are your products safe for children?',
          answer: 'Yes, our PLA products are non-toxic and safe. However, small parts may pose a choking hazard for children under 3 years. Adult supervision is recommended. Product-specific age recommendations are mentioned in descriptions.'
        },
        {
          question: 'Can products be used outdoors?',
          answer: 'PLA products are suitable for indoor use. For outdoor applications, we recommend PETG or other weather-resistant materials. Contact us for outdoor-use products with specific material requirements.'
        },
        {
          question: 'How do I care for my 3D printed products?',
          answer: 'Clean with a soft, damp cloth. Avoid exposing to direct sunlight or high temperatures (above 50°C) as PLA may deform. Do not put in dishwasher or microwave. Handle with care to prevent breakage.'
        },
        {
          question: 'Do you offer product warranties?',
          answer: 'We guarantee the quality of our products. If you receive a defective or damaged item, we will replace it or provide a full refund within 7 days of delivery. Custom products are checked before shipping to ensure quality.'
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600">
            Find answers to common questions about our products, orders, and services
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-6">
                <category.icon className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900">{category.category}</h2>
              </div>
              
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const globalIndex = categoryIndex * 100 + faqIndex;
                  const isOpen = openIndex === globalIndex;
                  
                  return (
                    <div
                      key={faqIndex}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(globalIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="px-4 pb-4 text-gray-700 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Still have questions?</h3>
          <p className="text-gray-700 mb-6">
            Can't find the answer you're looking for? Our support team is here to help!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:founder@robohatch.in"
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Email Us
            </a>
            <a
              href="tel:+919505551727"
              className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-orange-50 transition-colors whitespace-nowrap"
            >
              Call +91 95055 51727
            </a>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Response time: 24-48 hours during business days
          </p>
        </div>
      </div>
    </div>
  );
}
