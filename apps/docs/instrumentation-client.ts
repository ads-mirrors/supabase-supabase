// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { IS_DEV } from './lib/constants'

Sentry.init({
<<<<<<< HEAD
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
||||||| parent of c25c7cb09d (chore(docs): add sentry monitoring)
=======
  dsn: 'https://3c27c63b42048231340b7d640767ad02@o398706.ingest.us.sentry.io/4508132895096832',
>>>>>>> c25c7cb09d (chore(docs): add sentry monitoring)

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  ignoreErrors: [
    // [Charis 2025-05-05]
    // We should fix hydration problems but let's not make this a blocker for
    // now.
    /(?:text content does not match)|hydration|hydrating/i,
    // Error thrown if local infra is not running
    ...(IS_DEV ? ['Failed to fetch (localhost:8000)'] : []),
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
