import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { EmptyState } from '@/components/common/EmptyState'
import { CustomerForm } from '@/components/common/CustomerForm'
import { CustomerViewDialog } from '@/components/common/CustomerViewDialog'
import { customerService } from '@/services/customers'
import { measurementService } from '@/services/measurements'
import type { Customer, Measurement } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/common/Button'
import { Search, Ruler, Eye, Pencil, Loader2 } from 'lucide-react'

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
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <p className="text-destructive text-center">
              Failed to load customers. Please try again.
            </p>
          </div>
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
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
              <p className="text-muted-foreground">
                No customers found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <EmptyState
              title="No customers yet"
              description="Start by adding your first customer to the system."
              action={<CustomerForm onSuccess={handleSuccess} />}
            />
          )
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Measurements
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const customerMeasurements = getCustomerMeasurements(customer.id)
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                        {customer.alternate_phone && (
                          <div className="text-xs text-gray-500">Alt: {customer.alternate_phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {customer.email || <span className="text-gray-400 italic">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                          {customer.address || <span className="text-gray-400 italic">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Ruler className="w-3 h-3 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {customerMeasurements.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CustomerViewDialog
                            customer={customer}
                            trigger={
                              <Button variant="ghost" size="sm" title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <CustomerForm
                            customer={customer}
                            mode="edit"
                            onSuccess={handleSuccess}
                            trigger={
                              <Button variant="ghost" size="sm" title="Edit Customer">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

