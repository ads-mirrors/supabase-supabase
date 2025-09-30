import { useBucketsQuery } from 'data/storage/buckets-query'
import { useParams } from 'common'
import { BucketTypeEmptyState } from './BucketTypeEmptyState'
import { BUCKET_TYPES } from './Storage.constants'
import { DocsButton } from 'components/ui/DocsButton'
import { Button } from 'ui'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/router'
import { FormHeader } from 'components/ui/Forms/FormHeader'
import { ScaffoldSection } from 'components/layouts/Scaffold'

export const MediaBuckets = () => {
  const { ref } = useParams()
  const router = useRouter()
  const config = BUCKET_TYPES.media

  const { data: buckets = [], isLoading } = useBucketsQuery({ projectRef: ref })

  // Filter buckets by type - media buckets are STANDARD type or no type (legacy)
  const mediaBuckets = buckets.filter(
    (bucket) => bucket.type === 'STANDARD' || bucket.type === null || bucket.type === undefined
  )

  const handleCreateBucket = () => {
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

  if (mediaBuckets.length === 0) {
    return {
      isEmpty: true,
      content: <BucketTypeEmptyState config={config} bucketType="media" />,
    }
  }

  return {
    isEmpty: false,
    content: (
      <div className="space-y-12">
        <ScaffoldSection>
          <div className="col-span-12">
            <FormHeader
              title="Buckets"
              actions={
                <Button type="primary" icon={<Plus size={14} />} onClick={handleCreateBucket}>
                  New media bucket
                </Button>
              }
            />
            {/* Buckets list */}
            {/* TODO: extract like in DatabaseTables? */}
            <div className="space-y-3">
              {mediaBuckets.map((bucket) => (
                <div
                  key={bucket.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/project/${ref}/storage/buckets/${bucket.id}`)}
                >
                  <div className="flex flex-col">
                    <div className="font-medium text-foreground">{bucket.name}</div>
                    <div className="text-sm text-foreground-light">
                      {bucket.public ? 'Public' : 'Private'} •{' '}
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
        </ScaffoldSection>
      </div>
    ),
  }
}
