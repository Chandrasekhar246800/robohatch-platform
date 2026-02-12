import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - RoboHatch | Premium 3D Printed Products',
  description: 'Learn about RoboHatch - India\'s leading platform for premium 3D printed products, custom designs, and innovative tech-based solutions.',
  keywords: 'about robohatch, 3D printing company India, custom 3D products, tech solutions',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About RoboHatch</h1>
          <p className="text-xl text-gray-600">
            Transforming imagination into reality through precision 3D printing
          </p>
        </header>

        {/* Company Overview */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Are</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            RoboHatch is a pioneering e-commerce platform specializing in premium 3D printed products and innovative tech-based solutions. Based in India, we combine cutting-edge technology with artistic craftsmanship to deliver unique, high-quality products that bring your ideas to life.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            From custom keychains and intricate figurines to anime collectibles, home décor, and functional tech accessories, our diverse product range caters to enthusiasts, collectors, and businesses seeking personalized solutions.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We pride ourselves on delivering products that exceed expectations through precision engineering, attention to detail, and commitment to customer satisfaction.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                To democratize access to premium 3D printed products by combining advanced manufacturing technology with affordable pricing, exceptional quality, and unparalleled customer service. We strive to make personalized, innovative products accessible to everyone across India.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-700 leading-relaxed">
                To become India's most trusted platform for 3D printed products, recognized for innovation, quality, and customer-centric solutions. We envision a future where every idea can be transformed into tangible reality with speed, precision, and creativity.
              </p>
            </div>
          </div>
        </section>

        {/* What Sets Us Apart */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">What Sets Us Apart</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Premium Quality</h3>
              <p className="text-gray-700">
                Every product undergoes rigorous quality checks to ensure flawless finish, durability, and precision. We use only industry-grade materials and advanced 3D printing technology.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Custom Design Services</h3>
              <p className="text-gray-700">
                Bring your unique ideas to life with our custom design service. Our expert team works closely with you to create personalized products tailored to your specifications.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Fast & Reliable Delivery</h3>
              <p className="text-gray-700">
                We understand the excitement of receiving your order. Our streamlined production and logistics ensure timely delivery across India without compromising quality.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Secure Payments</h3>
              <p className="text-gray-700">
                We partner with Razorpay, India's leading payment gateway, to provide secure, hassle-free transactions with support for all major payment methods.
              </p>
            </div>
          </div>
        </section>

        {/* Our Commitment */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment to You</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">✓</span>
              <span><strong>Quality Assurance:</strong> 100% satisfaction guarantee with strict quality control at every stage.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">✓</span>
              <span><strong>Customer Support:</strong> Dedicated team available to assist with inquiries, customizations, and post-purchase support.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">✓</span>
              <span><strong>Transparency:</strong> Clear communication regarding pricing, delivery timelines, and product specifications.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">✓</span>
              <span><strong>Innovation:</strong> Continuously exploring new materials, designs, and technologies to expand our offerings.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-3">✓</span>
              <span><strong>Sustainability:</strong> Committed to minimizing waste through efficient production processes and eco-friendly materials when possible.</span>
            </li>
          </ul>
        </section>

        {/* Location */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">India-Based Operations</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            RoboHatch operates from India, serving customers nationwide. Our strategic location allows us to efficiently serve both metropolitan cities and tier-2 markets with equal dedication.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We are proud to contribute to India's growing manufacturing and e-commerce ecosystem while supporting local innovation and entrepreneurship.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary to-accent rounded-lg shadow-lg p-8 text-white">
          <h2 className="text-2xl font-semibold mb-4">Ready to Create Something Amazing?</h2>
          <p className="mb-6 text-orange-100">
            Explore our collection or get in touch for custom design consultations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Browse Products
            </Link>
            <Link
              href="/contact"
              className="bg-dark-brown text-white px-8 py-3 rounded-lg font-semibold hover:bg-dark-espresso transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
