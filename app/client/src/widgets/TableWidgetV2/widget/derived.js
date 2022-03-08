/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars*/
export default {
  getSelectedRow: (props, moment, _) => {
    let index = -1;

    /*
     * If multiRowSelection is turned on, use the last index to
     * populate the selectedRowIndex
     */
    if (props.multiRowSelection) {
      if (
        _.isArray(props.selectedRowIndices) &&
        props.selectedRowIndices.length &&
        props.selectedRowIndices.every((i) => _.isNumber(i))
      ) {
        index = props.selectedRowIndices[props.selectedRowIndices.length - 1];
      } else if (_.isNumber(props.selectedRowIndices)) {
        index = props.selectedRowIndices;
      }
    } else if (
      !_.isNil(props.selectedRowIndex) &&
      !_.isNaN(parseInt(props.selectedRowIndex))
    ) {
      index = parseInt(props.selectedRowIndex);
    }

    const rows = props.filteredTableData || props.processedTableData || [];
    let selectedRow;

    /*
     * Note(Balaji): Need to include customColumn values in the selectedRow (select, rating)
     * It should have updated values.
     */
    if (index > -1) {
      selectedRow = { ...rows[index] };
    } else {
      /*
       *  If index is not a valid, selectedRow should have
       *  proper row structure with empty string values
       */
      selectedRow = {};
      Object.keys(rows[0]).forEach((key) => {
        selectedRow[key] = "";
      });
    }

    const keysToBeOmitted = ["__originalIndex__", "__primaryKey__"];

    return _.omit(selectedRow, keysToBeOmitted);
  },
  //
  getTriggeredRow: (props, moment, _) => {
    let index = -1;
    const parsedTriggeredRowIndex = parseInt(props.triggeredRowIndex);

    if (!_.isNaN(parsedTriggeredRowIndex)) {
      index = parsedTriggeredRowIndex;
    }

    const rows = props.filteredTableData || props.processedTableData || [];
    let triggeredRow;

    /*
     * Note(Balaji): Need to include customColumn values in the triggeredRow (select, rating)
     * It should have updated values.
     */
    if (index > -1) {
      triggeredRow = { ...rows[index] };
    } else {
      /*
       *  If triggeredRowIndex is not a valid index, triggeredRow should
       *  have proper row structure with empty string values
       */
      triggeredRow = {};
      Object.keys(rows[0]).forEach((key) => {
        triggeredRow[key] = "";
      });
    }

    const keysToBeOmitted = ["__originalIndex__", "__primaryKey__"];

    return _.omit(triggeredRow, keysToBeOmitted);
  },
  //
  getSelectedRows: (props, moment, _) => {
    let indices = [];

    if (
      _.isArray(props.selectedRowIndices) &&
      props.selectedRowIndices.every((i) => _.isNumber(i))
    ) {
      indices = props.selectedRowIndices;
    }

    const rows = props.filteredTableData || props.processedTableData || [];
    const keysToBeOmitted = ["__originalIndex__", "__primaryKey__"];

    return indices.map((index) => _.omit(rows[index], keysToBeOmitted));
  },
  //
  getPageSize: (props, moment, _) => {
    /*
     * TODO(Balaji): Refactor this
     */
    const TABLE_SIZES = {
      DEFAULT: {
        COLUMN_HEADER_HEIGHT: 32,
        TABLE_HEADER_HEIGHT: 38,
        ROW_HEIGHT: 40,
        ROW_FONT_SIZE: 14,
      },
      SHORT: {
        COLUMN_HEADER_HEIGHT: 32,
        TABLE_HEADER_HEIGHT: 38,
        ROW_HEIGHT: 20,
        ROW_FONT_SIZE: 12,
      },
      TALL: {
        COLUMN_HEADER_HEIGHT: 32,
        TABLE_HEADER_HEIGHT: 38,
        ROW_HEIGHT: 60,
        ROW_FONT_SIZE: 18,
      },
    };
    const compactMode = props.compactMode || "DEFAULT";
    const componentHeight =
      (props.bottomRow - props.topRow) * props.parentRowSpace - 10;
    const tableSizes = TABLE_SIZES[compactMode];
    let pageSize = Math.floor(
      (componentHeight -
        tableSizes.TABLE_HEADER_HEIGHT -
        tableSizes.COLUMN_HEADER_HEIGHT) /
        tableSizes.ROW_HEIGHT,
    );
    if (
      componentHeight -
        (tableSizes.TABLE_HEADER_HEIGHT +
          tableSizes.COLUMN_HEADER_HEIGHT +
          tableSizes.ROW_HEIGHT * pageSize) >
      0
    ) {
      pageSize += 1;
    }
    return pageSize;
  },
  //
  getProcessedTableData: (props, moment, _) => {
    /*
     * TODO(Balaji): We need to take the inline edited cells and custom column values
     * from meta and inject that into sanitised data
     */
    let data;

    if (_.isArray(props.tableData)) {
      data = props.tableData;
    } else {
      data = [];
    }

    return data;
  },
  //
  getOrderedTableColumns: (props, moment, _) => {
    let columns = [];
    let existingColumns = props.primaryColumns || {};

    /*
     * Assign index based on the columnOrder
     */
    if (
      _.isArray(props.columnOrder) &&
      props.columnOrder.length > 0 &&
      Object.keys(existingColumns).length > 0
    ) {
      const newColumnsInOrder = {};
      let index = 0;

      _.uniq(props.columnOrder).forEach((columnId) => {
        if (existingColumns[columnId]) {
          newColumnsInOrder[columnId] = Object.assign(
            {},
            existingColumns[columnId],
            {
              index,
            },
          );

          index++;
        }
      });

      existingColumns = newColumnsInOrder;
    }

    const sortByColumn = props.sortOrder && props.sortOrder.column;
    const isAscOrder = props.sortOrder && props.sortOrder.order === "asc";
    /* set sorting flags and convert the existing columns into an array */
    Object.values(existingColumns).forEach((column) => {
      /* guard to not allow columns without id */
      if (column.id) {
        column.isAscOrder = column.id === sortByColumn ? isAscOrder : undefined;
        columns.push(column);
      }
    });

    return columns;
  },
  //
  getFilteredTableData: (props, moment, _) => {
    /* Make a shallow copy */
    const primaryColumns = props.primaryColumns || {};
    let processedTableData = [...props.processedTableData];
    const derivedColumns = {};

    Object.keys(primaryColumns).forEach((id) => {
      if (primaryColumns[id] && primaryColumns[id].isDerived) {
        derivedColumns[id] = primaryColumns[id];
      }
    });

    if (!processedTableData || !processedTableData.length) {
      return [];
    }

    /* extend processedTableData with values from
     *  - computedValues, in case of normal column
     *  - empty values, in case of derived column
     */
    if (primaryColumns && _.isPlainObject(primaryColumns)) {
      Object.entries(primaryColumns).forEach(([id, column]) => {
        let computedValues = [];

        if (column && column.computedValue) {
          if (_.isString(column.computedValue)) {
            try {
              computedValues = JSON.parse(column.computedValue);
            } catch (e) {
              console.error(
                e,
                "Error parsing column computedValue: ",
                column.computedValue,
              );
            }
          } else if (_.isArray(column.computedValue)) {
            computedValues = column.computedValue;
          }
        }

        /* for derived columns inject empty strings */
        if (
          computedValues.length === 0 &&
          derivedColumns &&
          derivedColumns[id]
        ) {
          computedValues = Array(processedTableData.length).fill("");
        }

        computedValues.forEach((computedValue, index) => {
          processedTableData[index] = {
            ...processedTableData[index],
            [column.alias]: computedValue,
          };
        });
      });
    }

    /* Populate meta keys (__originalIndex__, __primaryKey__) */
    processedTableData = processedTableData.map((row, index) => ({
      ...row,
      __originalIndex__: index,
      __primaryKey__: props.primaryColumnId
        ? row[props.primaryColumnId]
        : undefined,
    }));

    const columns = props.orderedTableColumns;
    const sortByColumnId = props.sortOrder.column;

    let sortedTableData;

    if (sortByColumnId) {
      const sortBycolumn = columns.find(
        (column) => column.id === sortByColumnId,
      );
      const sortByColumnOriginalId = sortBycolumn.originalId;

      const columnType =
        sortBycolumn && sortBycolumn.columnType
          ? sortBycolumn.columnType
          : "text";
      const inputFormat = sortBycolumn.inputFormat;
      const isEmptyOrNil = (value) => {
        return _.isNil(value) || value === "";
      };
      const isAscOrder = props.sortOrder.order === "asc";
      const sortByOrder = (isAGreaterThanB) => {
        if (isAGreaterThanB) {
          return isAscOrder ? 1 : -1;
        } else {
          return isAscOrder ? -1 : 1;
        }
      };

      sortedTableData = processedTableData.sort((a, b) => {
        if (_.isPlainObject(a) && _.isPlainObject(b)) {
          if (
            isEmptyOrNil(a[sortByColumnOriginalId]) ||
            isEmptyOrNil(b[sortByColumnOriginalId])
          ) {
            /* push null, undefined and "" values to the bottom. */
            return isEmptyOrNil(a[sortByColumnOriginalId]) ? 1 : -1;
          } else {
            switch (columnType) {
              case "number":
                return sortByOrder(
                  Number(a[sortByColumnOriginalId]) >
                    Number(b[sortByColumnOriginalId]),
                );
              case "date":
                try {
                  return sortByOrder(
                    moment(a[sortByColumnOriginalId], inputFormat).isAfter(
                      moment(b[sortByColumnOriginalId], inputFormat),
                    ),
                  );
                } catch (e) {
                  return -1;
                }
              default:
                return sortByOrder(
                  a[sortByColumnOriginalId].toString().toLowerCase() >
                    b[sortByColumnOriginalId].toString().toLowerCase(),
                );
            }
          }
        } else {
          return isAscOrder ? 1 : 0;
        }
      });
    } else {
      sortedTableData = [...processedTableData];
    }

    const ConditionFunctions = {
      isExactly: (a, b) => {
        return a.toString() === b.toString();
      },
      empty: (a) => {
        return _.isNil(a) || _.isEmpty(a.toString());
      },
      notEmpty: (a) => {
        return !_.isNil(a) && _.isEmpty(a.toString());
      },
      notEqualTo: (a, b) => {
        return a.toString() !== b.toString();
      },
      /* Note: Duplicate of isExactly */
      isEqualTo: (a, b) => {
        return a.toString() === b.toString();
      },
      lessThan: (a, b) => {
        return Number(a) < Number(b);
      },
      lessThanEqualTo: (a, b) => {
        return Number(a) <= Number(b);
      },
      greaterThan: (a, b) => {
        return Number(a) > Number(b);
      },
      greaterThanEqualTo: (a, b) => {
        return Number(a) >= Number(b);
      },
      contains: (a, b) => {
        try {
          return a
            .toString()
            .toLowerCase()
            .includes(b.toString().toLowerCase());
        } catch (e) {
          return false;
        }
      },
      doesNotContain: (a, b) => {
        try {
          return !a
            .toString()
            .toLowerCase()
            .includes(b.toString().toLowerCase());
        } catch (e) {
          return false;
        }
      },
      startsWith: (a, b) => {
        try {
          return (
            a
              .toString()
              .toLowerCase()
              .indexOf(b.toString().toLowerCase()) === 0
          );
        } catch (e) {
          return false;
        }
      },
      endsWith: (a, b) => {
        try {
          const _a = a.toString().toLowerCase();
          const _b = b.toString().toLowerCase();

          return _a.length === _a.lastIndexOf(_b) + _b.length;
        } catch (e) {
          return false;
        }
      },
      is: (a, b) => {
        return moment(a).isSame(moment(b), "minute");
      },
      isNot: (a, b) => {
        return !moment(a).isSame(moment(b), "minute");
      },
      isAfter: (a, b) => {
        return moment(a).isAfter(moment(b), "minute");
      },
      isBefore: (a, b) => {
        return moment(a).isBefore(moment(b), "minute");
      },
    };
    let searchKey;

    /* skipping search when client side search is turned off */
    if (
      props.searchText &&
      (!props.onSearchTextChanged || props.enableClientSideSearch)
    ) {
      searchKey = props.searchText.toLowerCase();
    } else {
      searchKey = "";
    }

    const finalTableData = sortedTableData.filter((row) => {
      let isSearchKeyFound = true;

      if (searchKey) {
        isSearchKeyFound = Object.values(row)
          .join(", ")
          .toLowerCase()
          .includes(searchKey);
      }

      if (!isSearchKeyFound) {
        return false;
      }

      /* when there is no filter defined */
      if (!props.filters || props.filters.length === 0) {
        return true;
      }

      const filterOperator =
        props.filters.length >= 2 ? props.filters[1].operator : "OR";
      let isSatisfyingFilters = filterOperator === "AND";
      for (let i = 0; i < props.filters.length; i++) {
        let filterResult = true;
        try {
          const conditionFunction =
            ConditionFunctions[props.filters[i].condition];
          if (conditionFunction) {
            filterResult = conditionFunction(
              row[props.filters[i].column],
              props.filters[i].value,
            );
          }
        } catch (e) {
          filterResult = false;
        }

        /* if one filter condition is not satisfied and filter operator is AND, bailout early */
        if (!filterResult && filterOperator === "AND") {
          isSatisfyingFilters = false;
          break;
        } else if (filterResult && filterOperator === "OR") {
          /* if one filter condition is satisfied and filter operator is OR, bailout early */
          isSatisfyingFilters = true;
          break;
        }

        isSatisfyingFilters =
          filterOperator === "AND"
            ? isSatisfyingFilters && filterResult
            : isSatisfyingFilters || filterResult;
      }

      return isSatisfyingFilters;
    });

    return finalTableData;
  },
  //
};