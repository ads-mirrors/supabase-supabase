import { describe, it, expect } from 'vitest'
import { sqlEventParser, type TableEventDetails } from './sql-event-parser'
import { TABLE_EVENT_ACTIONS } from 'common/telemetry-constants'

describe('SQL Event Parser', () => {
  describe('detectCreateTable', () => {
    it('detects basic CREATE TABLE', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TABLE users (id INT PRIMARY KEY)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects CREATE TABLE with schema', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TABLE public.users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('detects CREATE TABLE IF NOT EXISTS', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TABLE IF NOT EXISTS users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TABLE "public"."user_table" (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'user_table',
      })
    })

    it('returns null for non-matching SQL', () => {
      const result = sqlEventParser.detectCreateTable('SELECT * FROM users')
      expect(result).toBeNull()
    })

    it('detects CREATE TEMPORARY TABLE', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TEMPORARY TABLE temp_users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'temp_users',
      })
    })

    it('detects CREATE TEMP TABLE', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TEMP TABLE temp_users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'temp_users',
      })
    })

    it('detects CREATE UNLOGGED TABLE', () => {
      const result = sqlEventParser.detectCreateTable('CREATE UNLOGGED TABLE fast_table (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'fast_table',
      })
    })

    it('detects CREATE TEMP TABLE IF NOT EXISTS', () => {
      const result = sqlEventParser.detectCreateTable('CREATE TEMP TABLE IF NOT EXISTS temp_users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'temp_users',
      })
    })
  })

  describe('detectInsert', () => {
    it('detects basic INSERT INTO', () => {
      const result = sqlEventParser.detectInsert("INSERT INTO users (name) VALUES ('John')")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects INSERT with schema', () => {
      const result = sqlEventParser.detectInsert("INSERT INTO public.users (name) VALUES ('John')")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = sqlEventParser.detectInsert('INSERT INTO "auth"."users" (id) VALUES (1)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'auth',
        tableName: 'users',
      })
    })

    it('returns null for non-matching SQL', () => {
      const result = sqlEventParser.detectInsert('UPDATE users SET name = "John"')
      expect(result).toBeNull()
    })
  })

  describe('detectCopy', () => {
    it('detects basic COPY FROM', () => {
      const result = sqlEventParser.detectCopy("COPY users FROM '/tmp/users.csv'")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects COPY with schema', () => {
      const result = sqlEventParser.detectCopy("COPY public.users FROM '/tmp/users.csv' WITH CSV HEADER")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = sqlEventParser.detectCopy('COPY "auth"."users" FROM STDIN')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'auth',
        tableName: 'users',
      })
    })

    it('returns null for COPY TO', () => {
      const result = sqlEventParser.detectCopy("COPY users TO '/tmp/users.csv'")
      expect(result).toBeNull()
    })

    it('returns null for non-matching SQL', () => {
      const result = sqlEventParser.detectCopy('SELECT * FROM users')
      expect(result).toBeNull()
    })
  })

  describe('detectSelectInto', () => {
    it('detects SELECT INTO', () => {
      const result = sqlEventParser.detectSelectInto('SELECT * INTO new_users FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('detects SELECT INTO with schema', () => {
      const result = sqlEventParser.detectSelectInto('SELECT id, name INTO public.new_users FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'new_users',
      })
    })

    it('detects CREATE TABLE AS SELECT', () => {
      const result = sqlEventParser.detectSelectInto('CREATE TABLE new_users AS SELECT * FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('detects CREATE TABLE IF NOT EXISTS AS SELECT', () => {
      const result = sqlEventParser.detectSelectInto('CREATE TABLE IF NOT EXISTS new_users AS SELECT * FROM users WHERE active = true')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = sqlEventParser.detectSelectInto('SELECT * INTO "backup"."users_2024" FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'backup',
        tableName: 'users_2024',
      })
    })

    it('returns null for regular SELECT', () => {
      const result = sqlEventParser.detectSelectInto('SELECT * FROM users')
      expect(result).toBeNull()
    })
  })

  describe('detectEnableRLS', () => {
    it('detects ALTER TABLE ENABLE ROW LEVEL SECURITY', () => {
      const result = sqlEventParser.detectEnableRLS('ALTER TABLE users ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects short form ENABLE RLS', () => {
      const result = sqlEventParser.detectEnableRLS('ALTER TABLE users ENABLE RLS')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects with schema', () => {
      const result = sqlEventParser.detectEnableRLS('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles other ALTER TABLE statements in between', () => {
      const result = sqlEventParser.detectEnableRLS('ALTER TABLE users ADD COLUMN test INT, ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('returns null for disabling RLS', () => {
      const result = sqlEventParser.detectEnableRLS('ALTER TABLE users DISABLE ROW LEVEL SECURITY')
      expect(result).toBeNull()
    })
  })

  describe('parseSQLEvents', () => {
    it('parses multiple statements', () => {
      const sql = `
        CREATE TABLE users (id INT);
        INSERT INTO users (id) VALUES (1);
        ALTER TABLE users ENABLE RLS;
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED)
    })

    it('handles mixed activation and non-activation events', () => {
      const sql = `
        CREATE TABLE users (id INT);
        CREATE FUNCTION test() RETURNS INT AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
        INSERT INTO users (id) VALUES (1);
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.FUNCTION_CREATED)
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles COPY and SELECT INTO statements', () => {
      const sql = `
        COPY users FROM '/tmp/users.csv';
        SELECT * INTO new_table FROM old_table;
        CREATE TABLE backup AS SELECT * FROM users;
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
    })

    it('handles empty SQL', () => {
      const results = sqlEventParser.parseSQLEvents('')
      expect(results).toHaveLength(0)
    })

    it('handles SQL with only comments', () => {
      const sql = '-- This is a comment\n-- Another comment'
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(0)
    })

    it('handles malformed SQL gracefully', () => {
      const sql = 'CREATE TABL users; INSER INTO users;'
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(0)
    })

    it('handles SQL with inline comments', () => {
      const sql = `
        CREATE TABLE users (id INT); -- This creates a table
        INSERT INTO users VALUES (1); /* Insert a row */
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(2)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles case variations', () => {
      const sql = `
        create table users (id INT);
        INSERT into users VALUES (1);
        alter TABLE users enable row level security;
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED)
    })

    it('handles multiline statements', () => {
      const sql = `
        CREATE TABLE
          users (
            id INT,
            name VARCHAR(100)
          );
        INSERT INTO users
          (id, name)
        VALUES
          (1, 'John');
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(2)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles backtick identifiers', () => {
      const sql = 'CREATE TABLE `users` (id INT);'
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(1)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
    })

    it('handles semicolons inside string values', () => {
      const sql = `
        CREATE TABLE messages (content TEXT);
        INSERT INTO messages VALUES ('Hello; World');
        INSERT INTO users VALUES ('Another; Message');
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect((results[0] as TableEventDetails).tableName).toBe('messages')
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect((results[1] as TableEventDetails).tableName).toBe('messages')
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect((results[2] as TableEventDetails).tableName).toBe('users')
    })

    it('handles escaped quotes in strings', () => {
      const sql = `
        INSERT INTO users VALUES ('O''Brien');
        INSERT INTO names VALUES ('Mary''s Book');
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(2)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('deduplicates multiple similar statements', () => {
      const sql = `
        INSERT INTO users VALUES (1);
        INSERT INTO users VALUES (2);
        INSERT INTO users VALUES (3);
        INSERT INTO public.users VALUES (4);
        INSERT INTO posts VALUES (1);
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3) // users (no schema), public.users, posts

      const types = results.map(r => ({ type: r.type, schema: r.schema, tableName: (r as any).tableName }))
      expect(types).toEqual([
        { type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, schema: undefined, tableName: 'users' },
        { type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, schema: 'public', tableName: 'users' },
        { type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, schema: undefined, tableName: 'posts' }
      ])
    })

    it('deduplicates mixed event types correctly', () => {
      const sql = `
        CREATE TABLE users (id INT);
        INSERT INTO users VALUES (1);
        INSERT INTO users VALUES (2);
        CREATE TABLE users (id INT, name TEXT);
        ALTER TABLE users ENABLE RLS;
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      expect(results).toHaveLength(3) // One create, one insert, one RLS enable (all for users table)
      expect(results.map(r => r.type)).toEqual([
        TABLE_EVENT_ACTIONS.TABLE_CREATED,
        TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED
      ])
    })
  })

  describe('ReDoS protection', () => {
    it('handles extremely long identifier names efficiently', () => {
      const longIdentifier = 'a'.repeat(10000)
      const sql = `CREATE TABLE ${longIdentifier} (id INT)`

      const startTime = Date.now()
      const result = sqlEventParser.detectCreateTable(sql)
      const duration = Date.now() - startTime

      // Should complete quickly even with long input
      expect(duration).toBeLessThan(100)
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: longIdentifier,
      })
    })

    it('handles nested dots in schema names without catastrophic backtracking', () => {
      const maliciousInput = 'a.'.repeat(1000) + 'table'
      const sql = `CREATE TABLE ${maliciousInput} (id INT)`

      const startTime = Date.now()
      const result = sqlEventParser.detectCreateTable(sql)
      const duration = Date.now() - startTime

      // Should complete quickly despite potential ReDoS pattern
      expect(duration).toBeLessThan(100)
      // The pattern should capture the schema part correctly
      expect(result).toBeTruthy()
    })

    it('handles pathological SELECT INTO patterns', () => {
      const maliciousSQL = 'SELECT ' + 'a '.repeat(1000) + 'INTO table FROM users'

      const startTime = Date.now()
      const result = sqlEventParser.detectSelectInto(maliciousSQL)
      const duration = Date.now() - startTime

      // Should complete quickly despite .*? pattern
      expect(duration).toBeLessThan(100)
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'table',
      })
    })

    it('handles ALTER TABLE with many operations between', () => {
      const manyOperations = 'ADD COLUMN test INT, '.repeat(100)
      const sql = `ALTER TABLE users ${manyOperations} ENABLE ROW LEVEL SECURITY`

      const startTime = Date.now()
      const result = sqlEventParser.detectEnableRLS(sql)
      const duration = Date.now() - startTime

      // Should complete quickly despite .*? pattern
      expect(duration).toBeLessThan(100)
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('handles mixed quotes and backticks efficiently', () => {
      const mixedQuotes = '`"`.'.repeat(100) + 'tablename'
      const sql = `CREATE TABLE ${mixedQuotes} (id INT)`

      const startTime = Date.now()
      sqlEventParser.parseSQLEvents(sql)
      const duration = Date.now() - startTime

      // Should handle mixed quotes without performance issues
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Edge cases and special characters', () => {
    it('handles Unicode identifiers', () => {
      const sql = 'CREATE TABLE 用户表 (id INT)'
      const result = sqlEventParser.detectCreateTable(sql)
      // Unicode characters are not in \w, so this should not match
      expect(result).toBeNull()
    })

    it('handles identifiers with numbers', () => {
      const sql = 'CREATE TABLE table123 (id INT)'
      const result = sqlEventParser.detectCreateTable(sql)
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'table123',
      })
    })

    it('handles identifiers with underscores', () => {
      const sql = 'CREATE TABLE user_accounts (id INT)'
      const result = sqlEventParser.detectCreateTable(sql)
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'user_accounts',
      })
    })

    it('handles escaped quotes in identifiers', () => {
      const sql = 'CREATE TABLE "user""table" (id INT)'
      const result = sqlEventParser.detectCreateTable(sql)
      // Should capture the identifier but cleaning will remove quotes
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'usertable',
      })
    })

    it('handles dollar-quoted strings in SQL', () => {
      const sql = `
        CREATE TABLE users (id INT);
        INSERT INTO logs VALUES ($$CREATE TABLE fake$$);
        INSERT INTO users VALUES (1);
      `
      const results = sqlEventParser.parseSQLEvents(sql)
      // Note: Current implementation doesn't handle dollar quotes properly
      // It detects the fake CREATE TABLE, and deduplication keeps unique events
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[0]).toMatchObject({ tableName: 'users' })
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1]).toMatchObject({ tableName: 'fake' })
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles SQL injection attempts safely', () => {
      const sql = "CREATE TABLE users'; DROP TABLE users; -- (id INT)"
      const result = sqlEventParser.detectCreateTable(sql)
      // Should safely parse without executing
      // The apostrophe is cleaned out by our identifier cleaner
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: "users",
      })
    })
  })

  describe('getTableEvents', () => {
    it('filters only table-related events', () => {
      const sql = `
        CREATE TABLE users (id INT);
        CREATE FUNCTION test() RETURNS INT AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
        INSERT INTO users (id) VALUES (1);
        ALTER TABLE users ENABLE RLS;
        CREATE VIEW user_view AS SELECT * FROM users;
      `
      const results = sqlEventParser.getTableEvents(sql)
      expect(results).toHaveLength(3)
      expect(results.map(r => r.type)).toEqual([TABLE_EVENT_ACTIONS.TABLE_CREATED, TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED])
    })

    it('returns empty array for non-table SQL', () => {
      const sql = `
        CREATE FUNCTION test() RETURNS INT AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
        CREATE VIEW user_view AS SELECT * FROM users;
        SELECT * FROM users;
      `
      const results = sqlEventParser.getTableEvents(sql)
      expect(results).toHaveLength(0)
    })
  })
})