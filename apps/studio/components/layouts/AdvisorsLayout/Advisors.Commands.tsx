import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useAdvisorsGoToCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    'Navigate',
    [
      {
        id: 'nav-advisors-security',
        name: 'Security Advisor',
        route: `/project/${ref}/advisors/security`,
        defaultHidden: true,
      },
      {
        id: 'nav-advisors-performance',
        name: 'Performance Advisor',
        route: `/project/${ref}/advisors/performance`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
