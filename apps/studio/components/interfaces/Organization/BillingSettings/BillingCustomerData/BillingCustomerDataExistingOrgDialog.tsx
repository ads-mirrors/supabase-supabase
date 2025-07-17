import { PermissionAction } from '@supabase/shared-types/out/constants'

import AlertError from 'components/ui/AlertError'
import NoPermission from 'components/ui/NoPermission'
import ShimmeringLoader from 'components/ui/ShimmeringLoader'
import { useOrganizationCustomerProfileQuery } from 'data/organizations/organization-customer-profile-query'
import { useOrganizationTaxIdQuery } from 'data/organizations/organization-tax-id-query'
import { useCheckPermissions } from 'hooks/misc/useCheckPermissions'
import { useSelectedOrganization } from 'hooks/misc/useSelectedOrganization'
import { Label_Shadcn_ as Label } from 'ui'

export const BillingCustomerDataExistingOrgDialog = () => {
  const { slug } = useSelectedOrganization() ?? {}

  const canReadBillingCustomerData = useCheckPermissions(
    PermissionAction.BILLING_READ,
    'stripe.customer'
  )

  const {
    data: customerProfile,
    error,
    isLoading,
    isSuccess,
  } = useOrganizationCustomerProfileQuery({ slug }, { enabled: canReadBillingCustomerData })

  const {
    data: taxId,
    error: errorTaxId,
    isLoading: isLoadingTaxId,
    isSuccess: isSuccessTaxId,
  } = useOrganizationTaxIdQuery({ slug })

  const getAddressSummary = () => {
    if (!customerProfile?.address?.line1) return 'Optionally add a billing address'

    const parts = [
      customerProfile?.billing_name,
      customerProfile?.address?.line1,
      customerProfile?.address?.city,
      customerProfile?.address?.state,
      customerProfile?.address?.country,
    ].filter(Boolean)

    return parts.join(', ')
  }

  return (
    <>
      <div>
        <Label htmlFor="billing-address-btn" className="text-foreground-light block mb-1">
          Billing Address / Tax Id
        </Label>
        {!canReadBillingCustomerData ? (
          <NoPermission resourceText="view this organization's billing address" />
        ) : (
          <>
            {(isLoading || isLoadingTaxId) && (
              <div className="space-y-2">
                <ShimmeringLoader />
              </div>
            )}
            {(error || errorTaxId) && (
              <AlertError
                subject="Failed to retrieve organization customer profile"
                error={(error || errorTaxId) as any}
              />
            )}
            {isSuccess && isSuccessTaxId && (
              <p className="text-sm text-foreground">{getAddressSummary()}</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
