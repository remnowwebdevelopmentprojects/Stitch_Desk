import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from './Button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { measurementService } from '@/services/measurements'
import { measurementTemplateService } from '@/services/measurementTemplates'
import type { Customer, Measurement, MeasurementTemplate } from '@/types'
import { Eye, Ruler, Mail, Phone, MapPin } from 'lucide-react'

interface CustomerViewDialogProps {
  customer: Customer
  trigger?: React.ReactNode
}

export const CustomerViewDialog = ({ customer, trigger }: CustomerViewDialogProps) => {
  const [open, setOpen] = useState(false)

  // Fetch measurements for this customer
  const { data: measurements = [], refetch } = useQuery<Measurement[]>({
    queryKey: ['customer-measurements', customer.id],
    queryFn: () => measurementService.getAll(customer.id),
    enabled: open,
  })

  // Fetch all templates to get template details
  const { data: templates = [] } = useQuery<MeasurementTemplate[]>({
    queryKey: ['measurement-templates'],
    queryFn: () => measurementTemplateService.getAll(undefined, true),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      refetch()
    }
  }, [open, refetch])

  const getTemplateById = (templateId: string) => {
    return templates.find((t) => t.id === templateId)
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="w-4 h-4 mr-2" />
      View Details
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
          <DialogDescription>
            Complete customer information and measurements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Contact Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{customer.phone}</p>
                </div>
              </div>

              {customer.alternate_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Alternate Phone</Label>
                    <p className="text-sm font-medium">{customer.alternate_phone}</p>
                  </div>
                </div>
              )}

              {customer.email && (
                <div className="flex items-start gap-3 col-span-2">
                  <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{customer.email}</p>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3 col-span-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="text-sm font-medium">{customer.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Measurements Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Ruler className="w-4 h-4" />
              <h3 className="text-sm font-semibold">
                Measurements ({measurements.length})
              </h3>
            </div>

            {measurements.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-md">
                <Ruler className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No measurements recorded for this customer
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {measurements.map((measurement, index) => {
                  const template = measurement.template ? getTemplateById(measurement.template) : null

                  return (
                    <AccordionItem key={measurement.id} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {measurement.template_name || `Measurement #${index + 1}`}
                          </span>
                          {measurement.notes && (
                            <span className="text-xs text-muted-foreground">
                              (Has notes)
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Template Image */}
                          {template?.image_url && (
                            <div className="flex justify-center bg-white border rounded-md p-3">
                              <img
                                src={template.image_url}
                                alt={template.name}
                                className="max-w-full h-auto max-h-64 object-contain"
                              />
                            </div>
                          )}

                          {/* Measurement Values */}
                          <div className="grid grid-cols-2 gap-3">
                            {template?.fields.map((field) => (
                              <div
                                key={field.point}
                                className="bg-muted/30 p-3 rounded-md"
                              >
                                <Label className="text-xs text-muted-foreground">
                                  {field.point}. {field.label}
                                </Label>
                                <p className="text-sm font-semibold mt-1">
                                  {measurement.measurements[field.point] || '-'} {field.unit}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {measurement.notes && (
                            <div className="bg-muted/30 p-3 rounded-md">
                              <Label className="text-xs text-muted-foreground">Notes</Label>
                              <p className="text-sm mt-1">{measurement.notes}</p>
                            </div>
                          )}

                          {/* Date */}
                          <div className="text-xs text-muted-foreground text-right">
                            Recorded on {new Date(measurement.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
