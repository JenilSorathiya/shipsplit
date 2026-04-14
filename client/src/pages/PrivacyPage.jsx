import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">ShipSplit</span>
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: April 14, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              ShipSplit ("we", "our", or "us") is a shipping label management platform designed for
              Amazon and other marketplace sellers in India. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our website
              and services at <strong>shipsplitt.vercel.app</strong>.
            </p>
            <p className="mt-2">
              By using ShipSplit, you agree to the collection and use of information in accordance
              with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="font-medium text-gray-800 mb-2">2.1 Account Information</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Name, email address, and phone number when you register</li>
              <li>Business name and GST number (optional)</li>
              <li>Password (stored as a secure hash — never in plain text)</li>
            </ul>
            <h3 className="font-medium text-gray-800 mt-4 mb-2">2.2 Amazon Seller Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Amazon Seller Central OAuth access token and refresh token (encrypted at rest)</li>
              <li>Order information including Order IDs, product names, ASINs, and shipping addresses</li>
              <li>Shipping label PDFs downloaded via Amazon MFN/SP-API</li>
              <li>Fulfillment channel (FBA/FBM) and gift order status</li>
            </ul>
            <h3 className="font-medium text-gray-800 mt-4 mb-2">2.3 Usage Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Log data including IP address, browser type, pages visited, and timestamps</li>
              <li>Actions performed within the application (label splits, downloads, syncs)</li>
            </ul>
            <h3 className="font-medium text-gray-800 mt-4 mb-2">2.4 Payment Information</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Subscription plan and billing history</li>
              <li>Razorpay payment IDs (we do not store card numbers or bank details)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To provide and operate the ShipSplit service</li>
              <li>To sync your Amazon orders and generate/split shipping labels</li>
              <li>To process payments and manage your subscription</li>
              <li>To send transactional emails (account verification, password reset, invoices)</li>
              <li>To improve our platform and fix bugs</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Amazon SP-API Data Usage</h2>
            <p>
              ShipSplit integrates with the Amazon Selling Partner API (SP-API) to access your seller
              account data. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>We access order data <strong>only</strong> to display it within your ShipSplit dashboard</li>
              <li>We access shipping labels <strong>only</strong> to enable the label splitting feature</li>
              <li>We do <strong>not</strong> sell, share, or use your Amazon data for advertising</li>
              <li>We do <strong>not</strong> access any Amazon data beyond what is necessary for the service</li>
              <li>Your Amazon access tokens are encrypted using AES-256-GCM before storage</li>
              <li>You can disconnect your Amazon account at any time from Settings → Platforms</li>
            </ul>
            <p className="mt-3 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
              <strong>Amazon Data Retention:</strong> Amazon order and label data is retained only as long
              as your account is active. Upon account deletion, all Amazon-related data is permanently removed
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing & Disclosure</h2>
            <p>We do <strong>not</strong> sell your personal data. We may share data with:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong>MongoDB Atlas</strong> — cloud database provider for data storage</li>
              <li><strong>Razorpay</strong> — payment processing</li>
              <li><strong>Amazon</strong> — via SP-API as authorized by you</li>
              <li><strong>Law enforcement</strong> — only when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>All data is transmitted over HTTPS/TLS</li>
              <li>Passwords are hashed using bcrypt (never stored in plain text)</li>
              <li>Amazon API tokens are encrypted with AES-256-GCM</li>
              <li>JWT authentication tokens expire after 15 minutes</li>
              <li>We perform regular security reviews of our codebase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong>Access</strong> — request a copy of your personal data</li>
              <li><strong>Rectification</strong> — correct inaccurate data via Settings</li>
              <li><strong>Deletion</strong> — request deletion of your account and all associated data</li>
              <li><strong>Disconnect</strong> — revoke Amazon access at any time from Settings</li>
              <li><strong>Data Portability</strong> — export your order data as CSV from Reports</li>
            </ul>
            <p className="mt-2">To exercise these rights, email us at <strong>support@shipsplit.in</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              ShipSplit uses only essential cookies for authentication (HTTP-only, secure). We do not
              use advertising or tracking cookies. We do not use Google Analytics or any third-party
              analytics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>
              ShipSplit is not intended for use by persons under the age of 18. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant
              changes by posting the new policy on this page with an updated date and sending an email
              to registered users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, contact us:</p>
            <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <p><strong>ShipSplit</strong></p>
              <p>Email: <a href="mailto:support@shipsplit.in" className="text-primary-600 hover:underline">support@shipsplit.in</a></p>
              <p>Website: <a href="https://shipsplitt.vercel.app" className="text-primary-600 hover:underline">shipsplitt.vercel.app</a></p>
              <p>WhatsApp: +91 98765 43210</p>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400 mt-8">
        <p>© {new Date().getFullYear()} ShipSplit. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <Link to="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link to="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
