import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from './Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { customerService, type CreateCustomerData } from '@/services/customers'
import { measurementTemplateService } from '@/services/measurementTemplates'
import { measurementService } from '@/services/measurements'
import type { Customer, MeasurementTemplate, Measurement } from '@/types'
import { Ruler, Plus, Trash2 } from 'lucide-react'

interface CustomerFormProps {
  onSuccess?: (customer: Customer) => void
  trigger?: React.ReactNode
  customer?: Customer | null
  mode?: 'create' | 'edit'
}

export const CustomerForm = ({
  onSuccess,
  trigger,
  customer,
  mode = 'create',
}: CustomerFormProps) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: customer?.name || '',
    phone: customer?.phone || '',
    alternate_phone: customer?.alternate_phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
  })

  // Measurement state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [measurementValues, setMeasurementValues] = useState<Record<string, number | string>>({})
  const [measurementNotes, setMeasurementNotes] = useState('')
  const [existingMeasurements, setExistingMeasurements] = useState<Measurement[]>([])

  // Fetch templates
  const { data: templates = [] } = useQuery<MeasurementTemplate[]>({
    queryKey: ['measurement-templates'],
    queryFn: () => measurementTemplateService.getAll(undefined, true),
  })

  // Fetch existing measurements for this customer (only in edit mode)
  useEffect(() => {
    if (mode === 'edit' && customer?.id && open) {
      measurementService.getAll(customer.id).then((measurements) => {
        setExistingMeasurements(measurements)
      })
    }
  }, [mode, customer?.id, open])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Reset measurement values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initialValues: Record<string, number | string> = {}
      selectedTemplate.fields.forEach((field) => {
        initialValues[field.point] = ''
      })
      setMeasurementValues(initialValues)
    }
  }, [selectedTemplate])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      let result: Customer
      if (mode === 'edit' && customer) {
        result = await customerService.update(customer.id, formData)
      } else {
        result = await customerService.create(formData)
      }

      // Save measurement if template is selected and values are provided
      if (selectedTemplate && Object.values(measurementValues).some((v) => v !== '')) {
        await measurementService.create({
          customer: result.id,
          template: selectedTemplateId,
          measurements: measurementValues,
          notes: measurementNotes || undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['measurements'] })
      }

      // Reset form
      setFormData({
        name: '',
        phone: '',
        alternate_phone: '',
        email: '',
        address: '',
      })
      setSelectedTemplateId('')
      setMeasurementValues({})
      setMeasurementNotes('')
      setExistingMeasurements([])
      setOpen(false)
      onSuccess?.(result)
    } catch (error: any) {
      // Handle API errors
      if (error.response?.data) {
        const apiErrors = error.response.data
        if (typeof apiErrors === 'object') {
          const formattedErrors: Record<string, string> = {}
          Object.keys(apiErrors).forEach((key) => {
            const value = apiErrors[key]
            if (Array.isArray(value)) {
              formattedErrors[key] = value[0]
            } else {
              formattedErrors[key] = String(value)
            }
          })
          setErrors(formattedErrors)
        } else {
          setErrors({ submit: String(apiErrors) })
        }
      } else {
        setErrors({ submit: 'Failed to save customer. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeasurement = async (measurementId: string) => {
    try {
      await measurementService.delete(measurementId)
      setExistingMeasurements((prev) => prev.filter((m) => m.id !== measurementId))
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
    } catch (error) {
      console.error('Failed to delete measurement:', error)
    }
  }

  const defaultTrigger = (
    <Button>{mode === 'edit' ? 'Edit Customer' : 'Add Customer'}</Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update customer information and add measurements below.'
              : 'Enter customer details and optionally add measurements.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Customer Information</h3>

            {/* Name and Phone in one row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone <span className="text-destructive">*</span>
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Alternate Phone and Email in one row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="alternate_phone" className="text-sm font-medium">
                  Alternate Phone
                </label>
                <Input
                  id="alternate_phone"
                  name="alternate_phone"
                  type="tel"
                  value={formData.alternate_phone}
                  onChange={handleChange}
                  placeholder="Enter alternate phone number (optional)"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address (optional)"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Address full width */}
            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address (optional)"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Measurements Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Add Measurements</h3>
            </div>

            {/* Existing Measurements (Edit mode only) */}
            {mode === 'edit' && existingMeasurements.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Existing Measurements</Label>
                <div className="space-y-2">
                  {existingMeasurements.map((measurement) => (
                    <div
                      key={measurement.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                    >
                      <div>
                        <span className="font-medium">{measurement.template_name || 'Custom'}</span>
                        {measurement.notes && (
                          <p className="text-xs text-muted-foreground">{measurement.notes}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMeasurement(measurement.id)}
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="template" className="text-sm">Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choose a measurement template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.item_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Measurement Fields - Split Layout */}
            {selectedTemplate && (
              <div className="grid grid-cols-[1fr_auto] gap-4 border rounded-md p-4 bg-muted/30">
                {/* Left: Measurement Fields */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{selectedTemplate.name}</Label>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.point} className="space-y-1">
                        <Label htmlFor={`measure-${field.point}`} className="text-xs">
                          {field.point}. {field.label} ({field.unit})
                        </Label>
                        <Input
                          id={`measure-${field.point}`}
                          type="number"
                          step="0.1"
                          value={measurementValues[field.point] || ''}
                          onChange={(e) =>
                            setMeasurementValues((prev) => ({
                              ...prev,
                              [field.point]: e.target.value,
                            }))
                          }
                          placeholder="0.0"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2">
                    <Label htmlFor="measurementNotes" className="text-xs">Notes (Optional)</Label>
                    <textarea
                      id="measurementNotes"
                      value={measurementNotes}
                      onChange={(e) => setMeasurementNotes(e.target.value)}
                      placeholder="Add any notes about these measurements..."
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                {/* Right: Template Image */}
                {selectedTemplate.image_url && (
                  <div className="flex items-start">
                    <div className="border rounded bg-white p-2 sticky top-0">
                      <img
                        src={selectedTemplate.image_url}
                        alt={selectedTemplate.name}
                        className="w-64 h-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Saving...'
                : mode === 'edit'
                ? 'Update Customer'
                : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

