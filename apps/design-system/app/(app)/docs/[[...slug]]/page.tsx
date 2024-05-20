import { notFound } from 'next/navigation'
import { allDocs } from 'contentlayer/generated'

import '@/styles/mdx.css'
import '@/styles/code-block-variables.css'
import type { Metadata } from 'next'
import Link from 'next/link'
// import { ChevronRightIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import Balancer from 'react-wrap-balancer'

import { siteConfig } from '@/config/site'
import { getTableOfContents } from '@/lib/toc'
import { absoluteUrl, cn } from '@/lib/utils'
import { Mdx } from '@/components/mdx-components'
import { DocsPager } from '@/components/pager'
import { DashboardTableOfContents } from '@/components/toc'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { Button, ScrollArea, Separator } from 'ui'
import { SourcePanel } from '@/components/source-panel'
// import { badgeVariants } from 'ui/src/components/shadcn/ui/badge'
// import { buttonVariants } from '@ui/components/Button/Button'
// import { ScrollArea } from '@/registry/new-york/ui/scroll-area'

interface DocPageProps {
  params: {
    slug: string[]
  }
}

async function getDocFromParams({ params }: DocPageProps) {
  const slug = params.slug?.join('/') || ''
  const doc = allDocs.find((doc) => doc.slugAsParams === slug)

  if (!doc) {
    return null
  }

  return doc
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const doc = await getDocFromParams({ params })

  if (!doc) {
    return {}
  }

  return {
    title: doc.title,
    description: doc.description,
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: 'article',
      url: absoluteUrl(doc.slug),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: doc.title,
      description: doc.description,
      images: [siteConfig.ogImage],
      creator: '@shadcn',
    },
  }
}

export async function generateStaticParams(): Promise<DocPageProps['params'][]> {
  return allDocs.map((doc) => ({
    slug: doc.slugAsParams.split('/'),
  }))
}

export default async function DocPage({ params }: DocPageProps) {
  const doc = await getDocFromParams({ params })

  if (!doc) {
    notFound()
  }

  const toc = await getTableOfContents(doc.body.raw)

  return (
    <main className="relative lg:gap-10 xl:grid xl:grid-cols-[1fr_200px] pr-6 lg:py-8">
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <div className="mb-4 flex items-center space-x-1 text-sm text-foreground-muted">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">Docs</div>
          <ChevronRight className="h-4 w-4 text-foreground-muted" />
          <div className="text-foreground-lighter">{doc.title}</div>
        </div>
        <div className="space-y-2 mb-5">
          <h1 className={cn('scroll-m-20 text-4xl tracking-tight')}>{doc.title}</h1>
          {doc.description && (
            <p className="text-lg text-foreground-light">
              <Balancer>{doc.description}</Balancer>
            </p>
          )}
        </div>
        <Separator className="mb-6" />
        {/* {doc.links ? (
          <div className="flex items-center space-x-2 pt-4">
            {doc.links?.doc && (
              <Button
                type="default"
                icon={<ExternalLink className="h-3 w-3 text-foreground-muted" strokeWidth={1} />}
              >
                <Link
                  href={doc.links.doc}
                  target="_blank"
                  rel="noreferrer"

                  // className={cn(buttonVariants({ variant: 'default' }), 'gap-1')}
                >
                  Docs
                </Link>
              </Button>
            )}
            {doc.links?.api && (
              <Button
                type="default"
                icon={<ExternalLink className="h-3 w-3 text-foreground-muted" strokeWidth={1} />}
              >
                <Link
                  href={doc.links.api}
                  target="_blank"
                  rel="noreferrer"

                  // className={cn(badgeVariants({ variant: 'default' }), 'gap-1')}
                >
                  API Reference
                </Link>
              </Button>
            )}
          </div>
        ) : null} */}
        <SourcePanel doc={doc} />
        <div className="pb-12">
          <Mdx code={doc.body.code} />
        </div>
        <DocsPager doc={doc} />
      </div>
      {doc.toc && (
        <div className="hidden text-sm xl:block">
          <div className="sticky top-16 -mt-10 pt-4">
            <ScrollArea className="pb-10">
              <div className="sticky top-16 -mt-10 h-[calc(100vh-3.5rem)] py-12">
                <DashboardTableOfContents toc={toc} />
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </main>
  )
}
