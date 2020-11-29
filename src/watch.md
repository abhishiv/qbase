
# watch.ts

```
import { getShradCursorPath } from "./relational";

import { defWatchableCursor, ICommit } from "@gratico/atom";
import { checksum } from "@gratico/checksum";

import shortid from "shortid";

import { IQBase, ITableDefinition, ISelectQuery, R } from "./types";
import { getTableDefinition, getRelationDefintion } from "./utils";
export function observe(store: IQBase, query: ISelectQuery, handler: Function) {
  const id = shortid();
  const queryHash = checksum(query);
  const wid = id + "/" + queryHash;
  const tableDef = getTableDefinition(store, query[1]);
  const interestingTables = getRelatedTables(store, query, tableDef);
  const shradCusor = defWatchableCursor(store.db, getShradCursorPath(store.db));
  shradCusor.addWatch(wid, (id, commit) => {
    const dirtyTables = getDirtyTables(store, commit || []);
    const isDirty = dirtyTables.some((el) => interestingTables.has(el));
    console.debug("interestingTables", interestingTables, dirtyTables, isDirty);
    if (isDirty) {
      console.debug(dirtyTables, interestingTables, isDirty);
      handler();
    }
  });
  addHandler(store, query, wid, handler);
  return () => {
    shradCusor.removeWatch(wid);
    removeHandler(store, query, wid, handler);
  };
}

export function getDirtyTables(store: IQBase, commit: ICommit) {
  return [...new Set(commit.map((el) => el.path[0] as string))];
}
export function getRelatedTables(
  store: IQBase,
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
export async function addHandler(
  store: IQBase,
  query: ISelectQuery,
  wid: string,
  handler: Function
) {
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
  store: IQBase,
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

```


