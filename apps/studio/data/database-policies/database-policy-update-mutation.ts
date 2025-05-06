import pgMeta from '@supabase/pg-meta'
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { executeSql } from 'data/sql/execute-sql-query'
import type { ResponseError } from 'types'
import { databasePoliciesKeys } from './keys'

export type DatabasePolicyUpdateVariables = {
  projectRef: string
  connectionString?: string
  id: number
  payload: {
    name?: string
    definition?: string
    check?: string
    roles?: string[]
  }
}

export async function updateDatabasePolicy({
  projectRef,
  connectionString,
  id,
  payload,
}: DatabasePolicyUpdateVariables) {
  let headers = new Headers()
  if (connectionString) headers.set('x-connection-encrypted', connectionString)

  const { sql } = pgMeta.policies.update({ id }, payload)
  const { result } = await executeSql({
    projectRef,
    connectionString,
    sql,
    queryKey: ['policy', 'update', id],
  })

  return result
}

type DatabasePolicyUpdateData = Awaited<ReturnType<typeof updateDatabasePolicy>>

export const useDatabasePolicyUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<DatabasePolicyUpdateData, ResponseError, DatabasePolicyUpdateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<DatabasePolicyUpdateData, ResponseError, DatabasePolicyUpdateVariables>(
    (vars) => updateDatabasePolicy(vars),
    {
      async onSuccess(data, variables, context) {
        const { projectRef } = variables
        await queryClient.invalidateQueries(databasePoliciesKeys.list(projectRef))
        await onSuccess?.(data, variables, context)
      },
      async onError(data, variables, context) {
        if (onError === undefined) {
          toast.error(`Failed to update database policy: ${data.message}`)
        } else {
          onError(data, variables, context)
        }
      },
      ...options,
    }
  )
}
