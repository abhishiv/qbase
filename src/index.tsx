import {
  DB,
  createStore as createDb,
  createRecord,
  updateRecord,
  modifyRecord,
  deleteRecord,
  getRecords,
  createTransaction,
  getShradCursorPath,
} from "./relational";
import { defUpdatableCursor, ICommit } from "@gratico/atom";
import { checksum } from "@gratico/checksum";
import sift from "sift";
import shortid from "shortid";

export interface IForeignKeyDefinition {
  ref: string;
}

export interface IColumnDefinition {
  name: string;
  type: "NUMBER" | "INTEGER" | "STRING" | "BOOLEAN" | "DATE_TIME" | "OBJECT";
  nullable?: boolean;
  foreignKey?: IForeignKeyDefinition;
}
export interface IIndex {
  kind: "INDEX";
  name: string;
  columns: [string, "DESC" | "ASC"][];
  unique?: boolean;
}

export enum R {
  HM,
  BT,
  H1,
  MTM,
}
export interface HasManyOptions {
  foreignKey: string;
  tableName: string;
}
export interface HasOneOptions {
  foreignKey: string;
  tableName: string;
}
export interface BelongsOptions {
  foreignKey: string;
  tableName: string;
}
export interface ManyToManyOptions {
  remoteKey: string;
  localKey: string;
  tableName: string;
  through: string;
}
export type IManyToMany = [R.MTM, string, ManyToManyOptions];
export type ITableRelation =
  | [R.HM, string, HasManyOptions]
  | [R.BT, string, BelongsOptions]
  | [R.H1, string, HasOneOptions]
  | IManyToMany;
export interface ITableDefinition {
  name: string;
  primaryKey?: string[];
  columns: IColumnDefinition[];
  indexes?: IIndex[];
  relations?: ITableRelation[];
}
export interface ISchemaDefinition {
  name: string;
  tables: ITableDefinition[];
}

export type ORDER = "ASC" | "DESC";
export enum Q {
  SELECT,
  UPDATE,
  INSERT,
  DESTROY,
}

export enum M {
  $and,
  $or,
  $eq,
  $neq,
}
export type IAndQuery = [M.$and, IPredicate[]];
export type IOrQuery = [M.$or, IPredicate[]];
export type IEqQuery = [M.$eq, string, any];
export type INeqQuery = [M.$neq, string, any];
export type IPredicate = IAndQuery | IOrQuery | IEqQuery | INeqQuery;

export interface ISelectCriterion {
  columns: string[];
  order?: [string, ORDER]; // NIMP
  includes?: string[];
  predicate?: IPredicate;
  limit?: number; // NIMP
  skip?: number; // NIMP
}
export type ISelectQuery = [Q.SELECT, string, ISelectCriterion];

export type IInsertQuery = [Q.INSERT, string, any[]];
export interface IUpdateCiterion {
  values: Array<[string, any]>;
  predicate: IPredicate;
}
export type IUpdateQuery = [Q.UPDATE, string, IUpdateCiterion];
export interface IDestroyCiterion {
  predicate: IPredicate;
}
export type IDestroyQuery = [Q.DESTROY, string, IDestroyCiterion];
export type IQuery = ISelectQuery | IInsertQuery | IUpdateQuery | IDestroyQuery;

export interface IDBStore {
  db: DB;
  queryHandlers: Map<string, Set<Function>>;
  queries: Map<string, [ISelectQuery, string, string]>;
  observe: Function;
  schema: ISchemaDefinition;
}
export function createTable(db: DB, tableDefinition: ITableDefinition) {
  db.state[tableDefinition.name] = {
    checksums: {},
    value: {},
  };
  return tableDefinition;
}

export function getDirtyTables(store: IDBStore, commit: ICommit) {
  return [...new Set(commit.map((el) => el.path[0] as string))];
}
export function getRelatedTables(
  store: IDBStore,
  query: ISelectQuery,
  tableDef: ITableDefinition
) {
  return new Set<string>([
    query[1],
    ...Object.keys(query[2].includes || []).reduce<string[]>(
      (state: string[], includeName: string) => {
        const relation = getRelationDefintion(store, tableDef, includeName);
        if (relation[0] === R.MTM) {
          return [
            ...state,
            relation[2].tableName,
            relation[2].through as string,
          ];
        } else {
          return state;
        }
      },
      [] as string[]
    ),
  ]);
}
export function observe(
  store: IDBStore,
  query: ISelectQuery,
  handler: Function
) {
  const id = shortid();
  const queryHash = checksum(query);
  const wid = id + "/" + queryHash;
  const tableDef = getTableDefinition(store, query[1]);
  const interestingTables = getRelatedTables(store, query, tableDef);
  const shradCusor = defUpdatableCursor(store.db, getShradCursorPath(store.db));
  shradCusor.addWatch(wid, (id, commit) => {
    const dirtyTables = getDirtyTables(store, commit || []);
    const isDirty = dirtyTables.some((el) => interestingTables.has(el));
    console.log("interestingTables", interestingTables, dirtyTables, isDirty);
    if (isDirty) {
      console.log(dirtyTables, interestingTables, isDirty);
      handler();
    }
  });
  addHandler(store, query, wid, handler);
  return () => {
    shradCusor.removeWatch(wid);
    removeHandler(store, query, wid, handler);
  };
}
export async function addHandler(
  store: IDBStore,
  query: ISelectQuery,
  wid: string,
  handler: Function
) {
  const id = shortid();
  const queryHash = checksum(query);
  let exisitngDef = store.queries.get(queryHash);
  let handlers = store.queryHandlers.get(queryHash);
  if (!exisitngDef || !handlers) {
    store.queries.set(wid, [query, queryHash, wid]);
    handlers = new Set([]);
    store.queryHandlers.set(queryHash, handlers);
  }
  if (!handlers) {
    throw new Error("NODEF");
  }
  handlers.add(handler);
}
export async function removeHandler(
  store: IDBStore,
  query: ISelectQuery,
  wid: string,
  handler: Function
) {
  const exisitngDef = store.queries.get(wid);
  if (!exisitngDef) {
    throw new Error("NO_WATCH");
  }
  const [q, queryHash] = exisitngDef;
  const handlers = store.queryHandlers.get(queryHash);
  if (!exisitngDef || !handlers) {
    throw new Error("NODEF");
  }
  handlers.delete(handler);
}
export function createStore(schema: ISchemaDefinition): IDBStore {
  const db = createDb();
  schema.tables.forEach((table) => {
    createTable(db, table);
  });
  const queryHandlers = new Map<string, Set<Function>>();
  const queries = new Map<string, [ISelectQuery, string, string]>();
  const store: IDBStore = {
    db,
    queryHandlers,
    queries,
    observe: (query: ISelectQuery, handler: Function) =>
      observe(store, query, handler),
    schema,
  };
  return store;
}

export function getTableDefinition(
  db: IDBStore,
  tableName: string
): ITableDefinition {
  const table = db.schema.tables.find((el) => el.name == tableName);
  if (!table) throw new Error("no_table " + tableName);
  return table;
}

export function getSelect(db: IDBStore, query: ISelectQuery) {
  return () => {
    const tableDef = getTableDefinition(db, query[1]);
    const table = getRecords(db.db, tableDef.name);
    const list = Object.values(table.value || {});
    const siftQuery = sift(compilePredicate(db, query));
    const filtered = list.filter(siftQuery);
    const includeResults: { [key: string]: { [key: string]: any[] } } = {};
    (query[2].includes || []).forEach((includeName: string) => {
      // performance
      let includeMap = includeResults[includeName];
      if (!includeMap) {
        includeMap = {};
        includeResults[includeName] = includeMap;
      }
      const results: Array<[string, any[]]> = compileIncludeQuery(
        db,
        query,
        tableDef,
        filtered,
        includeName
      );
      results.forEach(([id, values]) => {
        includeMap[id] = values;
      });
    });

    return filtered.map((record: any) => {
      return {
        ...record,
        ...Object.keys(includeResults).reduce(
          (state: any, includeName: string) => {
            const result = includeResults[includeName][record.id];
            const relation = getRelationDefintion(db, tableDef, includeName);
            const isMultiple = [R.HM, R.MTM].indexOf(relation[0]) > -1;
            return {
              ...state,
              [includeName]: result
                ? isMultiple
                  ? result
                  : result[0]
                : undefined,
            };
          },
          {}
        ),
      };
    });
  };
}
export function getRelationDefintion(
  db: IDBStore,
  tableDef: ITableDefinition,
  includeName: string
) {
  const includeDef = (tableDef.relations || []).find(
    (el) => el[1] === includeName
  );
  if (!includeDef) {
    throw new Error("NO_RELATION = " + includeName);
  }
  return includeDef;
}
export function compileIncludeQuery<T = any>(
  db: IDBStore,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  tableRecords: any[],
  includeName: string
): Array<[string, T[]]> {
  const relationDefintion = getRelationDefintion(db, tableDef, includeName);
  if (relationDefintion[0] == R.MTM) {
    const { tableName, through, remoteKey, localKey } = relationDefintion[2];
    const throughRecords = getRecords(db.db, through);
    const throughQuery = sift({
      [localKey]: { $in: tableRecords.map((el) => el.id) },
    });
    const throughTableList = Object.values(throughRecords.value);
    const matchingRecords = throughTableList.filter(throughQuery);
    const remoteMatchIds = matchingRecords.map((el: any) => el[remoteKey]);

    const resultTableRecords = getRecords(db.db, tableName);
    const resultList = Object.values(resultTableRecords.value);
    const resultQuery = sift({ id: { $in: remoteMatchIds } });
    const resultRecords: any[] = resultList.filter(resultQuery);

    const matchIndex = new Map<string, Set<string>>();
    tableRecords.forEach((el) => {
      matchIndex.set(
        el.id,
        new Set(
          throughTableList
            .filter((throughItem: any) => throughItem[localKey] === el.id)
            .map((el: any) => el[remoteKey])
        )
      );
    });

    return tableRecords.map((tableRecord: any) => {
      return [
        tableRecord.id,
        resultRecords.filter((el) => {
          const match = matchIndex.get(tableRecord.id);
          return match && match.has(el.id);
        }),
      ];
    });
  }
  return [];
}

export function getInsert(db: IDBStore, query: IInsertQuery) {
  return () => {
    const tableName = query[1];
    const rows = query[2].map((el) => el);

    rows.forEach((row) => {
      createRecord(db.db, tableName, {}, row.id, row);
    });
  };
}

export function compilePredicate(
  db: IDBStore,
  query: ISelectQuery | IUpdateQuery | IDestroyQuery,
  predicate: IPredicate = query[2].predicate as IPredicate
) {
  if (!predicate) {
    throw new Error("NO_PREDICATE");
  }
  const type = predicate[0];
  const columnName = predicate[1] as string;
  const value = predicate[2] as any;

  if (type === M.$eq) {
    return { [columnName]: { $eq: value } };
  } else if (type == M.$and) {
    return {
      $and: value.map((el: IPredicate) => compilePredicate(db, query, el)),
    };
  } else if (type === M.$or) {
    return {
      $or: value.map((el: IPredicate) => compilePredicate(db, query, el)),
    };
  } else if (type === M.$neq) {
    return { [columnName]: { $neq: value } };
  } else {
    throw new Error("INVALID PREDICATE = " + type);
  }
}

export function getDestroy(db: IDBStore, query: IDestroyQuery) {}
export function getUpdate(db: IDBStore, query: IUpdateQuery) {}
