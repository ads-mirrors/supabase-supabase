/**
 * Lightweight SQL parser for telemetry event detection.
 *
 * [Sean] We should replace this with a SQL parser like `@supabase/pg-parser` once a
 * browser-compatible version is available.
 */
import { TABLE_EVENT_ACTIONS, type TableEventAction } from 'common/telemetry-constants'

export interface TableEventDetails {
  type: 'table_created' | 'table_data_inserted' | 'table_rls_enabled'
  schema?: string
  tableName?: string
}

export interface NonTableEventDetails {
  type: 'function_created' | 'trigger_created' | 'view_created'
  schema?: string
  objectName?: string // Name of the database object (function/view/trigger)
}

export type SQLEventDetails = TableEventDetails | NonTableEventDetails

/**
 * SQL Event Parser class for detecting and parsing SQL operations
 */
export class SQLEventParser {
  /**
   * Extracts and cleans schema and name from regex match groups
   */
  private extractIdentifiers(groups: { schema?: string; table?: string; object?: string }) {
    const cleanIdentifier = (identifier?: string) => {
      if (!identifier) return undefined
      // Remove quotes (including backticks) and trailing dots from SQL identifiers
      return identifier.replace(/["`'`]/g, '').replace(/\.$/, '')
    }

    const name = groups.table || groups.object

    return {
      schema: cleanIdentifier(groups.schema),
      name: cleanIdentifier(name),
    }
  }

  /**
   * Detects CREATE TABLE statements in SQL
   * @param sql - The SQL string to parse
   * @returns Table event details if a CREATE TABLE statement is found, null otherwise
   * @example
   * detectCreateTable("CREATE TABLE users (id INT)")
   * // Returns: { type: 'table_created', schema: undefined, tableName: 'users' }
   */
  detectCreateTable(sql: string): TableEventDetails | null {
    const standardCreateTable = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i
    const temporaryTable = /CREATE\s+TEMP(?:ORARY)?\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i
    const unloggedTable = /CREATE\s+UNLOGGED\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i

    const patterns = [standardCreateTable, temporaryTable, unloggedTable]

    for (const pattern of patterns) {
      const match = sql.match(pattern)
      if (match?.groups) {
        const { schema, name } = this.extractIdentifiers(match.groups)
        return { type: TABLE_EVENT_ACTIONS.TABLE_CREATED, schema, tableName: name }
      }
    }

    return null
  }

  /**
   * Detects INSERT INTO statements in SQL
   * @param sql - The SQL string to parse
   * @returns Table event details if an INSERT statement is found, null otherwise
   * @example
   * detectInsert("INSERT INTO users (name) VALUES ('John')")
   * // Returns: { type: 'table_data_inserted', schema: undefined, tableName: 'users' }
   */
  detectInsert(sql: string): TableEventDetails | null {
    const insertIntoPattern = /INSERT\s+INTO\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i
    const match = sql.match(insertIntoPattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, schema, tableName: name }
    }

    return null
  }

  /**
   * Detects COPY statements (bulk data import) in SQL
   * @param sql - The SQL string to parse
   * @returns Table event details if a COPY statement is found, null otherwise
   * @example
   * detectCopy("COPY users FROM '/tmp/users.csv'")
   * // Returns: { type: 'table_data_inserted', schema: undefined, tableName: 'users' }
   */
  detectCopy(sql: string): TableEventDetails | null {
    const copyFromPattern = /COPY\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)\s+FROM/i
    const match = sql.match(copyFromPattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, schema, tableName: name }
    }

    return null
  }

  /**
   * Detects SELECT INTO and CREATE TABLE AS SELECT statements
   * @param sql - The SQL string to parse
   * @returns Table event details if found, null otherwise
   * @example
   * detectSelectInto("SELECT * INTO new_users FROM users")
   * // Returns: { type: 'table_created', schema: undefined, tableName: 'new_users' }
   */
  detectSelectInto(sql: string): TableEventDetails | null {
    const selectIntoPattern = /SELECT\s+.*?\s+INTO\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/is
    const createTableAsSelectPattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)\s+AS\s+SELECT/i

    const patterns = [selectIntoPattern, createTableAsSelectPattern]

    for (const pattern of patterns) {
      const match = sql.match(pattern)
      if (match?.groups) {
        const { schema, name } = this.extractIdentifiers(match.groups)
        return { type: TABLE_EVENT_ACTIONS.TABLE_CREATED, schema, tableName: name }
      }
    }

    return null
  }

  /**
   * Detects ALTER TABLE ... ENABLE ROW LEVEL SECURITY statements
   * @param sql - The SQL string to parse
   * @returns Table event details if RLS enablement is found, null otherwise
   * @example
   * detectEnableRLS("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
   * // Returns: { type: 'table_rls_enabled', schema: undefined, tableName: 'users' }
   */
  detectEnableRLS(sql: string): TableEventDetails | null {
    const enableRLSLongPattern = /ALTER\s+TABLE\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+).*?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    const enableRLSShortPattern = /ALTER\s+TABLE\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+).*?ENABLE\s+RLS/i

    const patterns = [enableRLSLongPattern, enableRLSShortPattern]

    for (const pattern of patterns) {
      const match = sql.match(pattern)
      if (match?.groups) {
        const { schema, name } = this.extractIdentifiers(match.groups)
        return { type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED, schema, tableName: name }
      }
    }

    return null
  }

  /**
   * Detects CREATE FUNCTION statements
   */
  detectCreateFunction(sql: string): NonTableEventDetails | null {
    const createFunctionPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?<schema>(?:[\w"`]+)\.)?(?<object>[\w"`]+)/i
    const match = sql.match(createFunctionPattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.FUNCTION_CREATED, schema, objectName: name }
    }

    return null
  }

  /**
   * Detects CREATE TRIGGER statements
   */
  detectCreateTrigger(sql: string): NonTableEventDetails | null {
    const createTriggerPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(?<object>[\w"`]+)/i
    const match = sql.match(createTriggerPattern)

    if (match?.groups) {
      const { name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.TRIGGER_CREATED, objectName: name }
    }

    return null
  }

  /**
   * Detects CREATE VIEW statements
   */
  detectCreateView(sql: string): NonTableEventDetails | null {
    const createViewPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?<schema>(?:[\w"`]+)\.)?(?<object>[\w"`]+)/i
    const match = sql.match(createViewPattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.VIEW_CREATED, schema, objectName: name }
    }

    return null
  }

  /**
   * Type guard to check if an event is a table event
   * @param event - SQL event to check
   * @returns True if the event is a table-related event (has tableName instead of objectName)
   */
  private isTableEvent(event: SQLEventDetails): event is TableEventDetails {
    const tableEvents = [
      TABLE_EVENT_ACTIONS.TABLE_CREATED,
      TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
      TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED
    ] as const
    return (tableEvents as readonly string[]).includes(event.type)
  }

  /**
   * Deduplicates SQL events by type, schema, and object/table name
   * @param events - Array of SQL events to deduplicate
   * @returns Deduplicated array of SQL events
   */
  private deduplicateEvents(events: SQLEventDetails[]): SQLEventDetails[] {
    const seen = new Set<string>()
    const deduplicated: SQLEventDetails[] = []

    for (const event of events) {
      // For table events, use tableName; for others use objectName
      let name: string | undefined
      if (this.isTableEvent(event)) {
        name = event.tableName
      } else {
        name = event.objectName
      }
      const key = `${event.type}:${event.schema || ''}:${name || ''}`
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(event)
      }
    }

    return deduplicated
  }

  /**
   * Splits SQL into statements, attempting to handle semicolons in strings
   * Note: This is a simplified approach that may not handle all edge cases
   * @param sql - The SQL to split
   * @returns Array of SQL statements
   */
  private splitStatements(sql: string): string[] {
    // For now, use a simple approach that handles basic quoted strings
    // A full parser would be needed for complete accuracy
    const statements: string[] = []
    let currentStatement = ''
    let inString = false
    let stringDelimiter = ''

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]

      // Check for string delimiters
      if ((char === "'" || char === '"')) {
        if (!inString) {
          inString = true
          stringDelimiter = char
          currentStatement += char
        } else if (char === stringDelimiter) {
          // Check if it's an escaped quote (doubled)
          if (sql[i + 1] === char) {
            currentStatement += char + char
            i++ // Skip the next quote
            continue
          }
          inString = false
          stringDelimiter = ''
          currentStatement += char
        } else {
          currentStatement += char
        }
      } else if (char === ';' && !inString) {
        // Handle semicolon outside of strings
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim())
        }
        currentStatement = ''
      } else {
        currentStatement += char
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim())
    }

    return statements
  }

  /**
   * Parses SQL statements for telemetry-relevant operations
   * @param sql - The SQL string to parse (can contain multiple statements)
   * @returns Array of deduplicated SQL events
   * @example
   * parseSQLEvents("CREATE TABLE users; INSERT INTO users VALUES (1);")
   * // Returns: [{ type: 'table_created', ... }, { type: 'table_data_inserted', ... }]
   */
  parseSQLEvents(sql: string): SQLEventDetails[] {
    const results: SQLEventDetails[] = []

    // Split statements more intelligently
    const statements = this.splitStatements(sql)

    for (const statement of statements) {
      // Check for table operations first
      const tableResult =
        this.detectCreateTable(statement) ||
        this.detectSelectInto(statement) ||
        this.detectInsert(statement) ||
        this.detectCopy(statement) ||
        this.detectEnableRLS(statement)

      if (tableResult) {
        results.push(tableResult)
        continue
      }

      // Check for other SQL operations
      const otherResult =
        this.detectCreateFunction(statement) ||
        this.detectCreateTrigger(statement) ||
        this.detectCreateView(statement)

      if (otherResult) {
        results.push(otherResult)
      }
    }

    return this.deduplicateEvents(results)
  }

  /**
   * Checks if SQL contains specific event types
   * @param sql - The SQL string to check
   * @param types - Array of event types to look for
   * @returns True if any of the specified event types are found
   * @example
   * containsSQLEventType("CREATE TABLE users", ['table_created'])
   * // Returns: true
   */
  containsSQLEventType(sql: string, types: SQLEventDetails['type'][]): boolean {
    const events = this.parseSQLEvents(sql)
    return events.some(event => types.includes(event.type))
  }

  /**
   * Extracts only table-related events from SQL
   * @param sql - The SQL string to parse
   * @returns Array of table events only (CREATE TABLE, INSERT, ENABLE RLS)
   * @example
   * getTableEvents("CREATE TABLE users; CREATE FUNCTION test();")
   * // Returns: [{ type: 'table_created', tableName: 'users', ... }]
   */
  getTableEvents(sql: string): TableEventDetails[] {
    const events = this.parseSQLEvents(sql)
    const tableEvents: TableEventDetails[] = []

    for (const event of events) {
      if (this.isTableEvent(event)) {
        tableEvents.push(event)
      }
    }

    return tableEvents
  }
}

// Export singleton instance
export const sqlEventParser = new SQLEventParser()
