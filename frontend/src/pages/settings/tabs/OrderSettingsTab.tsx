import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings'
import type { OrderSettings } from '@/services/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export const OrderSettingsTab = () => {
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<OrderSettings>({
    delivery_duration_days: 7,
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['orderSettings'],
    queryFn: settingsService.getOrderSettings,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        delivery_duration_days: settings.delivery_duration_days || 7,
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: OrderSettings) => settingsService.updateOrderSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderSettings'] })
      alert('Order settings updated successfully!')
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
        <CardTitle>Order Settings</CardTitle>
        <CardDescription>
          Configure default settings for orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="delivery_duration_days">Default Delivery Duration (Days)</Label>
            <Input
              id="delivery_duration_days"
              type="number"
              min="1"
              value={formData.delivery_duration_days}
              onChange={(e) => setFormData({ 
                ...formData, 
                delivery_duration_days: parseInt(e.target.value) || 1 
              })}
              placeholder="Enter number of days"
            />
            <p className="text-sm text-muted-foreground">
              This value will be used to automatically calculate the delivery date when creating new orders.
            </p>
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
