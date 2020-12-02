/* eslint  no-var: "error" */

// @gratico/qbase
// =====
// Simple lightweight and fast in-memory data store with support for lazy queries, watchable queries, transactions, H1/HM/MTM/BT relationships, and MongoDB styled selectors.

// Written to be an lightweight functional alternative to @apollo/client. PRs welcomed for adding support for JSONSchema.

// Install and use
// ---------------
// To use run `npm install -g @gratico/qbase`
//
//     import {createStore, getSelect, getInsert, observe} from "@gratico/qbase"
//     import schema from './schema'
//     const store = createStore(schema)
//

// Schema Definition
// ---------------------------
// List of table describing their column and realtions
//
//     export const schema: ISchemaDefinition = {
//       name: "Kernel",
//       tables: [
//         ...tables,
//         {
//           name: "Masters",
//           primaryKey: ["id"],
//           relations: [
//             {
//               type: R.MTM,
//               name: "viewports",
//               opts: {
//                 tableName: "Viewports",
//                 remoteKey: "viewportId",
//                 localKey: "masterId",
//                 through: "MasterViewportJunction",
//               },
//             },
//           ],
//           columns: [
//             { name: "id", type: "STRING" },
//             { name: "createdAt", type: "DATE_TIME", nullable: true },
//           ],
//         } as ITableDefinition,
//       ],
//     };
//

// Querying
// ---------------------------
// List of table describing their column and realtions
//
//     const selectQuery = getSelect(db, [
//       Q.SELECT,
//       "Masters",
//       { columns: ["id", "name"], includes: ["masters"] },
//     ]);
//     const preInsertSelectResults = selectQuery();
//     const insertMQuery = getInsert(db, [
//       Q.INSERT,
//       "People",
//       [{ id: "m1", "name": "Master 1" }],
//     ])();
//

export * from "./queries";
export * from "./relational";
export * from "./schema";
export * from "./types";
export * from "./utils";
export * from "./watch";
export * from "./react_hooks";
