import { Layout } from '@/components/layout/Layout'
import { CategoryForm, GalleryItemGrid } from '@/components/gallery'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { galleryCategoryService, galleryAnalyticsService } from '@/services/gallery'
import type { GalleryCategory, GalleryAnalyticsSummary } from '@/types/gallery'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/common/Button'
import { FolderOpen, ArrowLeft, Plus, Image as ImageIcon, BarChart3, Users, TrendingUp } from 'lucide-react'

export const Gallery = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category')

  const { data: categories = [], isLoading } = useQuery<GalleryCategory[]>({
    queryKey: ['gallery-categories'],
    queryFn: galleryCategoryService.getAll,
  })

  const { data: analytics } = useQuery<GalleryAnalyticsSummary>({
    queryKey: ['gallery-analytics-summary'],
    queryFn: galleryAnalyticsService.getSummary,
  })

  const selectedCategory = categories.find(c => c.id === categoryId)

  const handleCategoryClick = (id: string) => {
    setSearchParams({ category: id })
  }

  const handleBackToCategories = () => {
    setSearchParams({})
  }

  // Show items view if category is selected
  if (categoryId) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <button
                onClick={handleBackToCategories}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Gallery
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{selectedCategory?.name || 'Items'}</span>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold">{selectedCategory?.name || 'Gallery Items'}</h1>
              <p className="text-muted-foreground mt-2">
                {selectedCategory?.description || 'View and manage items in this category'}
              </p>
            </div>
          </div>

          <GalleryItemGrid categoryId={categoryId} />
        </div>
      </Layout>
    )
  }

  // Show categories view
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gallery Categories</h1>
            <p className="text-muted-foreground mt-2">
              Select a category to view items or manage categories
            </p>
          </div>
          <CategoryForm onSuccess={() => {}} />
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views (30 days)</p>
                <p className="text-2xl font-bold">{analytics?.total_views || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
                <p className="text-2xl font-bold">{analytics?.total_unique_visitors || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Daily Views</p>
                <p className="text-2xl font-bold">
                  {analytics?.daily_breakdown?.length
                    ? Math.round(
                        analytics.total_views / analytics.daily_breakdown.length
                      )
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-96 animate-pulse bg-muted" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first category to start organizing your gallery items
              </p>
              <CategoryForm onSuccess={() => {}} />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="relative h-80 bg-gradient-to-br from-primary/10 to-primary/5">
                  {category.cover_image_url ? (
                    <img
                      src={category.cover_image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white mb-1">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-white/80 line-clamp-2">{category.description}</p>
                    )}
                  </div>
                  {!category.is_active && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {category.items_count || 0} items
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Items →
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
