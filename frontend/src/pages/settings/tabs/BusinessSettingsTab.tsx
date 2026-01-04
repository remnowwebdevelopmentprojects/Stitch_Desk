import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings'
import type { BusinessSettings } from '@/services/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2 } from 'lucide-react'

export const BusinessSettingsTab = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<Partial<BusinessSettings>>({
    shop_name: '',
    phone_number: '',
    email: '',
    full_address: '',
    gst_number: '',
    invoice_prefix: '',
    quotation_prefix: '',
    default_currency: 'INR',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: settingsService.getBusinessSettings,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || '',
        phone_number: settings.phone_number || '',
        email: settings.email || '',
        full_address: settings.full_address || '',
        gst_number: settings.gst_number || '',
        invoice_prefix: settings.invoice_prefix || '',
        quotation_prefix: settings.quotation_prefix || '',
        default_currency: settings.default_currency || 'INR',
      })
      if (settings.logo_url) {
        setLogoPreview(settings.logo_url)
      }
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => settingsService.updateBusinessSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessSettings'] })
      alert('Business settings updated successfully!')
    },
    onError: () => {
      alert('Failed to update settings. Please try again.')
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = new FormData()
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        data.append(key, value)
      }
    })
    
    if (logoFile) {
      data.append('logo', logoFile)
    }
    
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>
          Update your shop details and branding information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Shop Logo</Label>
            <div className="flex items-center gap-4">
              <div 
                className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="text-sm text-muted-foreground">
                <p>Click to upload your shop logo</p>
                <p>Recommended size: 200x200px</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Shop Name */}
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop Name</Label>
              <Input
                id="shop_name"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                placeholder="Enter shop name"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                value={formData.phone_number || ''}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            {/* GST Number */}
            <div className="space-y-2">
              <Label htmlFor="gst_number">GST Number (Optional)</Label>
              <Input
                id="gst_number"
                value={formData.gst_number || ''}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                placeholder="Enter GST number"
              />
            </div>

            {/* Invoice Prefix */}
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
              <Input
                id="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="e.g., INV/25-26/"
              />
            </div>

            {/* Quotation Prefix */}
            <div className="space-y-2">
              <Label htmlFor="quotation_prefix">Quotation Prefix</Label>
              <Input
                id="quotation_prefix"
                value={formData.quotation_prefix}
                onChange={(e) => setFormData({ ...formData, quotation_prefix: e.target.value })}
                placeholder="e.g., QUO/25-26/"
              />
            </div>

            {/* Default Currency */}
            <div className="space-y-2">
              <Label htmlFor="default_currency">Default Currency</Label>
              <Input
                id="default_currency"
                value={formData.default_currency}
                onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                placeholder="e.g., INR"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-2">
            <Label htmlFor="full_address">Full Address</Label>
            <textarea
              id="full_address"
              value={formData.full_address || ''}
              onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
              placeholder="Enter full address"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
