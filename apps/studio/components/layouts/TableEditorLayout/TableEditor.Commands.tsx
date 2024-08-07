import { Table } from 'lucide-react'

import { orderCommandSectionsByPriority } from 'components/interfaces/App/CommandMenu/ordering'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useTableEditorGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    'Actions',
    [
      {
        id: 'view-data',
        name: 'View your data',
        route: `/project/${ref}/editor`,
        icon: () => <Table />,
      },
    ],
    {
      ...options,
      deps: [ref],
      orderSection: orderCommandSectionsByPriority,
      sectionMeta: { priority: 3 },
    }
  )

  useRegisterCommands(
    'Navigate',
    [
      {
        id: 'nav-table-editor',
        name: 'Table Editor',
        route: `/project/${ref}/editor`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
