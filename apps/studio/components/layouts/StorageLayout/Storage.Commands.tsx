import { COMMAND_MENU_SECTIONS } from 'components/interfaces/App/CommandMenu/CommandMenu.utils'
import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useStorageGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    COMMAND_MENU_SECTIONS.NAVIGATE,
    [
      {
        id: 'nav-storage',
        name: 'Storage',
        route: `/project/${ref}/storage`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
