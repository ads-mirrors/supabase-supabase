import { useBucketsQuery } from 'data/storage/buckets-query'
import { useParams } from 'common'
import { BucketTypeEmptyState } from './BucketTypeEmptyState'
import { BUCKET_TYPES } from './Storage.constants'
import { DocsButton } from 'components/ui/DocsButton'
import { Button } from 'ui'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/router'

export const VectorsBuckets = () => {
  const { ref } = useParams()
  const router = useRouter()
  const config = BUCKET_TYPES.vectors

  const { data: buckets = [], isLoading } = useBucketsQuery({ projectRef: ref })

  // Filter buckets by vectors type (currently no VECTORS type exists in API)
  const vectorsBuckets = buckets.filter((bucket) => bucket.type === 'VECTORS')

  const handleCreateBucket = () => {
    // For now, redirect to create a STANDARD bucket since VECTORS type doesn't exist yet
    router.push(`/project/${ref}/storage/buckets/new?type=STANDARD`)
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

  // Always show empty state since VECTORS type doesn't exist in API yet
  return {
    isEmpty: true,
    content: <BucketTypeEmptyState config={config} bucketType="vectors" />,
  }
}
