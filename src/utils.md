
# utils.ts

```
import { IQBase, ITableDefinition } from "./types";

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
    (el) => el[1] === includeName
  );
  if (!includeDef) {
    throw new Error("NO_RELATION = " + includeName);
  }
  return includeDef;
}

```


