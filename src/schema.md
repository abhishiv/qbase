
# schema.ts

createStore
---------------------------

you can then attach queries to it and observe them for changes. To unobserver the call the function returned by observe

```
import {
  IQBase,
  ITableDefinition,
  ISelectQuery,
  ISchemaDefinition,
  IManyToMany,
} from "./types";
import { observe } from "./watch";
import { DB, defDb as createDb } from "./relational";

import {
  Schema as NormalizrSchema,
  schema as normalizrSchema,
} from "normalizr";

export function createStore(schema: ISchemaDefinition): IQBase {
  const db = createDb();
  schema.tables.forEach((table) => {
    createTable(db, table);
  });
  const queryHandlers = new Map<string, Set<Function>>();
  const queries = new Map<string, [ISelectQuery, string, string]>();
  const compiledSchema = new Map<string, any>();
  const store: IQBase = {
    db,
    compiledSchema,
    queryHandlers,
    queries,
    observe: (query: ISelectQuery, handler: Function) =>
      observe(store, query, handler),
    schema,
  };
  schema.tables.forEach((table) => {
    compileSchema(store, table);
  });
  return store;
}
export function compileSchema(db: IQBase, tableDefintion: ITableDefinition) {
  const entity = new normalizrSchema.Entity(tableDefintion.name);
  db.compiledSchema.set(tableDefintion.name, entity);
}

export function createTable(db: DB, tableDefinition: ITableDefinition) {
  db.state[tableDefinition.name] = {
    checksums: {},
    value: {},
  };
  (tableDefinition.relations || []).forEach((el) => {
    if ((el as IManyToMany)[2].through) {
      const thoughTableName: string = (el as IManyToMany)[2].through;
      if (!db.state[thoughTableName]) {
        db.state[thoughTableName] = {
          checksums: {},
          value: {},
        };
      }
    }
  });
  return tableDefinition;
}

```


