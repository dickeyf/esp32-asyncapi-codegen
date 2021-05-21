import { File } from '@asyncapi/generator-react-sdk';
import { normalizeSchemaName } from '../helpers/normalizeSchemaName';

/*
 * To render multiple files, it is enough to return an array of "File" components in the rendering component, like in following example.
 */
export default function({ asyncapi, params }) {
  const schemas = asyncapi.allSchemas();
  // schemas is an instance of the Map

  let arr = Array.from(schemas).map(([schemaName, schema]) => {
    const name = normalizeSchemaName(schemaName);
    return [(
      <File name={`${name}Schema.c`}>
        <SchemaCFile schemaName={name} schema={schema} />
      </File>),(
      <File name={`${name}Schema.h`}>
        <SchemaHFile schemaName={name} schema={schema} />
      </File>
    )];
  });

  return [(
      <File name={`CMakeLists.txt`}>
        <CMakeLists schemas={schemas} />
      </File>)].concat(...arr);
}

function generate_common_json_parse() {
  return `
static cJSON* read_json(const char* jsonPayload, const char** error_msg) {
  *error_msg = NULL;
  cJSON* json = cJSON_Parse(jsonPayload);
  
  if (!json) {
    *error_msg = "Failed to parse request as JSON.";
    return NULL;
  }
  
  return json;
}
`
}

function numberGen(schemaName, schema) {
  return `
cJSON* create_${schemaName}Schema(double value) {
  return cJSON_CreateNumber( value);
}

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, double* output, const char** error_msg) {
  if (!cJSON_IsNumber(json)) {
    *error_msg = "Failed to parse request: expected a JSON number value (double expected).";
    return ESP_FAIL;
  }

  *output = cJSON_GetNumberValue(json);
  return ESP_OK;
}

esp_err_t read_${schemaName}Schema(const char* jsonPayload, double* output, const char** error_msg) {
  cJSON* json = read_json(jsonPayload, error_msg);
  if (json == NULL) {
    return ESP_FAIL;
  }

  esp_err_t result = unmarshal_${schemaName}Schema(json, output, error_msg);
  cJSON_Delete(json);
  return result;
}`;
}

function integerGen(schemaName, schema) {
  return `
cJSON* create_${schemaName}Schema(int value) {
  return cJSON_CreateNumber( value);
}

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, int* output, const char** error_msg) {
  if (!cJSON_IsNumber(json)) {
    *error_msg = "Failed to parse request: expected a JSON number value (integer expected).";
    return ESP_FAIL;
  }

  *output = (int)cJSON_GetNumberValue(json);
  return ESP_OK;
}

esp_err_t read_${schemaName}Schema(const char* jsonPayload, int* output, const char** error_msg) {
  cJSON* json = read_json(jsonPayload, error_msg);
  if (json == NULL) {
    return ESP_FAIL;
  }

  esp_err_t result = unmarshal_${schemaName}Schema(json, output, error_msg);
  cJSON_Delete(json);
  return result;
}`;
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

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, struct ${schemaName}** output, const char** error_msg) {
  if (!cJSON_IsObject(json)) {
    *error_msg = "Failed to parse request: expected a JSON object (${schemaName} expected).";
    return ESP_FAIL;
  }
  
  *output = malloc(sizeof(struct ${schemaName}));
  (*output)->jsonObj = NULL;
  esp_err_t result;
`

  Object.keys(schema.properties()).forEach(propName => {
    let prop = schema.property(propName);
    content += `
  // Unmarshal Property ${propName} of ${schemaName} (Type: ${prop.type()})
  if (!cJSON_HasObjectItem(json, "${propName}")) {
    free(*output);
    *error_msg = "The ${propName} field is missing from the request.";
    return ESP_FAIL;
  }
  result = unmarshal_${normalizeSchemaName(prop.uid())}Schema(cJSON_GetObjectItem(json, "${propName}"), 
                             &((*output)->${normalizeSchemaName(propName)}), 
                             error_msg);
  if (result != ESP_OK) {
    free(*output);
    return result; 
  }
`
  });

  content += `
  return ESP_OK;
}

esp_err_t read_${schemaName}Schema(const char* jsonPayload, struct ${schemaName}** output, const char** error_msg) {
  cJSON* json = read_json(jsonPayload, error_msg);
  if (json == NULL) {
    return ESP_FAIL;
  }

  esp_err_t result = unmarshal_${schemaName}Schema(json, output, error_msg);
  
  if (result != ESP_OK) {
    cJSON_Delete(json);
  } else {
    (*output)->jsonObj = json;
  }

  return result;
}

void free_${schemaName}Schema(struct ${schemaName}* output) {
  if (output->jsonObj != NULL) {
    cJSON_Delete(output->jsonObj);
  }
`
    Object.keys(schema.properties()).forEach(propName => {
    let prop = schema.property(propName);
    if (prop.type() === "object") {
      content += `
  free_${normalizeSchemaName(prop.uid())}Schema(output->${normalizeSchemaName(propName)});
`;
    }
});
content +=` 
  free(output);
}
`;

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
  return `
cJSON* create_${schemaName}Schema(bool value) {
  return cJSON_CreateBool( value);
}

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, bool* output, const char** error_msg) {
  if (!cJSON_IsBool(json)) {
    *error_msg = "Failed to parse request: expected a JSON boolean value.";
    return ESP_FAIL;
  }

  *output = cJSON_IsTrue(json);
  return ESP_OK;
}

esp_err_t read_${schemaName}Schema(const char* jsonPayload, bool* output, const char** error_msg) {
  cJSON* json = read_json(jsonPayload, error_msg);
  if (json == NULL) {
    return ESP_FAIL;
  }

  esp_err_t result = unmarshal_${schemaName}Schema(json, output, error_msg);
  cJSON_Delete(json);
  return result;
}`;
}

function stringGen(schemaName, schema) {
  return `
cJSON* create_${schemaName}Schema(const char * value) {
  return cJSON_CreateString( value);
}

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, const char** output, const char** error_msg) {
  if (!cJSON_IsString(json)) {
    *error_msg = "Failed to parse request: expected a JSON string value.";
    return ESP_FAIL;
  }

  *output = cJSON_GetStringValue(json);
  return ESP_OK;
}

esp_err_t read_${schemaName}Schema(const char* jsonPayload, int bufLen, char* output, const char** error_msg) {
  cJSON* json = read_json(jsonPayload, error_msg);
  if (json == NULL) {
    return ESP_FAIL;
  }

  char* stringFromJson;
  esp_err_t result = unmarshal_${schemaName}Schema(json, &stringFromJson, error_msg);
  if (result == ESP_OK) {
    strncpy(output, stringFromJson, bufLen);
  }
  cJSON_Delete(json);
  return result;
}`
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
esp_err_t unmarshal_${schemaName}Schema(cJSON* json, int* output, const char** error_msg);
esp_err_t read_${schemaName}Schema(const char* jsonPayload, int* output, const char** error_msg);
cJSON* create_${schemaName}Schema(int value);`
      break;
    case "number":
      content += `
esp_err_t unmarshal_${schemaName}Schema(cJSON* json, double* output, const char** error_msg);
esp_err_t read_${schemaName}Schema(const char* jsonPayload, double* output, const char** error_msg);
cJSON* create_${schemaName}Schema(double value);`
      break;
    case "boolean":
      content += `
esp_err_t unmarshal_${schemaName}Schema(cJSON* json, bool* output, const char** error_msg);
esp_err_t read_${schemaName}Schema(const char* jsonPayload, bool* output, const char** error_msg);
cJSON* create_${schemaName}Schema(bool value);`
      break;
    case "array":
      content += `
cJSON* create_${schemaName}Schema();`
      break;
    case "object":
      content += `
struct ${schemaName} {
  cJSON* jsonObj;`
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
  struct ${propSchemaName}* ${normalizeSchemaName(propName)};
`
            break;
        }
      });

      content += `
};

esp_err_t unmarshal_${schemaName}Schema(cJSON* json, struct ${schemaName}** output, const char** error_msg);

// This function will allocate a structure and store its pointer where output points to.
// To free up memory allocated, pass the pointer back via free_${schemaName}Schema
esp_err_t read_${schemaName}Schema(const char* jsonPayload, struct ${schemaName}** output, const char** error_msg);
// Free all memory allocated by the read function
void free_${schemaName}Schema(struct ${schemaName}* output);
cJSON* create_${schemaName}Schema(const struct ${schemaName}* value);`
      break;
    case "string":
      content += `
esp_err_t unmarshal_${schemaName}Schema(cJSON* json, const char** output, const char** error_msg);
esp_err_t read_${schemaName}Schema(const char* jsonPayload, int bufLen, char* output, const char** error_msg);
cJSON* create_${schemaName}Schema(const char* value);`
      break;
  }

  return content;
}


function buildIncludeList(schemaName, schema) {
  let includeFiles = {};
  let content = `
#include <stdio.h>
#include <string.h>
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
#include <esp_err.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif
`;

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

  content += generate_common_json_parse();
  content += schemaGen(schemaName, schema);

  return content;
}

function CMakeLists({schemas}) {
  let content = `
idf_component_register(SRCS 
`;

  Array.from(schemas).map(([schemaName, schema]) => {
    const name = normalizeSchemaName(schemaName);
    content += "      " + name + "Schema.c\n";
  });

  content += `      REQUIRES json
      INCLUDE_DIRS .)`;

  return content;
}
