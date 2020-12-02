import { useState, useEffect } from "react";
import { IQBase, ISelectCriterion, Q, ISelectQuery } from "./types";
import { getSelect } from "./queries";
import { observe } from "./watch";
export function useQbaseSelect(
  db: IQBase,
  tableName: string,
  criterion?: ISelectCriterion
) {
  const [, setState] = useState(() => new Date());
  const query: ISelectQuery = [Q.SELECT, tableName, criterion];
  const selectQuery = getSelect(db, tableName, criterion);
  useEffect(() => {
    const unonbsv = observe(db, query, () => setState(new Date()));
    return () => {
      unonbsv();
    };
  });
  return selectQuery();
}
