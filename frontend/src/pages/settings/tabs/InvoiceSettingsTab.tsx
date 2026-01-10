import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings'
import type { InvoiceSettings } from '@/services/settings'
import type { InvoiceTemplate } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, FileText } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export const InvoiceSettingsTab = () => {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<InvoiceSettings>({
    invoice_numbering_format: '{prefix}{number}',
    default_tax_type: 'GST',
    default_cgst_percent: 9,
    default_sgst_percent: 9,
    default_igst_percent: 18,
    show_tax_on_invoice: true,
    invoice_template: 'classic',
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['invoiceSettings'],
    queryFn: settingsService.getInvoiceSettings,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        invoice_numbering_format: settings.invoice_numbering_format || '{prefix}{number}',
        default_tax_type: settings.default_tax_type || 'GST',
        default_cgst_percent: settings.default_cgst_percent || 9,
        default_sgst_percent: settings.default_sgst_percent || 9,
        default_igst_percent: settings.default_igst_percent || 18,
        show_tax_on_invoice: settings.show_tax_on_invoice ?? true,
        invoice_template: settings.invoice_template || 'classic',
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InvoiceSettings>) => settingsService.updateInvoiceSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceSettings'] })
      alert('Invoice settings updated successfully!')
    },
    onError: () => {
      alert('Failed to update settings. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
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
        <CardTitle>Invoice Settings</CardTitle>
        <CardDescription>
          Configure invoice numbering and tax settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Invoice Numbering Format */}
            <div className="space-y-2">
              <Label htmlFor="invoice_numbering_format">Invoice Numbering Format</Label>
              <Input
                id="invoice_numbering_format"
                value={formData.invoice_numbering_format}
                onChange={(e) => setFormData({ ...formData, invoice_numbering_format: e.target.value })}
                placeholder="{prefix}{number}"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{prefix}'} and {'{number}'} as placeholders
              </p>
            </div>

            {/* Default Tax Type */}
            <div className="space-y-2">
              <Label htmlFor="default_tax_type">Default Tax Type</Label>
              <Select
                key={`tax-type-${formData.default_tax_type}`}
                value={formData.default_tax_type}
                onValueChange={(value: 'GST' | 'NON_GST') => 
                  setFormData({ ...formData, default_tax_type: value })
                }
              >
                <SelectTrigger id="default_tax_type">
                  <SelectValue placeholder="Select tax type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="NON_GST">Non-GST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CGST */}
            <div className="space-y-2">
              <Label htmlFor="default_cgst_percent">Default CGST %</Label>
              <Input
                id="default_cgst_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.default_cgst_percent}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  default_cgst_percent: parseFloat(e.target.value) || 0 
                })}
              />
            </div>

            {/* SGST */}
            <div className="space-y-2">
              <Label htmlFor="default_sgst_percent">Default SGST %</Label>
              <Input
                id="default_sgst_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.default_sgst_percent}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  default_sgst_percent: parseFloat(e.target.value) || 0 
                })}
              />
            </div>

            {/* IGST */}
            <div className="space-y-2">
              <Label htmlFor="default_igst_percent">Default IGST %</Label>
              <Input
                id="default_igst_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.default_igst_percent}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  default_igst_percent: parseFloat(e.target.value) || 0 
                })}
              />
            </div>
          </div>

          {/* Show Tax on Invoice */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show_tax_on_invoice"
              checked={formData.show_tax_on_invoice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, show_tax_on_invoice: e.target.checked })
              }
            />
            <Label htmlFor="show_tax_on_invoice" className="cursor-pointer">
              Show tax breakdown on invoice
            </Label>
          </div>

          {/* Invoice Template */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Invoice Template</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the template style for your invoice PDFs
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { value: 'classic', name: 'Classic', description: 'Traditional design with formal borders and serif fonts' },
                { value: 'modern', name: 'Modern', description: 'Clean contemporary design with accent colors' },
                { value: 'minimal', name: 'Minimal', description: 'Ultra-clean layout with focus on content' },
                { value: 'elegant', name: 'Elegant', description: 'Sophisticated styling with decorative elements' },
              ].map((template) => (
                <div
                  key={template.value}
                  onClick={() => setFormData({ ...formData, invoice_template: template.value as InvoiceTemplate })}
                  className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${
                    formData.invoice_template === template.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${
                      formData.invoice_template === template.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </div>
                  </div>
                  {formData.invoice_template === template.value && (
                    <div className="absolute top-2 right-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
