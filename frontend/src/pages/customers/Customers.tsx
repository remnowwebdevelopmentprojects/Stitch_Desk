import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { EmptyState } from '@/components/common/EmptyState'
import { CustomerForm } from '@/components/common/CustomerForm'
import { CustomerViewDialog } from '@/components/common/CustomerViewDialog'
import { customerService } from '@/services/customers'
import { measurementService } from '@/services/measurements'
import type { Customer, Measurement } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Ruler, Eye, Pencil } from 'lucide-react'

export const Customers = () => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
  })

  // Fetch all measurements
  const { data: allMeasurements = [] } = useQuery<Measurement[]>({
    queryKey: ['measurements'],
    queryFn: () => measurementService.getAll(),
  })

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['measurements'] })
  }

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase()
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.alternate_phone?.includes(query)
    )
  })

  // Helper function to get customer measurements
  const getCustomerMeasurements = (customerId: string) => {
    return allMeasurements.filter((m) => m.customer === customerId)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="text-muted-foreground mt-2">
                Manage your customer database
              </p>
            </div>
            <CustomerForm onSuccess={handleSuccess} />
          </div>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Customers</h1>
              <p className="text-muted-foreground mt-2">
                Manage your customer database
              </p>
            </div>
            <CustomerForm onSuccess={handleSuccess} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load customers. Please try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage your customer database
            </p>
          </div>
          <CustomerForm onSuccess={handleSuccess} />
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredCustomers.length === 0 ? (
          searchQuery ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No customers found matching "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No customers yet"
              description="Start by adding your first customer to the system."
              action={<CustomerForm onSuccess={handleSuccess} />}
            />
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCustomers.map((customer) => {
              const customerMeasurements = getCustomerMeasurements(customer.id)
              return (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-base font-semibold leading-tight">
                        {customer.name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <CustomerViewDialog
                          customer={customer}
                          trigger={
                            <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          }
                        />
                        <CustomerForm
                          customer={customer}
                          mode="edit"
                          onSuccess={handleSuccess}
                          trigger={
                            <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground min-w-[60px]">Phone:</span>
                        <span className="font-medium">{customer.phone}</span>
                      </div>
                      {customer.alternate_phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground min-w-[60px]">Alt:</span>
                          <span className="font-medium">{customer.alternate_phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground min-w-[60px]">Email:</span>
                          <span className="font-medium truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-start gap-2 pt-1">
                          <span className="text-muted-foreground min-w-[60px] text-xs">Address:</span>
                          <span className="font-medium text-xs line-clamp-2">{customer.address}</span>
                        </div>
                      )}

                      {/* Measurements Section */}
                      {customerMeasurements.length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center gap-1">
                            <Ruler className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">
                              Measurements ({customerMeasurements.length})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

