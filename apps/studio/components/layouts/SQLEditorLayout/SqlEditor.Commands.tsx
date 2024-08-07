import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

const useSqlEditorGotoCommands = (options?: CommandOptions) => {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    'Navigate',
    [
      {
        id: 'nav-sql-editor',
        name: 'SQL Editor',
        route: `/project/${ref}/sql`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}

export { useSqlEditorGotoCommands }
