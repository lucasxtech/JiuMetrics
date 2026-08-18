/**
 * Fake mínimo de PostgREST para a SPEC-004.
 *
 * Decisão P2 (specs/004-authorization-safety-net/spec.md): não roda contra
 * banco real (não existe projeto Supabase de teste — só produção). Este fake
 * reproduz a FORMA das chamadas do supabase-js (.from().select().eq().in()
 * .order().single(), .insert().select(), .update().eq().select(),
 * .delete().eq()) sobre um Map em memória, mas NÃO executa SQL de verdade.
 *
 * Limitação aceita e documentada na spec: prova que o filtro foi PEDIDO na
 * chamada, não que a query final restringiria as linhas num banco real.
 */
const crypto = require('crypto');

function clone(row) {
  return row ? { ...row } : row;
}

class QueryBuilder {
  constructor(store, table, op, payload) {
    this.store = store;
    this.table = table;
    this.op = op; // 'select' | 'insert' | 'update' | 'delete'
    this.payload = payload;
    this.filters = [];
    this.orderBy = null;
    this.singleFlag = false;
    this.countOpts = payload && payload.opts;
  }

  eq(col, val) {
    this.filters.push({ col, val, kind: 'eq' });
    return this;
  }

  in(col, vals) {
    this.filters.push({ col, vals, kind: 'in' });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderBy = { col, ascending };
    return this;
  }

  single() {
    this.singleFlag = true;
    return this;
  }

  // Encadeado após insert/update/delete (".select()") ou como chamada de
  // entrada (".select('*', {count, head})"). Neste fake, insert/update/delete
  // sempre retornam os dados afetados — reflete o que o código real sempre
  // encadeia (`.select()`) neste repositório.
  select(cols, opts) {
    if (this.op === 'select') {
      this.countOpts = opts;
    }
    return this;
  }

  _rows() {
    return this.store.get(this.table) || [];
  }

  _matches(row) {
    return this.filters.every((f) => {
      if (f.kind === 'eq') return row[f.col] === f.val;
      if (f.kind === 'in') return Array.isArray(f.vals) && f.vals.includes(row[f.col]);
      return true;
    });
  }

  _execute() {
    const rows = this._rows();

    if (this.op === 'select') {
      let result = rows.filter((r) => this._matches(r));
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        result = [...result].sort((a, b) => {
          if (a[col] === b[col]) return 0;
          const dir = a[col] > b[col] ? 1 : -1;
          return ascending ? dir : -dir;
        });
      }
      if (this.countOpts && this.countOpts.head) {
        return { data: null, error: null, count: result.length };
      }
      if (this.singleFlag) {
        if (result.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
        }
        return { data: clone(result[0]), error: null };
      }
      return { data: result.map(clone), error: null };
    }

    if (this.op === 'insert') {
      const now = new Date().toISOString();
      const inserted = this.payload.rows.map((r) => ({
        id: r.id || crypto.randomUUID(),
        created_at: r.created_at || now,
        updated_at: now,
        ...r,
      }));
      rows.push(...inserted);
      this.store.set(this.table, rows);
      if (this.singleFlag) return { data: clone(inserted[0]), error: null };
      return { data: inserted.map(clone), error: null };
    }

    if (this.op === 'update') {
      const matched = rows.filter((r) => this._matches(r));
      const now = new Date().toISOString();
      matched.forEach((r) => Object.assign(r, this.payload.patch, { updated_at: now }));
      if (this.singleFlag) {
        if (matched.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
        }
        return { data: clone(matched[0]), error: null };
      }
      return { data: matched.map(clone), error: null };
    }

    if (this.op === 'delete') {
      const matched = rows.filter((r) => this._matches(r));
      const remaining = rows.filter((r) => !this._matches(r));
      this.store.set(this.table, remaining);
      if (this.singleFlag) {
        if (matched.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'Row not found' } };
        }
        return { data: clone(matched[0]), error: null };
      }
      return { data: matched.map(clone), error: null };
    }

    throw new Error(`fakeSupabase: operação não suportada "${this.op}"`);
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
}

/**
 * Cria um fake de PostgREST seedado com `seedRows` ({ tableName: [row, ...] }).
 * `store` é exposto para os testes inspecionarem o estado após a requisição
 * (ex.: confirmar que um vazamento realmente escreveu numa tabela).
 */
function createFakeSupabase(seedRows = {}) {
  const store = new Map();
  Object.entries(seedRows).forEach(([table, rows]) => {
    store.set(table, (rows || []).map(clone));
  });

  const client = {
    from(table) {
      return {
        select: (cols, opts) => new QueryBuilder(store, table, 'select', { cols, opts }),
        insert: (rows) => new QueryBuilder(store, table, 'insert', { rows }),
        update: (patch) => new QueryBuilder(store, table, 'update', { patch }),
        delete: () => new QueryBuilder(store, table, 'delete', {}),
      };
    },
  };

  return { client, store };
}

module.exports = { createFakeSupabase };
