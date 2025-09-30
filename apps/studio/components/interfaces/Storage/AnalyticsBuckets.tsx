import { useBucketsQuery } from 'data/storage/buckets-query'
import { useParams } from 'common'
import { BucketTypeEmptyState } from './BucketTypeEmptyState'
import { BUCKET_TYPES } from './Storage.constants'
import { DocsButton } from 'components/ui/DocsButton'
import { Button } from 'ui'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/router'

export const AnalyticsBuckets = () => {
  const { ref } = useParams()
  const router = useRouter()
  const config = BUCKET_TYPES.analytics

  const { data: buckets = [], isLoading } = useBucketsQuery({ projectRef: ref })

  // Filter buckets by analytics type
  const analyticsBuckets = buckets.filter((bucket) => bucket.type === 'ANALYTICS')

  const handleCreateBucket = () => {
    router.push(`/project/${ref}/storage/buckets/new?type=ANALYTICS`)
  }

  if (isLoading) {
    return {
      isEmpty: false,
      content: (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-foreground-light">Loading buckets...</div>
        </div>
      ),
    }
  }

  if (analyticsBuckets.length === 0) {
    return {
      isEmpty: true,
      content: <BucketTypeEmptyState config={config} bucketType="analytics" />,
    }
  }

  return {
    isEmpty: false,
    content: (
      <div className="space-y-6">
        {/* Header with description and docs */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-foreground-light">{config.description}</p>
            <DocsButton href={config.docsUrl} />
          </div>
          <Button type="primary" icon={<Plus size={14} />} onClick={handleCreateBucket}>
            Create bucket
          </Button>
        </div>

        {/* Analytics-specific features info */}
        <div className="p-4 border rounded-lg bg-surface-100">
          <h4 className="font-medium text-foreground mb-2">Analytics Features</h4>
          <ul className="text-sm text-foreground-light space-y-1">
            <li>• Optimized for analytical workloads and large datasets</li>
            <li>• Built-in Iceberg catalog support for data lake functionality</li>
            <li>• Enhanced performance for analytical queries</li>
          </ul>
        </div>

        {/* Buckets list */}
        <div className="space-y-3">
          {analyticsBuckets.map((bucket) => (
            <div
              key={bucket.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/project/${ref}/storage/buckets/${bucket.id}`)}
            >
              <div className="flex flex-col">
                <div className="font-medium text-foreground">{bucket.name}</div>
                <div className="text-sm text-foreground-light">
                  Analytics •{' '}
                  {bucket.file_size_limit
                    ? `${Math.round(bucket.file_size_limit / 1024 / 1024)}MB limit`
                    : 'No size limit'}
                </div>
              </div>
              <div className="text-sm text-foreground-light">
                Created {new Date(bucket.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
}
