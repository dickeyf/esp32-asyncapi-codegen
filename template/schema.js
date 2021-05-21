import { File } from '@asyncapi/generator-react-sdk';
import { normalizeSchemaName } from '../helpers/normalizeSchemaName';

const outputdir = "esp32-mqtt/main/";

/*
 * To render multiple files, it is enough to return an array of "File" components in the rendering component, like in following example.
 */
export default function({ asyncapi }) {
  const schemas = asyncapi.allSchemas();
  // schemas is an instance of the Map

  const fs = require('fs');
  let dir = outputdir + 'events/schemas';

  if (!fs.existsSync("output/" + dir)){
    fs.mkdirSync("output/" + dir, { recursive: true });
  }

  let arr = Array.from(schemas).map(([schemaName, schema]) => {
    const name = normalizeSchemaName(schemaName);
    return [(
      <File name={dir + `/${name}Schema.c`}>
        <SchemaCFile schemaName={name} schema={schema} />
      </File>),(
      <File name={dir + `/${name}Schema.h`}>
        <SchemaHFile schemaName={name} schema={schema} />
      </File>
    )];
  });

  return [].concat(...arr);
}

function numberGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema(double value) {
  return cJSON_CreateNumber( value);
}
`

  return content;
}

function integerGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema(int value) {
  return cJSON_CreateNumber( value);
}
`

  return content;
}


function propGen(schemaName, schema, propName, prop) {

  let content = `
  // Property ${propName} of ${schemaName} (Type: ${prop.type()})
  cJSON_AddItemToObject( object_${schemaName}, "${propName}",
    create_${normalizeSchemaName(prop.uid())}Schema( value->${normalizeSchemaName(propName)})); 
`
  return content;
}

function objectGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema(const struct ${schemaName}* value) {
  cJSON* object_${schemaName} = cJSON_CreateObject();
`

  Object.keys(schema.properties()).forEach(propName => {
    content += propGen(schemaName, schema, propName, schema.property(propName))
  });

  content += `
  return object_${schemaName};
}
`

  return content;
}

function arrayGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema() {
  cJSON* array_${schemaName} = cJSON_CreateArray();
  return array_${schemaName};
}
`
  return content;
}

function booleanGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema(bool value) {
  return cJSON_CreateBool( value);
}
`
  return content;
}

function stringGen(schemaName, schema) {
  let content = `
cJSON* create_${schemaName}Schema(const char * value) {
  return cJSON_CreateString( value);
}
`
  return content;
}

function schemaGen(schemaName, schema) {
  let content = "";

  // integer array object string number
  switch (schema.type()) {
    case "integer":
      content += integerGen(schemaName, schema);
    break;
    case "array":
      content += arrayGen(schemaName, schema);
    break;
    case "object":
      content += objectGen(schemaName, schema);
    break;
    case "string":
      content += stringGen(schemaName, schema);
    break;
    case "boolean":
      content += booleanGen(schemaName, schema);
    break;
    case "number":
      content += numberGen(schemaName, schema);
    break;
  }

  return content;
}

function schemaDefGen(schemaName, schema) {
  let content = "";

  switch (schema.type()) {
    case "integer":
      content += `
cJSON* create_${schemaName}Schema(int value);`
      break;
    case "number":
      content += `
cJSON* create_${schemaName}Schema(double value);`
      break;
    case "boolean":
      content += `
cJSON* create_${schemaName}Schema(bool value);`
      break;
    case "array":
      content += `
cJSON* create_${schemaName}Schema();`
      break;
    case "object":
      content += `
struct ${schemaName} {`

      Object.keys(schema.properties()).forEach(propName => {
        const property = schema.property(propName);
        switch(property.type()) {
          case "integer":
            content += `
  int ${normalizeSchemaName(propName)};`;
            break;
          case "number":
            content += `
  double ${normalizeSchemaName(propName)};`;
            break;
          case "string":
            content += `
  const char* ${normalizeSchemaName(propName)};`;
            break;
          case "boolean":
            content += `
  bool ${normalizeSchemaName(propName)};`;
            break;
          case "array":
            content += `
  void* ${normalizeSchemaName(propName)};  // NOTE: Arrays not yet implemented, current behavior is to serialize as empty JSON array.`
            break;
          case "object":
            const propSchemaName = normalizeSchemaName(property.uid());
            content += `
  struct ${propSchemaName}* ${normalizeSchemaName(propName)};`
            break;
        }
      });

      content += `
};

cJSON* create_${schemaName}Schema(const struct ${schemaName}* value);`
      break;
    case "string":
      content += `
cJSON* create_${schemaName}Schema(const char* value);`
      break;
  }

  return content;
}


function buildIncludeList(schemaName, schema) {
  let includeFiles = {};
  let content = "";

  content += `
#include "${schemaName}Schema.h"`;

  if (schema.type() === "object") {
    Object.keys(schema.properties()).forEach(propName => {
      const prop = schema.property(propName);
      const currentPropSchemaName = normalizeSchemaName(prop.uid());
      includeFiles[currentPropSchemaName] = currentPropSchemaName+"Schema";
    });

    Object.keys(includeFiles).forEach(propSchemaName => {
      content += `
#include "${propSchemaName}Schema.h"`;
    })
  }

  content += `
`;

  return content;
}

function SchemaHFile({ schemaName, schema }) {
  let content = `#include "cjson.h"
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif`;

  content += schemaDefGen(schemaName, schema);

  content += `
#ifdef __cplusplus
}
#endif`

  return content;
}


function SchemaCFile({ schemaName, schema }) {
  let content = "";

  content += buildIncludeList(schemaName, schema);

  content += schemaGen(schemaName, schema);

  return content;
}
