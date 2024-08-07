import { useIsLoggedIn } from 'common'
import { useAppStateSnapshot } from 'state/app-state'
import { AiIconAnimation } from 'ui'
import { BadgeExperimental, useRegisterCommands, useSetQuery } from 'ui-patterns/CommandMenu'
import { orderCommandSectionsByPriority } from '../App/CommandMenu/ordering'

export function useGenerateSqlCommand() {
  const isLoggedIn = useIsLoggedIn()

  const { setShowGenerateSqlModal } = useAppStateSnapshot()
  const setQuery = useSetQuery()

  useRegisterCommands(
    'Query',
    [
      {
        id: 'generate-sql',
        name: 'Run SQL with Supabase AI',
        action: () => {
          setShowGenerateSqlModal(true)
          setQuery('')
        },
        icon: () => <AiIconAnimation allowHoverEffect />,
        badge: () => <BadgeExperimental />,
      },
    ],
    {
      enabled: isLoggedIn,
      deps: [setShowGenerateSqlModal, setQuery],
      orderSection: orderCommandSectionsByPriority,
      sectionMeta: { priority: 2 },
    }
  )
}
