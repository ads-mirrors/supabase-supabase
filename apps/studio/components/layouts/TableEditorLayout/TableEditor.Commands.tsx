import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useTableEditorGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

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
