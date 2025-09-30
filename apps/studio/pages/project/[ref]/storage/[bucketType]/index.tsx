import { useFlag } from 'common'
import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { PageLayout } from 'components/layouts/PageLayout/PageLayout'
import { ScaffoldContainer } from 'components/layouts/Scaffold'
import StorageLayout from 'components/layouts/StorageLayout/StorageLayout'
import { BUCKET_TYPES, DEFAULT_BUCKET_TYPE } from 'components/interfaces/Storage/Storage.constants'
import { MediaBuckets } from 'components/interfaces/Storage/MediaBuckets'
import { AnalyticsBuckets } from 'components/interfaces/Storage/AnalyticsBuckets'
import { VectorsBuckets } from 'components/interfaces/Storage/VectorsBuckets'
import type { NextPageWithLayout } from 'types'
import { DocsButton } from 'components/ui/DocsButton'
import { DOCS_URL } from 'lib/constants'

const renderBucketTypeComponent = (bucketTypeKey: string) => {
  switch (bucketTypeKey) {
    case 'media':
      return MediaBuckets()
    case 'analytics':
      return AnalyticsBuckets()
    case 'vectors':
      return VectorsBuckets()
    default:
      return MediaBuckets()
  }
}

const BucketTypePage: NextPageWithLayout = () => {
  const isStorageV2 = useFlag('storageAnalyticsVector')
  const { bucketType, ref } = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!isStorageV2) {
      router.replace(`/project/${ref}/storage`)
    }
  }, [isStorageV2, ref, router])

  const bucketTypeKey = bucketType || DEFAULT_BUCKET_TYPE
  const config = BUCKET_TYPES[bucketTypeKey as keyof typeof BUCKET_TYPES]

  useEffect(() => {
    if (!config) {
      router.replace(`/project/${ref}/storage`)
    }
  }, [config, ref, router])

  const bucketTypeResult = renderBucketTypeComponent(bucketTypeKey)

  return bucketTypeResult.content
}

BucketTypePage.getLayout = (page) => {
  const BucketTypeLayout = () => {
    const params = useParams()
    const { bucketType, ref } = params
    const bucketTypeKey = bucketType || DEFAULT_BUCKET_TYPE
    const config = BUCKET_TYPES[bucketTypeKey as keyof typeof BUCKET_TYPES]

    // Get the bucket type result to determine if it's empty
    const bucketTypeResult = renderBucketTypeComponent(bucketTypeKey)

    const navigationItems =
      bucketTypeKey === 'media'
        ? [
            {
              label: 'Buckets',
              href: `/project/${ref}/storage/media`,
            },
            {
              label: 'Settings',
              href: `/project/${ref}/storage/settings`,
            },
            {
              label: 'Policies',
              href: `/project/${ref}/storage/policies`,
            },
          ]
        : []

    return (
      <DefaultLayout>
        <StorageLayout title="Storage">
          {bucketTypeResult.isEmpty ? (
            // For empty state, render directly without PageLayout/ScaffoldContainer
            page
          ) : (
            // For normal state, use PageLayout with ScaffoldContainer
            <PageLayout
              title={`${config?.displayName || 'Storage'}`}
              subtitle={config?.description || 'Manage your storage buckets and files.'}
              navigationItems={navigationItems}
              secondaryActions={[<DocsButton href={config.docsUrl} />]}
            >
              <ScaffoldContainer>{page}</ScaffoldContainer>
            </PageLayout>
          )}
        </StorageLayout>
      </DefaultLayout>
    )
  }

  return <BucketTypeLayout />
}

export default BucketTypePage
