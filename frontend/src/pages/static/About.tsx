import { Link } from 'react-router-dom'
import { Scissors, ArrowLeft, Users, Target, Heart, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-secondary/5 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">About StitchDesk</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Empowering boutiques and tailoring businesses with modern technology to streamline operations
            and deliver exceptional customer experiences.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                StitchDesk was born from a simple observation: boutique owners and tailors spend too much time
                on paperwork and not enough time on their craft. Managing customer measurements, tracking orders,
                creating invoices, and maintaining inventory often becomes overwhelming.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We set out to create a solution that brings the power of modern software to the traditional
                tailoring industry. Our platform is designed specifically for boutique owners who want to
                digitize their operations without the complexity of enterprise software.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Today, StitchDesk helps boutiques across India manage their businesses more efficiently,
                serve customers better, and grow their operations with confidence.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
              <Scissors className="h-24 w-24 text-primary mx-auto mb-4" />
              <p className="text-2xl font-bold text-foreground">Est. 2024</p>
              <p className="text-muted-foreground">Made with love in India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Customer First</h3>
                <p className="text-sm text-muted-foreground">
                  Every feature we build starts with understanding our users' needs
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Simplicity</h3>
                <p className="text-sm text-muted-foreground">
                  We believe powerful software should be easy to use
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Reliability</h3>
                <p className="text-sm text-muted-foreground">
                  Your business data is safe and accessible when you need it
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Passion</h3>
                <p className="text-sm text-muted-foreground">
                  We're passionate about helping artisans succeed
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To empower every boutique and tailoring business with accessible, affordable, and easy-to-use
            technology that helps them focus on what they do best — creating beautiful garments and
            delighting their customers.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-6">
            Have questions or want to learn more about StitchDesk? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <a href="mailto:hello@stitchdesk.com">Contact Us</a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/help">Visit Help Center</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StitchDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
