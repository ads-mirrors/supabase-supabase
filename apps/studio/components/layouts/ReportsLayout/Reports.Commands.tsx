import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useReportsGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    'Navigate',
    [
      {
        id: 'nav-reports',
        name: 'Reports',
        route: `/project/${ref}/reports`,
        defaultHidden: true,
      },
      {
        id: 'nav-reports-api',
        name: 'API Reports',
        route: `/project/${ref}/reports/api-overview`,
        defaultHidden: true,
      },
      {
        id: 'nav-reports-storage',
        name: 'Storage Reports',
        route: `/project/${ref}/reports/storage`,
        defaultHidden: true,
      },
      {
        id: 'nav-reports-database',
        name: 'Database Reports',
        route: `/project/${ref}/reports/database`,
        defaultHidden: true,
      },
      {
        id: 'nav-reports-query-performance',
        name: 'Query Performance Reports',
        route: `/project/${ref}/reports/query-performance`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
