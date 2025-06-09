import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { handleError, post } from 'data/fetchers'
import type { ResponseError } from 'types'

export type PendingSubscriptionChangeVariables = {
  payment_intent_id: string
  slug?: string
}

export async function confirmPendingSubscriptionChange({
  payment_intent_id,
  slug,
}: PendingSubscriptionChangeVariables) {
  if (!slug) throw new Error('Organization slug is required')

  const { data, error } = await post(
    '/platform/organizations/{slug}/billing/subscription/confirm-subscription-change',
    {
         params: { path: { slug } },
      body: {
        payment_intent_id,
      },
    }
  )

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
