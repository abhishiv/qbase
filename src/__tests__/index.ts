import {
  createStore,
  R,
  ITableDefinition,
  ISchemaDefinition,
  getInsert,
  getSelect,
  Q,
  M,
} from "../index";
export const schema: ISchemaDefinition = {
  name: "Kernel",
  tables: [
    {
      name: "Masters",
      primaryKey: ["id"],
      relations: [
        {
          type: R.MTM,
          name: "viewports",
          opts: {
            tableName: "Viewports",
            remoteKey: "viewportId",
            localKey: "masterId",
            through: "MasterViewportJunction",
          },
        },
      ],
      columns: [
        { name: "id", type: "STRING" },
        { name: "createdAt", type: "DATE_TIME", nullable: true },
      ],
    } as ITableDefinition,
    {
      name: "Viewports",
      primaryKey: ["id"],
      relations: [
        {
          type: R.MTM,
          name: "masters",
          opts: {
            tableName: "Masters",
            remoteKey: "masterId",
            localKey: "viewportId",
            through: "MasterViewportJunction",
          },
        },
      ],
      columns: [
        { name: "id", type: "STRING" },
        { name: "createdAt", type: "DATE_TIME", nullable: true },
      ],
    } as ITableDefinition,
  ],
};

describe("QBase", () => {
  // todo make it work with

  test("insert/select Query", async () => {
    const db = createStore(schema);
    const selectQuery = getSelect(db, [
      Q.SELECT,
      "Viewports",
      { columns: ["id"] },
    ]);
    const preInsertSelectResults = selectQuery();
    const insertQuery = getInsert(db, [
      Q.INSERT,
      "Viewports",
      [{ id: "viewport1" }],
    ]);
    insertQuery();
    const postInsertSelectResults = selectQuery();
    expect(preInsertSelectResults.length).toBe(0);
    expect(postInsertSelectResults.length).toBe(1);
  });

  test("relationships MTM Query", async () => {
    const db = createStore(schema);
    const selectQuery = getSelect(db, [
      Q.SELECT,
      "Viewports",
      { columns: ["id"], includes: ["masters"] },
    ]);
    const preInsertSelectResults = selectQuery();
    const insertMQuery = getInsert(db, [
      Q.INSERT,
      "Masters",
      [{ id: "master1" }],
    ]);
    const insertVQuery = getInsert(db, [
      Q.INSERT,
      "Viewports",
      [{ id: "viewport1" }],
    ]);
    const insertMVJunctionQuery = getInsert(db, [
      Q.INSERT,
      "MasterViewportJunction",
      [
        {
          id: "master1.viewport1",
          masterId: "master1",
          viewportId: "viewport1",
        },
      ],
    ]);
    insertMQuery();
    insertVQuery();
    insertMVJunctionQuery();
    const postInsertSelectResults = selectQuery();
    console.log(preInsertSelectResults);
    console.log(JSON.stringify(postInsertSelectResults, null, 2));
    expect(preInsertSelectResults.length).toBe(0);
    expect(postInsertSelectResults.length).toBe(1);
  });
});
