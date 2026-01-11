import { Link } from 'react-router-dom'
import { Scissors, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">StitchDesk</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using StitchDesk ("the Service"), you accept and agree to be bound by the terms
              and conditions of this agreement. If you do not agree to these terms, you should not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              StitchDesk is a boutique and tailoring shop management platform that provides tools for customer
              management, measurements tracking, order management, invoicing, inventory management, and portfolio
              gallery features. The Service is provided "as is" and we reserve the right to modify, suspend, or
              discontinue any part of the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept all risks of unauthorized access</li>
              <li>Notify us immediately if you discover any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>All activities that occur under your account</li>
              <li>Ensuring that your use of the Service complies with all applicable laws</li>
              <li>Maintaining the confidentiality of your customers' data</li>
              <li>Obtaining necessary consents from your customers for data collection and processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. You retain ownership of all data
              you input into the Service. We will not sell, share, or use your data for purposes other than
              providing the Service, except as required by law or as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Certain features of the Service require payment of fees. By subscribing to a paid plan, you agree
              to pay all applicable fees as described at the time of purchase. Fees are non-refundable except
              as required by law or as explicitly stated in our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by StitchDesk and are
              protected by international copyright, trademark, patent, trade secret, and other intellectual
              property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall StitchDesk, its directors, employees, partners, agents, suppliers, or affiliates
              be liable for any indirect, incidental, special, consequential, or punitive damages, including
              without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice or liability, for any
              reason whatsoever, including without limitation if you breach the Terms. Upon termination, your
              right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we
              will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@stitchdesk.com" className="text-primary hover:underline">
                support@stitchdesk.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StitchDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
