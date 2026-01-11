import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Scissors, Menu, X } from 'lucide-react'

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const element = document.querySelector(id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Scissors className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">StitchDesk</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('#features')}
              className="text-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('#pricing')}
              className="text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('#about')}
              className="text-foreground hover:text-primary transition-colors"
            >
              About
            </button>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-border">
          <div className="px-4 py-4 space-y-4">
            <button
              onClick={() => scrollToSection('#features')}
              className="block w-full text-left text-foreground hover:text-primary transition-colors py-2"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('#pricing')}
              className="block w-full text-left text-foreground hover:text-primary transition-colors py-2"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('#about')}
              className="block w-full text-left text-foreground hover:text-primary transition-colors py-2"
            >
              About
            </button>
            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); navigate('/login') }}>
                Login
              </Button>
              <Button className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/signup') }}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
