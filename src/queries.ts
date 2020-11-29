import { createRecord, getRecords } from "./relational";
import sift from "sift";

import { getRelationDefintion, getTableDefinition } from "./utils";
import {
  Schema as NormalizrSchema,
  schema as normalizrSchema,
} from "normalizr";

import {
  IQBase,
  ITableDefinition,
  IInsertQuery,
  IDestroyQuery,
  ISelectQuery,
  IPredicate,
  IUpdateQuery,
  R,
} from "./types";

export function getInsert(db: IQBase, query: IInsertQuery) {
  return () => {
    const tableName = query[1];
    const rows = query[2].map((el) => el);
    rows.forEach((row) => {
      createRecord(db.db, tableName, {}, row.id, row);
    });
  };
}

export function getDestroy(db: IQBase, query: IDestroyQuery) {
  return () => {
    const tableName = query[1];
  };
}
export function getUpdate(db: IQBase, query: IUpdateQuery) {
  return () => {
    const tableName = query[1];
  };
}

export function getSelect(db: IQBase, query: ISelectQuery) {
  return () => {
    const tableDef = getTableDefinition(db, query[1]);
    const table = getRecords(db.db, tableDef.name);
    const list = Object.values(table.value || {});
    const siftQuery = sift(compilePredicate(db, query));
    const filtered = list.filter(siftQuery) as Record<any, any>[];
    const includeSearchResults = computeIncludes(db, query, tableDef, filtered);
    return filtered.map((el) => {
      return serializeResults(db, query, tableDef, includeSearchResults, el);
    });
  };
}

export function compilePredicate(
  db: IQBase,
  query: ISelectQuery | IUpdateQuery | IDestroyQuery,
  predicate: IPredicate = query[2].predicate as IPredicate
) {
  if (!predicate) {
    return {};
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
    return { [columnName]: { $ne: value } };
  } else {
    throw new Error("INVALID PREDICATE = " + type);
  }
}

export function serializeResults(
  db: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  includesResults: IIncludesResults,
  tableRecord: Record<any, any>
) {
  return tableRecord;
}

export interface IIncludesResults {
  [includeName: string]: {
    values: any[];
    type: "singular" | "plural";
  };
}

export function computeIncludes(
  db: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  tableRecords: Record<any, any>[]
): IIncludesResults {
  const includeResults: IIncludesResults = {};
  (query[2].includes || []).reduce<Record<any, any>>(
    (state, includeName: string) => {
      const relationDefintion = getRelationDefintion(db, tableDef, includeName);
      state[includeName] = {
        values: {},
      };
      switch (relationDefintion[0]) {
        case R.MTM:
          state[includeName]["values"] = {};
          state[includeName]["type"] = "plural";
          break;
        case R.HM:
          state[includeName]["values"] = {};
          state[includeName]["type"] = "plural";
          break;
        case R.BT:
          state[includeName]["values"] = {};
          state[includeName]["type"] = "singular";
          break;
        case R.H1:
          state[includeName]["values"] = {};
          state[includeName]["type"] = "singular";
          break;
      }
      return state;
    },
    includeResults
  );
  return includeResults;
}
