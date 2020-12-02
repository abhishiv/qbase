// createStore
// ---------------------------
// you can then attach queries to it and observe them for changes. To unobserver the call the function returned by observe
import {
  IQBase,
  ITableDefinition,
  ISelectQuery,
  ISchemaDefinition,
  IManyToMany,
  R,
} from "./types";
import { observe } from "./watch";
import { DB, defDb as createDb } from "./relational";

export function createStore(schema: ISchemaDefinition): IQBase {
  const db = createDb();
  schema.tables.forEach((table) => {
    createTable(db, table);
  });
  const queryHandlers = new Map<string, Set<Function>>();
  const queries = new Map<string, [ISelectQuery, string, string]>();
  const compiledSchema = {};
  const store: IQBase = {
    db,
    compiledSchema,
    queryHandlers,
    queries,
    schema,
  };
  schema.tables.forEach((table) => {
    //compileSchema(store, table);
  });
  return store;
}
//export function compileSchema(db: IQBase, tableDefintion: ITableDefinition) {}

export function createTable(db: DB, tableDefinition: ITableDefinition) {
  db.state[tableDefinition.name] = {
    checksums: {},
    value: {},
  };
  (tableDefinition.relations || []).forEach((el) => {
    if (el.type === R.MTM && el.opts.through) {
      const thoughTableName = el.opts.through;
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
