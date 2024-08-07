import { useSelectedProject } from 'hooks/misc/useSelectedProject'
import type { CommandOptions } from 'ui-patterns/CommandMenu'
import { useRegisterCommands } from 'ui-patterns/CommandMenu'

export function useAuthGotoCommands(options?: CommandOptions) {
  const project = useSelectedProject()
  const ref = project?.ref || '_'

  useRegisterCommands(
    'Navigate',
    [
      {
        id: 'nav-auth-users',
        name: 'Users',
        value: 'Auth: Users',
        route: `/project/${ref}/auth/users`,
        defaultHidden: true,
      },
      {
        id: 'nav-auth-policies',
        name: 'Policies',
        value: 'Auth: Policies (RLS)',
        route: `/project/${ref}/auth/policies`,
        defaultHidden: true,
      },
      {
        id: 'nav-auth-providers',
        name: 'Providers',
        value: 'Auth: Providers (Social Login, SSO)',
        route: `/project/${ref}/auth/providers`,
        defaultHidden: true,
      },
      {
        id: 'nav-auth-templates',
        name: 'Email Templates',
        value: 'Auth: Email Templates',
        route: `/project/${ref}/auth/templates`,
        defaultHidden: true,
      },
      {
        id: 'nav-auth-url-configuration',
        name: 'URL Configuration',
        value: 'Auth: URL Configuration (Site URL, Redirect URLs)',
        route: `/project/${ref}/auth/url-configuration`,
        defaultHidden: true,
      },
    ],
    { ...options, deps: [ref] }
  )
}
