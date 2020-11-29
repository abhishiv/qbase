import { createRecord, getRecords, IAtomTable } from "./relational";
import sift from "sift";

import {
  getRelationDefintion,
  getTableDefinition,
  getRelatedTables,
} from "./utils";

import {
  IQBase,
  ITableDefinition,
  IInsertQuery,
  IDestroyQuery,
  ISelectQuery,
  IPredicate,
  IUpdateQuery,
  R,
  M,
  Q,
  ManyToManyOptions,
  HasManyOptions,
  BelongsOptions,
  HasOneOptions,
} from "./types";

export function getInsert(db: IQBase, query: IInsertQuery) {
  return () => {
    const tableName = query[1];
    const rows = query[2].map((el) => el);
    rows.forEach((row) => {
      const result = createRecord(db.db, tableName, {}, row.id, row);
      result.exec();
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
    const list = Object.values(table.value) || [];
    const siftQuery = sift(compilePredicate(db, query));
    const filtered = list.filter(siftQuery) as Record<any, any>[];
    const includeSearchResults = computeIncludes(db, query, tableDef, filtered);

    return denormalizeResults(
      db,
      query,
      tableDef,
      includeSearchResults,
      filtered.map((el) => {
        return serializeIncludeResults(
          db,
          query,
          tableDef,
          includeSearchResults,
          el
        );
      })
    );
  };
}

export function compilePredicate(
  db: IQBase,
  query: ISelectQuery | IUpdateQuery | IDestroyQuery,
  predicate: IPredicate = query[2].predicate as IPredicate
) {
  if (!predicate) {
    return { $exists: true };
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

export function denormalizeResults(
  db: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  includesResults: IIncludesResults,
  tableRecords: Record<any, any>[]
) {
  const relatedTables = [...getRelatedTables(db, query, tableDef)].reduce(
    (state, tableName) => {
      state[tableName] = Object.values(
        getRecords(db.db, tableName).value || {}
      ) as Record<any, any>[];
      return state;
    },
    {} as { [key: string]: Record<any, any>[] }
  );
  return tableRecords.map((el) => {
    return {
      ...el,
      ...Object.keys(includesResults).reduce<Record<any, any>>(
        (state, includeName) => {
          const include = includesResults[includeName];
          const table = relatedTables[include.targetTable];
          const isSingular = include.type === "singular";
          const map = (list: any[], id: string) =>
            list.find((el) => el.id === id);
          const boundMap = map.bind(null, table);

          const list = includesResults[includeName].values[el.id].map(boundMap);

          state[includeName] = isSingular ? list[0] : list;
          return state;
        },
        {}
      ),
    };
  });
}
export function serializeIncludeResults(
  db: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  includesResults: IIncludesResults,
  tableRecord: Record<any, any>
) {
  return Object.keys(includesResults).reduce((state, includeName) => {
    const include = includesResults[includeName] as IIncludeResults;
    if (include.type === "singular") {
      return {
        ...state,
        [includeName]: (include.values[tableRecord.id] || [])[0],
      };
    } else {
      return {
        ...state,
        [includeName]: include.values[tableRecord.id],
      };
    }
  }, tableRecord);
}

export interface IIncludeResults {
  values: any[];
  type: "singular" | "plural";
  targetTable: string;
}
export interface IIncludesResults {
  [includeName: string]: IIncludeResults;
}
export function computeIncludes(
  db: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition,
  sourceTableRecords: Record<any, any>[]
): IIncludesResults {
  const includeResults: IIncludesResults = {};
  const relatedTables = [...getRelatedTables(db, query, tableDef)].reduce(
    (state, tableName) => {
      state[tableName] = getRecords(db.db, tableName);
      return state;
    },
    {} as { [key: string]: IAtomTable }
  );
  const sourceTableIds = sourceTableRecords.map((el) => el.id);

  (query[2].includes || []).reduce<Record<any, any>>(
    (state, includeName: string) => {
      const relationDefintion = getRelationDefintion(db, tableDef, includeName);
      const targetTableName = relationDefintion.opts.tableName;
      const targetTable =
        relatedTables[targetTableName] || ({ value: {} } as IAtomTable);
      state[includeName] = {
        values: {},
        targetTable: targetTableName,
      };
      const relationType = relationDefintion.type;
      if (relationType === R.MTM) {
        const {
          through,
          localKey,
          remoteKey,
        } = relationDefintion.opts as ManyToManyOptions;
        // todo simplify this and make it more mathematical
        const throughtTable =
          relatedTables[through] || ({ value: {} } as IAtomTable);
        const targetTableIds = Object.values(throughtTable.value)
          .filter((joinRecord) => {
            return (
              joinRecord && sourceTableIds.indexOf(joinRecord[localKey]) > -1
            );
          })
          .reduce((state, el) => {
            const value = state[el[localKey]] || [];
            value.push(el[remoteKey]);
            state[el[localKey]] = value;
            return state;
          }, {});
        state[includeName]["values"] = targetTableIds;
        state[includeName]["type"] = "plural";
      } else if (relationType === R.HM) {
        const { foreignKey } = relationDefintion.opts as HasManyOptions;
        state[includeName]["values"] = performTableIntersection(
          sourceTableIds,
          Object.values(targetTable.value),
          foreignKey
        );
        state[includeName]["type"] = "plural";
      } else if (relationType == R.H1) {
        const { foreignKey } = relationDefintion.opts as HasManyOptions;
        state[includeName]["values"] = performTableIntersection(
          sourceTableIds,
          Object.values(targetTable.value),
          foreignKey
        );
        state[includeName]["type"] = "singular";
      } else if (relationType === R.BT) {
        const { foreignKey } = relationDefintion.opts as HasManyOptions;
        state[includeName]["values"] = performTableIntersection(
          sourceTableIds,
          Object.values(targetTable.value),
          foreignKey
        );
        state[includeName]["type"] = "singular";
      }
      return state;
    },
    includeResults
  );
  return includeResults;
}

export function performTableIntersection(
  sourceTableIds: string[],
  targetTableRecords: Record<any, any>,
  foreignKey: string
) {
  const interestingRecords = Object.values(targetTableRecords).filter(
    (joinRecord) => {
      return joinRecord && sourceTableIds.indexOf(joinRecord[foreignKey]) > -1;
    }
  );
  const values = sourceTableIds.reduce((state, sourceId) => {
    state[sourceId] = interestingRecords
      .filter((el) => el[foreignKey] === sourceId)
      .map((el) => el.id);
    return state;
  }, {} as Record<any, any>);
  return values;
}
