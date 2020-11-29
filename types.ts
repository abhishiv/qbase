import { DB } from "./relational";
export interface IQBase {
  db: DB;
  compiledSchema: Map<string, any>;
  queryHandlers: Map<string, Set<Function>>;
  queries: Map<string, [ISelectQuery, string, string]>;
  observe: Function;
  schema: ISchemaDefinition;
}

export interface ISchemaDefinition {
  name: string;
  tables: ITableDefinition[];
}
export interface ITableDefinition {
  name: string;
  primaryKey?: string[];
  columns: IColumnDefinition[];
  indexes?: IIndex[];
  relations?: ITableRelation[];
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
  columns: [string, ORDER?][];
  unique?: boolean;
}

// Relations
// ---------------------------
// They can be Many to Many, Has Many, Belongs To, Has One Options are described as follows
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
export type ORDER = "ASC" | "DESC";
export type ITableRelation =
  | [R.HM, string, HasManyOptions]
  | [R.BT, string, BelongsOptions]
  | [R.H1, string, HasOneOptions]
  | IManyToMany;
export type IManyToMany = [R.MTM, string, ManyToManyOptions];

export interface IForeignKeyDefinition {
  ref: string;
}

// Query Matchers
// ---------------------------
// MongoDB styled query matches
export enum M {
  $and,
  $or,
  $eq,
  $neq = "$neq",
}
export type IAndQuery = [M.$and, IPredicate[]];
export type IOrQuery = [M.$or, IPredicate[]];
export type IEqQuery = [M.$eq, string, any];
export type INeqQuery = [M.$neq, string, any];
export type IPredicate = IAndQuery | IOrQuery | IEqQuery | INeqQuery;

// Queries
// ---------------------------
// Queries supported are SELECT, UPDATE, INSERT, DESTROY
export enum Q {
  SELECT,
  UPDATE,
  INSERT,
  DESTROY,
}

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
