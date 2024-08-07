import { LifeBuoy } from 'lucide-react'
import { useMemo } from 'react'

import { IS_PLATFORM } from 'common'
import type { ICommand } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

const useSupportCommands = () => {
  const commands = useMemo(
    () =>
      [
        {
          id: 'support',
          name: 'Support',
          route: '/support',
          icon: () => <LifeBuoy />,
        },
        {
          id: 'system-status',
          name: 'System Status',
          route: 'https://status.supabase.com',
          icon: () => <LifeBuoy />,
        },
        {
          id: 'github-discussions',
          name: 'GitHub Discussions',
          value: 'Support: GitHub Discussions',
          route: 'https://github.com/orgs/supabase/discussions',
          icon: () => <LifeBuoy />,
          defaultHidden: true,
        },
      ] as Array<ICommand>,
    []
  )

  useRegisterCommands('Support', commands, { enabled: IS_PLATFORM })
}

export { useSupportCommands }
