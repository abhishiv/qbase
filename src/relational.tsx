import {
  Atom,
  defAtom,
  defCursorUnsafe,
  deref,
  ICommit,
  commitPatch,
} from "@gratico/atom";
import { checksum } from "@gratico/checksum";

export type DB<T = any> = Atom<T>;

export interface IAtomTable<T = unknown> {
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

// public db changes are broadcasted to all clients

export function createStore() {
  const atom = defAtom<IAtomShape>({});
  return atom;
}

export function getShradCursorPath(
  store: Atom<unknown>,
  options: IAtomOperationOptions = {}
) {
  const shradCursor: string[] = [];
  return shradCursor;
}
export function getRecordCursorPath(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: IAtomOperationOptions = {}
) {
  const shradCursor = getShradCursorPath(store, options);
  return [...shradCursor, ...[tableName, "value", id]];
}
export function getTableCursorPath(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions = {}
) {
  const shradCursor = getShradCursorPath(store, options);
  return [...shradCursor, ...[tableName]];
}

export function getRecordCursor(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: IAtomOperationOptions = {}
) {
  const recordCursor = defCursorUnsafe(
    store,
    getRecordCursorPath(store, tableName, id, options)
  );
  return recordCursor;
}
export function getRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  id: string,
  options: { nodeId?: string } = {}
): T {
  const recordCursor = getRecordCursor(store, tableName, id, options);
  return deref(store, recordCursor);
}

export function getTableCursor<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions = {}
) {
  const recordCursor = defCursorUnsafe(
    store,
    getTableCursorPath(store, tableName, options)
  );
  return recordCursor;
}

export interface IAtomOperationOptions {
  nodeId?: string;
  tx?: any;
}

export function getRecords<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions = {}
): IAtomTable<T> {
  const tableCursor = getTableCursor<T>(store, tableName, options);
  return deref(store, tableCursor);
}

export function createRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions,
  id: string,
  value: T
) {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  modifyRecord<T>(store, tableCursorPath, id, value, options);
  return getRecord(store, tableName, id, options);
}

export function createTransaction(store: Atom<any>) {}

export function modifyRecord<T>(
  store: Atom<unknown>,
  tableCursorPath: string[],
  recordId: string,
  recordValue: T | null,
  options: IAtomOperationOptions,
  del: boolean = false
) {
  const listCursor = defCursorUnsafe(store, tableCursorPath);
  const table: IAtomTable = deref(store, listCursor) || { value: {} };
  let tableChecksumList = Object.values(table.value).map(function (item: any) {
    return [item.id, table.checksums[item.id]];
  });
  tableChecksumList = tableChecksumList.filter((el) => el[0] !== recordId);

  if (del) {
  } else {
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
  return commitPatch(store, commit);
}

export function updateRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions,
  id: string,
  value: T
) {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  modifyRecord<T>(store, tableCursorPath, id, value, options);
  return getRecord(store, tableName, id, options);
}
export function deleteRecord<T>(
  store: Atom<unknown>,
  tableName: string,
  options: IAtomOperationOptions,
  id: string
) {
  const tableCursorPath = getTableCursorPath(store, tableName, options);
  modifyRecord<T>(store, tableCursorPath, id, null, options);
}
