import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gallerySettingsService, galleryCategoryService } from '@/services/gallery'
import type { 
  GallerySettings as GallerySettingsType, 
  GalleryCategory 
} from '@/types/gallery'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'

export const GallerySettings = () => {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')

  const { data: settings, isLoading: settingsLoading } = useQuery<GallerySettingsType>({
    queryKey: ['gallery-settings'],
    queryFn: gallerySettingsService.get,
  })

  const { data: categories = [] } = useQuery<GalleryCategory[]>({
    queryKey: ['gallery-categories'],
    queryFn: galleryCategoryService.getAll,
  })

  const updateMutation = useMutation({
    mutationFn: gallerySettingsService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings'] })
      console.log('✅ Settings updated successfully')
    },
    onError: (error: any) => {
      console.error('❌ Failed to update settings:', error)
      alert(error.response?.data?.message || 'Failed to update settings')
    },
  })

  // Initialize local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || '')
      setMessageTemplate(settings.enquiry_message_template || '')
    }
  }, [settings])

  // Debounced update for text inputs
  useEffect(() => {
    if (!settings) return
    
    const timer = setTimeout(() => {
      if (whatsappNumber !== settings.whatsapp_number) {
        updateMutation.mutate({ whatsapp_number: whatsappNumber })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [whatsappNumber])

  useEffect(() => {
    if (!settings) return
    
    const timer = setTimeout(() => {
      if (messageTemplate !== settings.enquiry_message_template) {
        updateMutation.mutate({ enquiry_message_template: messageTemplate })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [messageTemplate])

  const handleTogglePublic = () => {
    if (settings) {
      updateMutation.mutate({ is_public_enabled: !settings.is_public_enabled })
    }
  }

  const handleTogglePrices = () => {
    if (settings) {
      updateMutation.mutate({ show_prices: !settings.show_prices })
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    if (!settings) return
    
    const currentIds = settings.public_category_ids || []
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter((id) => id !== categoryId)
      : [...currentIds, categoryId]
    
    updateMutation.mutate({ public_category_ids: newIds })
  }

  const copyToClipboard = async () => {
    if (settings?.gallery_url) {
      // Use frontend URL instead of backend URL
      const shopId = settings.gallery_url.split('/').pop()
      const frontendUrl = `${window.location.origin}/gallery/${shopId}`
      await navigator.clipboard.writeText(frontendUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Get frontend URL from backend gallery_url
  const getFrontendGalleryUrl = () => {
    if (!settings?.gallery_url) return ''
    const shopId = settings.gallery_url.split('/').pop()
    return `${window.location.origin}/gallery/${shopId}`
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Public Gallery Link */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Public Gallery Link</h3>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={getFrontendGalleryUrl()}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getFrontendGalleryUrl(), '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Display Settings</h3>

        <div className="flex items-center justify-between p-4 rounded-lg">
          <div>
            <p className="font-medium">Public Gallery</p>
            <p className="text-sm text-muted-foreground">
              {settings?.is_public_enabled
            ? 'Your gallery is visible to everyone'
            : 'Your gallery is hidden from public'}
            </p>
          </div>
          <div className="flex-1" />
          <Switch
            checked={settings?.is_public_enabled || false}
            onCheckedChange={handleTogglePublic}
            disabled={updateMutation.isPending}
          />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg">
            <div>
              <p className="font-medium">Show Prices</p>
              <p className="text-sm text-muted-foreground">
            Display item prices on public gallery
              </p>
            </div>
            <div className="flex-1" />
            <Switch
              checked={settings?.show_prices || false}
              onCheckedChange={handleTogglePrices}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Enquiry */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">WhatsApp Enquiry</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g., 919876543210"
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Include country code without + (e.g., 91 for India)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-template">Enquiry Message Template</Label>
            <Textarea
              id="message-template"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Hi! I'm interested in this item from your gallery: {item_title}"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{item_title}'} as placeholder for item name
            </p>
          </div>
        </div>
      </div>

      {/* Category Visibility */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-2">Category Visibility</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select which categories to show on public gallery. Leave all unchecked to show all active categories.
        </p>
        
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No categories created yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map((category) => {
              const isSelected =
                !settings?.public_category_ids?.length ||
                settings.public_category_ids.includes(category.id)
              
              return (
                <label
                  key={category.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      settings?.public_category_ids?.includes(category.id) || false
                    }
                    onChange={() => handleCategoryToggle(category.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{category.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {category.items_count}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
         </div>
  )     
}
