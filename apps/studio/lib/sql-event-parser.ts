/**
 * Lightweight SQL parser for telemetry event detection.
 *
 * [Sean] We should replace this with a SQL parser like `@supabase/pg-parser` once a
 * browser-compatible version is available.
 */
import { TABLE_EVENT_ACTIONS, type TableEventAction } from 'common/telemetry-constants'

export type OtherEventType = 'create_function' | 'create_trigger' | 'create_view'

export interface SQLEventDetails {
  type: TableEventAction | OtherEventType
  schema?: string
  objectName?: string // Name of the database object (table/function/view/etc)
}

export interface TableEventDetails {
  type: TableEventAction
  schema?: string
  tableName?: string
}

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
    const pattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i
    const match = sql.match(pattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: TABLE_EVENT_ACTIONS.TABLE_CREATED, schema, tableName: name }
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
    const pattern = /INSERT\s+INTO\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/i
    const match = sql.match(pattern)

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
    const pattern = /COPY\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)\s+FROM/i
    const match = sql.match(pattern)

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
    const patterns = [
      // SELECT ... INTO new_table
      /SELECT\s+.*?\s+INTO\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)/is,
      // CREATE TABLE ... AS SELECT
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+)\s+AS\s+SELECT/i
    ]

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
    // Match various RLS enable patterns
    const patterns = [
      // ALTER TABLE ... ENABLE ROW LEVEL SECURITY
      /ALTER\s+TABLE\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+).*?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
      // ALTER TABLE ... ENABLE RLS (shorter form)
      /ALTER\s+TABLE\s+(?<schema>(?:[\w"`]+)\.)?(?<table>[\w"`]+).*?ENABLE\s+RLS/i,
    ]

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
  detectCreateFunction(sql: string): SQLEventDetails | null {
    const pattern = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?<schema>(?:[\w"`]+)\.)?(?<object>[\w"`]+)/i
    const match = sql.match(pattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: 'create_function', schema, objectName: name }
    }

    return null
  }

  /**
   * Detects CREATE TRIGGER statements
   */
  detectCreateTrigger(sql: string): SQLEventDetails | null {
    const pattern = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(?<object>[\w"`]+)/i
    const match = sql.match(pattern)

    if (match?.groups) {
      const { name } = this.extractIdentifiers(match.groups)
      return { type: 'create_trigger', objectName: name }
    }

    return null
  }

  /**
   * Detects CREATE VIEW statements
   */
  detectCreateView(sql: string): SQLEventDetails | null {
    const pattern = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?<schema>(?:[\w"`]+)\.)?(?<object>[\w"`]+)/i
    const match = sql.match(pattern)

    if (match?.groups) {
      const { schema, name } = this.extractIdentifiers(match.groups)
      return { type: 'create_view', schema, objectName: name }
    }

    return null
  }

  /**
   * Type guard to check if an event is a table event
   */
  private isTableEvent(event: SQLEventDetails): event is TableEventDetails {
    return Object.values(TABLE_EVENT_ACTIONS).includes(event.type as TableEventAction)
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
      const name = this.isTableEvent(event) ? event.tableName : event.objectName
      const key = `${event.type}:${event.schema || ''}:${name || ''}`
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(event)
      }
    }

    return deduplicated
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

    // Split by semicolon to handle multiple statements
    const statements = sql.split(';').filter(s => s.trim())

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
