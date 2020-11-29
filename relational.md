
# @gratico/qbase/relational

@gratico/qbase/relational
=====

Relational helpers that modify underlying storage

Install and use
---------------

To use run `npm install -g @gratico/qbase`



```
import {
  Atom,
  defAtom,
  defCursor,
  deref,
  ICommit,
  commitPatch,
} from "@gratico/atom";
```

checksums are generated for each record and for the entire table as well - this is needed in order to skip unneeded query watches
we combine this property along with a relational schema to create

```
import { checksum } from "@gratico/checksum";

export type DB<T = any> = Atom<T>;

export interface IAtomTable<T = any> {
  value: {
    [id: string]: T;
  };
  checksums: {
    [id: string]: string;
  };
  checksum: string;
}
export interface IAtomShrad {
  [tableName: string]: IAtomTable;
}
export interface IAtomShape {
  [shradId: string]: IAtomShrad;
}

export interface IAtomOpOptions {
  nodeId?: string;
  tx?: any;
}

export function defDb() {
  const atom = defAtom<IAtomShape>({});
  return atom;
}

export function getShradCursorPath(
  store: Atom<unknown>,
  options: IAtomOpOptions = {}
) {
  const shradCursor: string[] = [];
  return shradCursor;
}
export function getTableCursorPath(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions = {}
) {
  const shradCursor = getShradCursorPath(store, options);
  return [...shradCursor, ...[tableName]];
}
export function getRecordCursorPath(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: IAtomOpOptions = {}
) {
  const shradCursor = getShradCursorPath(store, options);
  return [...shradCursor, ...[tableName, "value", id]];
}
export function getRecordCursor(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: IAtomOpOptions = {}
) {
  const recordCursor = defCursor(
    store,
    getRecordCursorPath(store, tableName, id, options)
  );
  return recordCursor;
}

export function getRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: IAtomOpOptions = {}
): T {
  const recordCursor = getRecordCursor(store, tableName, id, options);
  return deref(store, recordCursor);
}

export function getTableCursor<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions = {}
) {
  const recordCursor = defCursor(
    store,
    getTableCursorPath(store, tableName, options)
  );
  return recordCursor;
}

export interface IWriteOPResult {
  commit?: ICommit;
  exec: () => any;
}

```

GET
---------------------------

```
export function getRecords<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions = {}
): IAtomTable<T> {
  const tableCursor = getTableCursor<T>(store, tableName, options);
  return deref(store, tableCursor);
}

```

POST
---------------------------

```
export function createRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions,
  id: string,
  value: T
): IWriteOPResult {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  const commit = modifyRecord<T>(store, tableCursorPath, id, value, options);
  return {
    commit,
    exec: () => {
      commitPatch(store, commit);
      return getRecord(store, tableName, id, options);
    },
  };
}

```

PUT
---------------------------

```
export function updateRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions,
  id: string,
  value: T
): IWriteOPResult {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  const commit = modifyRecord<T>(store, tableCursorPath, id, value, options);
  return {
    commit,
    exec: () => {
      commitPatch(store, commit);
      return getRecord(store, tableName, id, options);
    },
  };
}

```

DELETE
---------------------------

```
export function deleteRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOpOptions,
  id: string
): IWriteOPResult {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  const commit = modifyRecord<T>(store, tableCursorPath, id, null, options);
  return {
    commit,
    exec: () => {
      commitPatch(store, commit);
    },
  };
}

```

modifyRecord
---------------------------

workhorse function responsible for actually modify underlying storage while calcullating appropriate checksums(including in case of delete)

```
export function modifyRecord<T>(
  store: Atom<unknown>,
  tableCursorPath: string[],
  recordId: string,
  recordValue: T | null,
  options: IAtomOpOptions
) {
  const del = !recordValue;
  const tableCursor = defCursor(store, tableCursorPath);
  const table: IAtomTable = deref(store, tableCursor) || { value: {} };
  const tableChecksumList = Object.values(table.value)
    .map(function (item: any) {
      return [item.id, table.checksums[item.id]];
    })
    .filter((el) => el[0] !== recordId);
```

performance hence push insread of spread

```
  if (!del) {
    tableChecksumList.push([recordId, checksum(recordValue)]);
  }
  const tableChecksum = checksum(tableChecksumList.map((el) => el[1]));

  const commit: ICommit = [];

  if (del) {
    commit.push({
      op: "replace",
      path: [...tableCursorPath, "value", recordId],
      value: undefined,
    });
    commit.push({
      op: "replace",
      path: [...tableCursorPath, "checksums", recordId],
      value: undefined,
    });
  } else {
    commit.push({
      op: "replace",
      path: [...tableCursorPath, "value", recordId],
      value: recordValue,
    });
    commit.push({
      op: "replace",
      path: [...tableCursorPath, "checksums", recordId],
      value: checksum(recordValue),
    });
  }
  commit.push({
    op: "replace",
    path: [...tableCursorPath, "checksum"],
    value: tableChecksum,
  });
  return commit;
}

```


