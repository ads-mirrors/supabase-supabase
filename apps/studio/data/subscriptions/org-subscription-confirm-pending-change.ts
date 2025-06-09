import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { handleError, post } from 'data/fetchers'
import type { ResponseError } from 'types'

export type PendingSubscriptionChangeVariables = {
  payment_intent_id: string
  name: string
  kind?: string
  size?: string
}

export async function confirmPendingSubscriptionChange({
  payment_intent_id,
  name,
  kind,
  size,
}: PendingSubscriptionChangeVariables) {
  const { data, error } = await post('/platform/organizations/confirm-subscription-creation', {
    body: {
      payment_intent_id,
      name,
      kind,
      size,
    },
  })

  if (error) handleError(error)
  return data
}

type PendingSubscriptionChangeData = Awaited<ReturnType<typeof confirmPendingSubscriptionChange>>

export const useConfirmPendingSubscriptionChangeMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<
    PendingSubscriptionChangeData,
    ResponseError,
    PendingSubscriptionChangeVariables
  >,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<
    PendingSubscriptionChangeData,
    ResponseError,
    PendingSubscriptionChangeVariables
  >((vars) => confirmPendingSubscriptionChange(vars), {
    async onSuccess(data, variables, context) {
      // todo replace plan in org
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to confirm payment: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
