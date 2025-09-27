import { describe, it, expect } from 'vitest'
import {
  detectCreateTable,
  detectInsert,
  detectCopy,
  detectSelectInto,
  detectEnableRLS,
  parseSQLEvents,
  getTableEvents,
} from './sql-event-parser'
import { TABLE_EVENT_ACTIONS } from 'common/telemetry-constants'

describe('SQL Event Parser', () => {
  describe('detectCreateTable', () => {
    it('detects basic CREATE TABLE', () => {
      const result = detectCreateTable('CREATE TABLE users (id INT PRIMARY KEY)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects CREATE TABLE with schema', () => {
      const result = detectCreateTable('CREATE TABLE public.users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('detects CREATE TABLE IF NOT EXISTS', () => {
      const result = detectCreateTable('CREATE TABLE IF NOT EXISTS users (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = detectCreateTable('CREATE TABLE "public"."user_table" (id INT)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'user_table',
      })
    })

    it('returns null for non-matching SQL', () => {
      const result = detectCreateTable('SELECT * FROM users')
      expect(result).toBeNull()
    })
  })

  describe('detectInsert', () => {
    it('detects basic INSERT INTO', () => {
      const result = detectInsert("INSERT INTO users (name) VALUES ('John')")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects INSERT with schema', () => {
      const result = detectInsert("INSERT INTO public.users (name) VALUES ('John')")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = detectInsert('INSERT INTO "auth"."users" (id) VALUES (1)')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'auth',
        tableName: 'users',
      })
    })

    it('returns null for non-matching SQL', () => {
      const result = detectInsert('UPDATE users SET name = "John"')
      expect(result).toBeNull()
    })
  })

  describe('detectCopy', () => {
    it('detects basic COPY FROM', () => {
      const result = detectCopy("COPY users FROM '/tmp/users.csv'")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects COPY with schema', () => {
      const result = detectCopy("COPY public.users FROM '/tmp/users.csv' WITH CSV HEADER")
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = detectCopy('COPY "auth"."users" FROM STDIN')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        schema: 'auth',
        tableName: 'users',
      })
    })

    it('returns null for COPY TO', () => {
      const result = detectCopy("COPY users TO '/tmp/users.csv'")
      expect(result).toBeNull()
    })

    it('returns null for non-matching SQL', () => {
      const result = detectCopy('SELECT * FROM users')
      expect(result).toBeNull()
    })
  })

  describe('detectSelectInto', () => {
    it('detects SELECT INTO', () => {
      const result = detectSelectInto('SELECT * INTO new_users FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('detects SELECT INTO with schema', () => {
      const result = detectSelectInto('SELECT id, name INTO public.new_users FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'public',
        tableName: 'new_users',
      })
    })

    it('detects CREATE TABLE AS SELECT', () => {
      const result = detectSelectInto('CREATE TABLE new_users AS SELECT * FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('detects CREATE TABLE IF NOT EXISTS AS SELECT', () => {
      const result = detectSelectInto('CREATE TABLE IF NOT EXISTS new_users AS SELECT * FROM users WHERE active = true')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: undefined,
        tableName: 'new_users',
      })
    })

    it('handles quoted identifiers', () => {
      const result = detectSelectInto('SELECT * INTO "backup"."users_2024" FROM users')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_CREATED,
        schema: 'backup',
        tableName: 'users_2024',
      })
    })

    it('returns null for regular SELECT', () => {
      const result = detectSelectInto('SELECT * FROM users')
      expect(result).toBeNull()
    })
  })

  describe('detectEnableRLS', () => {
    it('detects ALTER TABLE ENABLE ROW LEVEL SECURITY', () => {
      const result = detectEnableRLS('ALTER TABLE users ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects short form ENABLE RLS', () => {
      const result = detectEnableRLS('ALTER TABLE users ENABLE RLS')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('detects with schema', () => {
      const result = detectEnableRLS('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: 'public',
        tableName: 'users',
      })
    })

    it('handles other ALTER TABLE statements in between', () => {
      const result = detectEnableRLS('ALTER TABLE users ADD COLUMN test INT, ENABLE ROW LEVEL SECURITY')
      expect(result).toEqual({
        type: TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED,
        schema: undefined,
        tableName: 'users',
      })
    })

    it('returns null for disabling RLS', () => {
      const result = detectEnableRLS('ALTER TABLE users DISABLE ROW LEVEL SECURITY')
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
      const results = parseSQLEvents(sql)
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
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe('create_function')
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles COPY and SELECT INTO statements', () => {
      const sql = `
        COPY users FROM '/tmp/users.csv';
        SELECT * INTO new_table FROM old_table;
        CREATE TABLE backup AS SELECT * FROM users;
      `
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(3)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[2].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
    })

    it('handles empty SQL', () => {
      const results = parseSQLEvents('')
      expect(results).toHaveLength(0)
    })

    it('handles SQL with only comments', () => {
      const sql = '-- This is a comment\n-- Another comment'
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(0)
    })

    it('handles malformed SQL gracefully', () => {
      const sql = 'CREATE TABL users; INSER INTO users;'
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(0)
    })

    it('handles SQL with inline comments', () => {
      const sql = `
        CREATE TABLE users (id INT); -- This creates a table
        INSERT INTO users VALUES (1); /* Insert a row */
      `
      const results = parseSQLEvents(sql)
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
      const results = parseSQLEvents(sql)
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
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(2)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
      expect(results[1].type).toBe(TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED)
    })

    it('handles backtick identifiers', () => {
      const sql = 'CREATE TABLE `users` (id INT);'
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(1)
      expect(results[0].type).toBe(TABLE_EVENT_ACTIONS.TABLE_CREATED)
    })

    it('deduplicates multiple similar statements', () => {
      const sql = `
        INSERT INTO users VALUES (1);
        INSERT INTO users VALUES (2);
        INSERT INTO users VALUES (3);
        INSERT INTO public.users VALUES (4);
        INSERT INTO posts VALUES (1);
      `
      const results = parseSQLEvents(sql)
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
      const results = parseSQLEvents(sql)
      expect(results).toHaveLength(3) // One create, one insert, one RLS enable (all for users table)
      expect(results.map(r => r.type)).toEqual([
        TABLE_EVENT_ACTIONS.TABLE_CREATED,
        TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED,
        TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED
      ])
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
      const results = getTableEvents(sql)
      expect(results).toHaveLength(3)
      expect(results.map(r => r.type)).toEqual([TABLE_EVENT_ACTIONS.TABLE_CREATED, TABLE_EVENT_ACTIONS.TABLE_DATA_INSERTED, TABLE_EVENT_ACTIONS.TABLE_RLS_ENABLED])
    })

    it('returns empty array for non-table SQL', () => {
      const sql = `
        CREATE FUNCTION test() RETURNS INT AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
        CREATE VIEW user_view AS SELECT * FROM users;
        SELECT * FROM users;
      `
      const results = getTableEvents(sql)
      expect(results).toHaveLength(0)
    })
  })
})