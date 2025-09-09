import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ComposedChart } from 'components/ui/Charts/ComposedChart'
import type { AnalyticsInterval } from 'data/analytics/constants'
import type { ReportConfig } from 'data/reports/v2/reports.types'
import { useFillTimeseriesSorted } from 'hooks/analytics/useFillTimeseriesSorted'
import { useCurrentOrgPlan } from 'hooks/misc/useCurrentOrgPlan'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { Card, CardContent, cn } from 'ui'
import { ReportChartUpsell } from './ReportChartUpsell'
export interface ReportChartV2Props {
  report: ReportConfig
  projectRef: string
  startDate: string
  endDate: string
  interval: AnalyticsInterval
  updateDateRange: (from: string, to: string) => void
  className?: string
  syncId?: string
  filters?: any
}

export const ReportChartV2 = ({
  report,
  projectRef,
  startDate,
  endDate,
  interval,
  updateDateRange,
  className,
  syncId,
  filters,
}: ReportChartV2Props) => {
  const { data: org } = useSelectedOrganizationQuery()
  const { plan: orgPlan } = useCurrentOrgPlan()
  const orgPlanId = orgPlan?.id

  const isAvailable =
    report.availableIn === undefined || (orgPlanId && report.availableIn.includes(orgPlanId))

  const canFetch = orgPlanId !== undefined && isAvailable

  const {
    data: queryResult,
    isLoading: isLoadingChart,
    error,
    isFetching,
  } = useQuery(
    [
      'projects',
      projectRef,
      'report-v2',
      { reportId: report.id, startDate, endDate, interval, filters },
    ],
    async () => {
      return await report.dataProvider(projectRef, startDate, endDate, interval, filters)
    },
    {
      enabled: Boolean(projectRef && canFetch && isAvailable && !report.hide),
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  )

  const chartData = queryResult?.data || []
  const dynamicAttributes = queryResult?.attributes || []

  /**
   * Checks the attributes received match properties inside the data items
   */
  const attributesMatchDataProperties = dynamicAttributes?.every((attribute) =>
    chartData?.some((item: any) => item[attribute.attribute])
  )

  useEffect(() => {
    if (!attributesMatchDataProperties && chartData.length > 0) {
      console.warn(`[ReportChartV2 ${report.id}]: Chart attributes do not match data provided.`)
    }
  }, [attributesMatchDataProperties, chartData, report.id])

  const { data: filledChartData, isError: isFillError } = useFillTimeseriesSorted(
    chartData,
    'timestamp',
    (dynamicAttributes as any[]).map((attr: any) => attr.attribute),
    0,
    startDate,
    endDate,
    undefined,
    interval
  )

  const finalChartData =
    filledChartData && filledChartData.length > 0 && !isFillError ? filledChartData : chartData

  const [chartStyle, setChartStyle] = useState<string>(report.defaultChartStyle)

  if (!isAvailable) {
    return <ReportChartUpsell report={report} orgSlug={org?.slug ?? ''} />
  }

  const isErrorState = error && !isLoadingChart

  if (report.hide) return null

  return (
    <Card id={report.id} className={cn('relative w-full overflow-hidden scroll-mt-16', className)}>
      <CardContent
        className={cn(
          'flex flex-col gap-4 min-h-[280px] items-center justify-center',
          isFetching && 'opacity-50'
        )}
      >
        {!attributesMatchDataProperties && finalChartData.length > 0 ? (
          <div className="w-full">
            ERROR: The attributes do not match the data
            <div className="w-full flex gap-1">
              <pre className="w-1/2">
                Attributes
                {JSON.stringify(dynamicAttributes, null, 2)}
              </pre>
              <pre className="w-1/2">
                Data
                {JSON.stringify(finalChartData, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
        {isLoadingChart ? (
          <Loader2 className="size-5 animate-spin text-foreground-light" />
        ) : isErrorState ? (
          <p className="text-sm text-foreground-light text-center h-full flex items-center justify-center">
            Error loading chart data
          </p>
        ) : (
          <div className="w-full">
            <ComposedChart
              attributes={dynamicAttributes}
              data={finalChartData}
              format={report.format ?? undefined}
              xAxisKey={report.xAxisKey ?? 'timestamp'}
              yAxisKey={report.yAxisKey ?? dynamicAttributes[0]?.attribute}
              highlightedValue={0}
              title={report.label}
              customDateFormat={undefined}
              chartHighlight={undefined}
              chartStyle={chartStyle}
              showTooltip={report.showTooltip}
              showLegend={report.showLegend}
              showTotal={false}
              showMaxValue={report.showMaxValue}
              onChartStyleChange={setChartStyle}
              updateDateRange={updateDateRange}
              valuePrecision={report.valuePrecision}
              hideChartType={report.hideChartType}
              titleTooltip={report.titleTooltip}
              syncId={syncId}
              sql={queryResult?.query}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
