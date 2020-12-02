import { IQBase, ITableDefinition, ISelectQuery, R } from "./types";

export function getTableDefinition(
  db: IQBase,
  tableName: string
): ITableDefinition {
  const table = db.schema.tables.find((el) => el.name == tableName);
  if (!table) throw new Error("no_table " + tableName);
  return table;
}

export function getRelationDefintion(
  db: IQBase,
  tableDef: ITableDefinition,
  includeName: string
) {
  const includeDef = (tableDef.relations || []).find(
    (el) => el.name === includeName
  );
  if (!includeDef) {
    throw new Error("NO_RELATION = " + includeName);
  }
  return includeDef;
}
export function getRelatedTables(
  store: IQBase,
  query: ISelectQuery,
  tableDef: ITableDefinition
) {
  return new Set<string>([
    query[1],
    ...((query[2] || {}).includes || []).reduce<string[]>(
      (state: string[], includeName: string) => {
        const relation = getRelationDefintion(store, tableDef, includeName);
        if (relation.type === R.MTM) {
          return [...state, relation.opts.tableName, relation.opts.through];
        } else {
          // todo handle R.HM, R.BT, R.H1
          return state;
        }
      },
      [] as string[]
    ),
  ]);
}
