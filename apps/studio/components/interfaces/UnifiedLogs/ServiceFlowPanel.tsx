import { useState } from 'react'

import { Table } from '@tanstack/react-table'
import { useParams } from 'common'
import { DataTableSheetDetails } from 'components/ui/DataTable/DataTableSheetDetails'
import { useDataTable } from 'components/ui/DataTable/providers/DataTableProvider'
import { useUnifiedLogInspectionQuery } from 'data/logs'
import {
  ResizableHandle,
  ResizablePanel,
  Tabs_Shadcn_ as Tabs,
  TabsContent_Shadcn_ as TabsContent,
  TabsList_Shadcn_ as TabsList,
  TabsTrigger_Shadcn_ as TabsTrigger,
} from 'ui'
import { MemoizedDataTableSheetContent } from './components/DataTableSheetContent'
import { sheetFields } from './UnifiedLogs.fields'
import { ColumnSchema } from './UnifiedLogs.schema'
import { LogsMeta } from './UnifiedLogs.types'
import {
  MemoizedRequestStartedBlock,
  MemoizedNetworkBlock,
  MemoizedPostgRESTBlock,
  MemoizedPostgresBlock,
  MemoizedResponseCompletedBlock,
} from './ServiceFlow/ServiceFlowBlocks'

interface ServiceFlowPanelProps {
  selectedRow: any
  selectedRowKey: string
  totalDBRowCount: number | undefined
  filterDBRowCount: number | undefined
  totalFetched: number | undefined
  metadata: any
  searchParameters: any
  search: any // Raw search object to get logId
}

export function ServiceFlowPanel({
  selectedRow,
  selectedRowKey,
  totalDBRowCount,
  filterDBRowCount,
  totalFetched,
  metadata,
  searchParameters,
  search,
}: ServiceFlowPanelProps) {
  const { table, filterFields } = useDataTable()
  const { ref: projectRef } = useParams()
  const [activeTab, setActiveTab] = useState('details')

  // WORKAROUND: Use the real database logId from search params instead of fabricated selectedRow.id
  // This is needed because we create fake UUIDs to handle repeated logs issue
  // TODO: Remove once repeated logs issue is fixed - should use selectedRow.id directly
  const realLogId = search?.logId || selectedRow?.id

  // Query the logs API directly
  const {
    data: serviceFlowData,
    isLoading,
    error,
  } = useUnifiedLogInspectionQuery({
    projectRef: projectRef,
    logId: realLogId,
    type: 'postgrest',
    search: searchParameters,
  })

  const shouldShowServiceFlow = selectedRow?.pathname?.includes('/rest/')

  console.log('🔍 Service Flow Panel:', {
    selectedRow,
    selectedRowKey,
    selectedRowId: selectedRow?.id,
    logId: searchParameters?.logId,
    originalLogId: selectedRow?.original_log_id,
    selectedRowPathname: selectedRow?.pathname,
    selectedRowFullObject: selectedRow,
    shouldShowServiceFlow,
    serviceFlowData,
    isLoading,
    error,
  })

  console.log('🔍 Raw selectedRow fields:', Object.keys(selectedRow || {}))
  console.log('🔍 selectedRow.id value:', selectedRow?.id, 'type:', typeof selectedRow?.id)
  console.log('🔍 realLogId value:', selectedRow?.log_id, 'type:', typeof selectedRow?.log_id)

  // Log the enriched service flow data
  if (serviceFlowData?.result?.[0]) {
    console.log('📋 Service Flow Enriched Data:', serviceFlowData.result[0])
  }

  // Log the raw log data if available
  if (serviceFlowData?.result?.[0]?.raw_log_data) {
    console.log('🗂️ Complete Raw Log Data:', serviceFlowData.result[0].raw_log_data)
  }

  if (selectedRowKey) {
    return (
      <>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={45}>
          <div className="h-full overflow-auto">
            <DataTableSheetDetails
              title={selectedRow?.original?.pathname}
              titleClassName="font-mono text-sm"
            >
              <Tabs
                defaultValue="details"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full h-full flex flex-col pt-2"
              >
                <TabsList className="flex gap-3 px-5">
                  <TabsTrigger value="details">Log Details</TabsTrigger>
                  {shouldShowServiceFlow && (
                    <TabsTrigger value="service-flow">Service Flow</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent
                  value="details"
                  className="flex-grow overflow-auto data-[state=active]:flex-grow px-5"
                >
                  <MemoizedDataTableSheetContent<ColumnSchema, LogsMeta>
                    table={table as Table<ColumnSchema>}
                    data={selectedRow}
                    filterFields={filterFields}
                    fields={sheetFields}
                    metadata={{
                      totalRows: totalDBRowCount ?? 0,
                      filterRows: filterDBRowCount ?? 0,
                      totalRowsFetched: totalFetched ?? 0,
                      currentPercentiles: metadata?.currentPercentiles ?? ({} as any),
                      ...metadata,
                    }}
                  />
                </TabsContent>

                {shouldShowServiceFlow && (
                  <TabsContent value="service-flow">
                    <div className="p-4">
                      {error ? (
                        <div className="text-center py-8 text-destructive">
                          Error: {error.toString()}
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-foreground-light mb-4">
                            PostgREST Service Flow
                            {serviceFlowData?.result &&
                              ` (${serviceFlowData.result.length} enriched)`}
                          </div>

                          <MemoizedRequestStartedBlock data={selectedRow} />

                          <MemoizedNetworkBlock
                            data={selectedRow}
                            enrichedData={serviceFlowData?.result?.[0]}
                            isLoading={isLoading}
                            filterFields={filterFields}
                            table={table}
                          />

                          <MemoizedPostgRESTBlock
                            data={selectedRow}
                            enrichedData={serviceFlowData?.result?.[0]}
                            isLoading={isLoading}
                            filterFields={filterFields}
                            table={table}
                          />

                          <MemoizedPostgresBlock
                            data={selectedRow}
                            enrichedData={serviceFlowData?.result?.[0]}
                            isLoading={isLoading}
                            isLast={false}
                            filterFields={filterFields}
                            table={table}
                          />

                          <MemoizedResponseCompletedBlock data={selectedRow} />
                        </>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </DataTableSheetDetails>
          </div>
        </ResizablePanel>
      </>
    )
  }
}
