import React from "react";
import { IQBase, ISelectCriterion, Q, ISelectQuery } from "./types";
import { getSelect } from "./queries";
import { observe } from "./watch";
export function useQbaseSelect(
  db: IQBase,
  tableName: string,
  criterion?: ISelectCriterion
) {
  const [, setState] = React.useState(() => new Date());
  const query: ISelectQuery = [Q.SELECT, tableName, criterion];
  const selectQuery = getSelect(db, tableName, criterion);
  React.useEffect(() => {
    const unonbsv = observe(db, query, () => setState(new Date()));
    return () => {
      unonbsv();
    };
  });
  return selectQuery();
}
