import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { inventoryItemService, inventoryCategoryService, inventoryDashboardService } from '@/services/inventory'
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown,
  Boxes,
  FolderOpen,
  Loader2,
  Filter
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/utils/currency'
import { UNIT_LABELS } from '@/types/inventory'
import type { InventoryItemList, InventoryCategory } from '@/types/inventory'
import { 
  InventoryItemModal, 
  InventoryCategoryModal, 
  InventoryItemDetailModal, 
  StockInModal 
} from '@/components/inventory'

export const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showLowStock, setShowLowStock] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [stockInItemId, setStockInItemId] = useState<string | null>(null)

  // Fetch dashboard stats
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: inventoryDashboardService.getStats,
  })

  // Fetch categories
  const { data: categoriesData } = useQuery<InventoryCategory[]>({
    queryKey: ['inventory-categories'],
    queryFn: inventoryCategoryService.getAll,
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  // Fetch items with filters
  const { data: itemsData, isLoading: itemsLoading } = useQuery<InventoryItemList[]>({
    queryKey: ['inventory-items', categoryFilter, showLowStock],
    queryFn: () => inventoryItemService.getAll({
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      low_stock: showLowStock || undefined,
    }),
  })
  const items = Array.isArray(itemsData) ? itemsData : []

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground mt-2">
              Manage your stock and materials
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Categories
            </Button>
            <Button onClick={() => setIsItemModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="h-24 animate-pulse bg-muted" />
            ))}
          </div>
        ) : dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Boxes className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{dashboard.total_items}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{dashboard.total_categories}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard.low_stock_count}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboard.total_stock_value)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowLowStock(!showLowStock)}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Low Stock
            </Button>
          </div>
        </div>

        {/* Items Table */}
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'ALL' || showLowStock
                  ? 'No items match your filters'
                  : 'Add your first inventory item to get started'}
              </p>
              {!searchQuery && categoryFilter === 'ALL' && !showLowStock && (
                <Button onClick={() => setIsItemModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`font-semibold ${item.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {UNIT_LABELS[item.unit]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.is_low_stock ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStockInItemId(item.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Stock In
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        <InventoryItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
        />
        <InventoryCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
        />
        <InventoryItemDetailModal
          itemId={selectedItemId}
          isOpen={!!selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
        <StockInModal
          itemId={stockInItemId}
          isOpen={!!stockInItemId}
          onClose={() => setStockInItemId(null)}
        />
      </div>
    </Layout>
  )
}
