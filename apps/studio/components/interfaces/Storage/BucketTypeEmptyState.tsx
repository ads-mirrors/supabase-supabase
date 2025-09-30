import { Button } from 'ui'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useParams } from 'common'
import { BucketTypeConfig } from './Storage.constants'

interface BucketTypeEmptyStateProps {
  config: BucketTypeConfig
  bucketType: string
}

export const BucketTypeEmptyState = ({ config, bucketType }: BucketTypeEmptyStateProps) => {
  const router = useRouter()
  const { ref } = useParams()

  const handleCreateBucket = () => {
    // Map bucket types to their API values
    const typeMap = {
      media: 'STANDARD',
      analytics: 'ANALYTICS',
      vectors: 'STANDARD', // VECTORS doesn't exist yet, so use STANDARD
    }
    const apiType = typeMap[bucketType as keyof typeof typeMap] || 'STANDARD'
    router.push(`/project/${ref}/storage/buckets/new?type=${apiType}`)
  }

  return (
    // Main content area
    <div className="flex flex-col justify-center h-full w-full bg-muted">
      {/* Centered container with padding */}
      {/* TODO: pt-[8rem] \or similar and include illustration */}
      <div className="max-w-sm mx-auto bg-surface-100 rounded-lg px-8 pt-10 pb-8 flex flex-col gap-6 border">
        {/* Text */}
        <div className="flex flex-col gap-1 text-balance">
          <h3 className="text-foreground text-2xl">{config.displayName}</h3>
          <p className="text-foreground-light text-base">
            {config.description}{' '}
            <Link
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-lighter underline hover:text-foreground transition-colors"
            >
              Learn more
            </Link>{' '}
          </p>
        </div>
        {/* Primary button */}
        <Button
          type="primary"
          size="medium"
          icon={<Plus size={14} />}
          onClick={handleCreateBucket}
          className="w-fit"
        >
          New {config.displayName.toLowerCase()} bucket
        </Button>
      </div>
    </div>
  )
}
