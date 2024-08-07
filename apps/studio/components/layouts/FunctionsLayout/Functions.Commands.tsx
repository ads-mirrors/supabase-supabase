import { COMMAND_MENU_SECTIONS } from 'components/interfaces/App/CommandMenu/CommandMenu.utils'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useFunctionsGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    COMMAND_MENU_SECTIONS.NAVIGATE,
    [
      {
        id: 'nav-functions',
        name: 'Edge Functions',
        route: `/project/${ref}/functions`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
