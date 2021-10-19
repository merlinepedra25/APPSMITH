import { camelCase, cloneDeep, difference, remove, startCase } from "lodash";
import {
  DATA_TYPE_POTENTIAL_FIELD,
  DataType,
  FIELD_MAP,
  FieldType,
  Schema,
  SchemaItem,
} from "./constants";

type Obj = Record<string, any>;
type JSON = Obj | Obj[];

// TODO: CHANGE NAME
type ObjectToSchemaProps = {
  currFormData?: JSON;
  prevSchema?: Schema;
};

/**
 *
 * This method takes in array of object and squishes every object in the
 * array into single object thus making sure that all the keys are
 * in single object.
 *
 * @example
 *  Input - [{ firstName: "John", age: 20 }, { lastName: "Doe", age: 30 }]
 *  Output - { firstName: "John", age: 20, lastName: "Doe" }
 */

// TODO: Improve logic to look into all the array items to get the proper object
export const constructPlausibleObjectFromArray = (arrayOfObj: Obj[]) => {
  let plausibleObj = {};

  arrayOfObj.forEach((obj) => {
    plausibleObj = {
      ...plausibleObj,
      ...obj,
    };
  });

  return plausibleObj;
};

export const dataTypeFor = (value: any) => {
  const typeOfValue = typeof value;
  if (Array.isArray(value)) return DataType.ARRAY;

  return typeOfValue as DataType;
};

export const subDataTypeFor = (value: any) => {
  const dataType = dataTypeFor(value);

  if (dataType === DataType.ARRAY) {
    return dataTypeFor(value[0]);
  }

  return undefined;
};

export const normalizeArrayValue = (data: Obj[]) => {
  if (subDataTypeFor(data) === DataType.OBJECT) {
    return constructPlausibleObjectFromArray(data);
  }

  return data[0];
};

export const fieldTypeFor = (value: any) => {
  const dataType = dataTypeFor(value);
  const fieldType = DATA_TYPE_POTENTIAL_FIELD[dataType].default;
  const subDataType = subDataTypeFor(value);

  if (subDataType) {
    switch (subDataType) {
      case DataType.STRING:
      case DataType.NUMBER:
        return FieldType.MULTI_SELECT;
      default:
        return FieldType.ARRAY;
    }
  }

  return fieldType;
};

class SchemaParser {
  static nameAndLabel = (key: string) => {
    const name = key === "__array_item__" ? key : camelCase(key);

    return {
      name,
      label: startCase(key),
    };
  };

  static parse = (currFormData?: JSON, schema: Schema = {}) => {
    if (!currFormData) return schema;

    const prevSchema = (() => {
      const rootSchemaItem = schema.__root_schema__;
      if (rootSchemaItem) return rootSchemaItem.children;

      return {};
    })();

    const rootSchemaItem = SchemaParser.getSchemaItemFor("", currFormData, {
      currFormData,
      prevSchema,
    });

    return {
      __root_schema__: rootSchemaItem,
    };
  };

  // TODO: add eg
  static getSchemaItemFor = (
    key: string,
    value: any,
    passedOptions: ObjectToSchemaProps = {},
  ): SchemaItem => {
    const dataType = dataTypeFor(value);
    const fieldType = fieldTypeFor(value);
    const FieldComponent = FIELD_MAP[fieldType];
    const { label, name } = SchemaParser.nameAndLabel(key);
    const props = {
      ...FieldComponent.componentDefaultValues,
    };

    let children: Schema = {};
    if (dataType === DataType.OBJECT) {
      children = SchemaParser.convertObjectToSchema(passedOptions);
    }

    if (dataType === DataType.ARRAY) {
      children = SchemaParser.convertArrayToSchema(passedOptions);
    }

    return {
      props,
      dataType,
      name,
      label,
      fieldType,
      children,
    };
  };

  static getModifiedSchemaItemFor = (
    currData: JSON,
    schemaItem: SchemaItem,
  ) => {
    let { children } = schemaItem;
    const { dataType } = schemaItem;

    const options = {
      currFormData: currData,
      prevSchema: children,
    };

    if (dataType === DataType.OBJECT) {
      children = SchemaParser.convertObjectToSchema(options);
    }

    if (dataType === DataType.ARRAY) {
      children = SchemaParser.convertArrayToSchema(options);
    }

    return {
      ...schemaItem,
      children,
    };
  };

  static convertArrayToSchema = ({
    currFormData = [],
    prevSchema = {},
  }: ObjectToSchemaProps): Schema => {
    const schema = cloneDeep(prevSchema);
    // TODO: FIX "as any"
    const currData = normalizeArrayValue(currFormData as any[]);

    const prevDataType = schema?.__array_item__?.dataType;
    const currDataType = typeof currData;

    if (currDataType !== prevDataType) {
      schema.__array_item__ = SchemaParser.getSchemaItemFor(
        "__array_item__",
        currData,
        {
          currFormData: currData,
        },
      );
    } else {
      schema.__array_item__ = SchemaParser.getModifiedSchemaItemFor(
        currData,
        schema.__array_item__,
      );
    }

    return schema;
  };

  static convertObjectToSchema = ({
    currFormData = {},
    prevSchema = {},
  }: ObjectToSchemaProps): Schema => {
    const schema = cloneDeep(prevSchema);
    const currObj = currFormData as Obj;

    const currKeys = Object.keys(currFormData);
    const prevKeys = Object.keys(prevSchema);

    const newKeys = difference(currKeys, prevKeys);
    const removedKeys = difference(prevKeys, currKeys);
    const modifiedKeys = difference(currKeys, newKeys.concat(removedKeys));

    // // schema -> [{ name: 'name', props: {}, ... }, { name: 'age', props: {}, ... } ]
    // // returns -> { name: 0, age: 1 }
    // const schemaItemNameToIndexMap = schema.reduce<Record<string, number>>(
    //   (idxMap, schemaItem, index) => {
    //     idxMap[schemaItem.name] = index;

    //     return idxMap;
    //   },
    //   {},
    // );

    modifiedKeys.forEach((modifiedKey) => {
      // const index = schemaItemNameToIndexMap[modifiedKey];

      const currDataType = typeof currObj[modifiedKey];
      const prevDataType = schema[modifiedKey].dataType;

      // TODO: Fix nested object update, modified objects type would
      // be same so the following block won't run.
      if (currDataType !== prevDataType) {
        schema[modifiedKey] = SchemaParser.getSchemaItemFor(
          modifiedKey,
          currObj[modifiedKey],
          {
            currFormData: currObj[modifiedKey],
            prevSchema: schema[modifiedKey].children,
          },
        );
        // TODO: CHECK FOR PRIMITIVE DATA TYPE
      } else {
        schema[modifiedKey] = SchemaParser.getModifiedSchemaItemFor(
          currObj[modifiedKey],
          schema[modifiedKey],
        );
      }
    });

    newKeys.forEach((newKey) => {
      schema[newKey] = SchemaParser.getSchemaItemFor(newKey, currObj[newKey], {
        currFormData: currObj[newKey],
      });
    });

    // schema -> [{ name: 'name', props: {}, ... }, { name: 'age', props: {}, ... } ]
    // removedKey = age
    // schema becomes -> [{ name: 'name', props: {}, ... }]
    removedKeys.forEach((removedKey) => {
      delete schema[removedKey];
    });

    return schema;
  };
}

export default SchemaParser;
