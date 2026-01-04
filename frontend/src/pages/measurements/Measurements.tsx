import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/common/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { measurementTemplateService } from '@/services/measurementTemplates'
import type { MeasurementTemplate, MeasurementTemplateField, ItemType } from '@/types'
import { Plus, X, Image as ImageIcon, Edit, Trash2 } from 'lucide-react'

export const Measurements = () => {
  const [selectedItemType, setSelectedItemType] = useState<ItemType | ''>('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['measurement-templates', selectedItemType],
    queryFn: () => measurementTemplateService.getAll(selectedItemType || undefined, true),
  })

  const filteredTemplates = selectedItemType
    ? templates.filter((t) => t.item_type === selectedItemType)
    : templates

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Measurement Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage measurement templates for different item types
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-3">
          <div className="w-48">
            <Label htmlFor="itemTypeFilter" className="text-xs">Filter by Item Type</Label>
            <Select
              value={selectedItemType || 'all'}
              onValueChange={(value) => setSelectedItemType(value === 'all' ? '' : (value as ItemType))}
            >
              <SelectTrigger id="itemTypeFilter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BLOUSE">Blouse</SelectItem>
                <SelectItem value="SAREE">Saree</SelectItem>
                <SelectItem value="DRESS">Dress</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <CreateTemplateForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => setShowCreateForm(false)}
          />
        )}

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No templates found. Create your first template.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// Template Card Component
const TemplateCard = ({ template }: { template: MeasurementTemplate }) => {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  const deleteTemplate = useMutation({
    mutationFn: () => measurementTemplateService.delete(template.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement-templates'] })
    },
  })

  return (
    <>
      {isEditing && (
        <EditTemplateForm
          template={template}
          onClose={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      )}
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">{template.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{template.item_type}</CardDescription>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTemplate.mutate()}
              className="h-7 w-7 p-0 text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {template.image_url ? (
          <div className="aspect-video bg-muted rounded overflow-hidden border">
            <img
              src={template.image_url}
              alt={template.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded flex items-center justify-center border">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Fields</Label>
            <span className="text-xs text-muted-foreground">{template.fields.length}</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {template.fields.slice(0, 4).map((field, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded"
              >
                <span className="font-medium truncate">{field.point}: {field.label}</span>
                <span className="text-muted-foreground ml-2">{field.unit}</span>
              </div>
            ))}
            {template.fields.length > 4 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{template.fields.length - 4} more
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}

// Create Template Form
const CreateTemplateForm = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<{
    item_type: ItemType | ''
    name: string
    image: File | null
    fields: MeasurementTemplateField[]
  }>({
    item_type: '' as ItemType | '',
    name: '',
    image: null,
    fields: [],
  })
  const [newField, setNewField] = useState({
    label: '',
    point: '',
    unit: 'CM' as 'CM' | 'INCH',
  })

  const createTemplate = useMutation({
    mutationFn: (data: any) => measurementTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement-templates'] })
      onSuccess()
    },
  })

  const handleAddField = () => {
    if (!newField.label || !newField.point) return

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...newField }],
    }))

    setNewField({ label: '', point: '', unit: 'CM' })
  }

  const handleRemoveField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item_type || !formData.name || !formData.image || formData.fields.length === 0) {
      return
    }

    createTemplate.mutate({
      item_type: formData.item_type,
      name: formData.name,
      image: formData.image,
      fields: formData.fields,
      is_active: true,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Create Measurement Template</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="itemType" className="text-xs">Item Type *</Label>
                <Select
                  value={formData.item_type || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, item_type: value as ItemType }))
                  }
                  required
                >
                  <SelectTrigger id="itemType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOUSE">Blouse</SelectItem>
                    <SelectItem value="SAREE">Saree</SelectItem>
                    <SelectItem value="DRESS">Dress</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Blouse Template"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-xs">Upload Sketch Image *</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setFormData((prev) => ({ ...prev, image: file }))
                }}
                required
              />
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="max-h-48 rounded-md border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs">Measurement Fields *</Label>
              <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                  <Input
                    placeholder="Point (1, 2, 3...)"
                    value={newField.point}
                    onChange={(e) => setNewField((prev) => ({ ...prev, point: e.target.value }))}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Label (Chest, Waist...)"
                    value={newField.label}
                    onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <RadioGroup
                      value={newField.unit}
                      onValueChange={(value) =>
                        setNewField((prev) => ({ ...prev, unit: value as 'CM' | 'INCH' }))
                      }
                      className="flex flex-row gap-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="CM" id="create-cm" />
                        <Label htmlFor="create-cm" className="text-xs font-normal cursor-pointer">CM</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="INCH" id="create-inch" />
                        <Label htmlFor="create-inch" className="text-xs font-normal cursor-pointer">INCH</Label>
                      </div>
                    </RadioGroup>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddField}
                      disabled={!newField.label || !newField.point}
                      className="ml-2"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {formData.fields.length > 0 && (
                <div className="space-y-1">
                  {formData.fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-background border rounded text-sm"
                    >
                      <span>
                        <span className="font-medium">{field.point}:</span> {field.label} ({field.unit})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTemplate.isPending || !formData.item_type || !formData.name || !formData.image || formData.fields.length === 0}
              >
                {createTemplate.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Edit Template Form (similar to create)
const EditTemplateForm = ({
  template,
  onClose,
  onSuccess,
}: {
  template: MeasurementTemplate
  onClose: () => void
  onSuccess: () => void
}) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    item_type: template.item_type,
    name: template.name,
    image: null as File | null,
    fields: template.fields,
  })
  const [newField, setNewField] = useState({
    label: '',
    point: '',
    unit: 'CM' as 'CM' | 'INCH',
  })

  const updateTemplate = useMutation({
    mutationFn: (data: any) => measurementTemplateService.update(template.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement-templates'] })
      onSuccess()
    },
  })

  const handleAddField = () => {
    if (!newField.label || !newField.point) return

    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...newField }],
    }))

    setNewField({ label: '', point: '', unit: 'CM' })
  }

  const handleRemoveField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item_type || !formData.name || formData.fields.length === 0) {
      return
    }

    const updateData: any = {
      item_type: formData.item_type,
      name: formData.name,
      fields: formData.fields,
    }

    if (formData.image) {
      updateData.image = formData.image
    }

    updateTemplate.mutate(updateData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Edit Measurement Template</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editItemType" className="text-xs">Item Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, item_type: value as ItemType }))
                }
                required
              >
                <SelectTrigger id="editItemType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOUSE">Blouse</SelectItem>
                  <SelectItem value="SAREE">Saree</SelectItem>
                  <SelectItem value="DRESS">Dress</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editName" className="text-xs">Template Name *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editImage" className="text-xs">Update Image (Optional)</Label>
            <Input
              id="editImage"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setFormData((prev) => ({ ...prev, image: file }))
              }}
            />
            {template.image_url && !formData.image && (
              <div className="mt-2">
                <img src={template.image_url} alt="Current" className="max-h-48 rounded-md border" />
              </div>
            )}
            {formData.image && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(formData.image)}
                  alt="New preview"
                  className="max-h-48 rounded-md border"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-xs">Measurement Fields *</Label>
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                <Input
                  placeholder="Point (1, 2, 3...)"
                  value={newField.point}
                  onChange={(e) => setNewField((prev) => ({ ...prev, point: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  placeholder="Label (Chest, Waist...)"
                  value={newField.label}
                  onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex items-center gap-3">
                  <RadioGroup
                    value={newField.unit}
                    onValueChange={(value) =>
                      setNewField((prev) => ({ ...prev, unit: value as 'CM' | 'INCH' }))
                    }
                    className="flex flex-row gap-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="CM" id="edit-cm" />
                      <Label htmlFor="edit-cm" className="text-xs font-normal cursor-pointer">CM</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="INCH" id="edit-inch" />
                      <Label htmlFor="edit-inch" className="text-xs font-normal cursor-pointer">INCH</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddField}
                    disabled={!newField.label || !newField.point}
                    className="ml-2"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {formData.fields.length > 0 && (
              <div className="space-y-1">
                {formData.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-background border rounded text-sm"
                  >
                    <span>
                      <span className="font-medium">{field.point}:</span> {field.label} ({field.unit})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? 'Updating...' : 'Update Template'}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>
    </div>
  )
}

