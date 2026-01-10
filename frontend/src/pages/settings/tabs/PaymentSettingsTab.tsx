import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings'
import type { PaymentMethod } from '@/services/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2 } from 'lucide-react'

export const PaymentSettingsTab = () => {
  const queryClient = useQueryClient()
  const [newMethodName, setNewMethodName] = useState('')

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: settingsService.getPaymentMethods,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => settingsService.createPaymentMethod(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] })
      setNewMethodName('')
    },
    onError: () => {
      alert('Failed to add payment method. It may already exist.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PaymentMethod> }) => 
      settingsService.updatePaymentMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] })
    },
    onError: () => {
      alert('Failed to delete payment method.')
    },
  })

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMethodName.trim()) {
      createMutation.mutate(newMethodName.trim())
    }
  }

  const handleToggleActive = (method: PaymentMethod) => {
    updateMutation.mutate({
      id: method.id,
      data: { is_active: !method.is_active },
    })
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      deleteMutation.mutate(id)
    }
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
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage the payment methods available for your customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Payment Method */}
        <form onSubmit={handleAddMethod} className="flex gap-2 max-w-md">
          <div className="flex-1">
            <Label htmlFor="new_method" className="sr-only">New Payment Method</Label>
            <Input
              id="new_method"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Enter payment method name (e.g., Card, Bank Transfer)"
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending || !newMethodName.trim()}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </form>

        {/* Payment Methods List */}
        <div className="space-y-2">
          <Label>Available Payment Methods</Label>
          <div className="border rounded-lg divide-y">
            {paymentMethods && paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <div 
                  key={method.id} 
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => handleToggleActive(method)}
                      disabled={updateMutation.isPending}
                    />
                    <span className={method.is_active ? '' : 'text-muted-foreground'}>
                      {method.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(method.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No payment methods configured. Add one above.
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Toggle the switch to enable or disable a payment method. Disabled methods won't appear in order forms.
        </p>
      </CardContent>
    </Card>
  )
}
