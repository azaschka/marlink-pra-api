const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const SPEC_PATH = path.join(ROOT, 'postman', 'specs', 'marlink-pra-api.json');
const COLLECTION_DIR = path.join(ROOT, 'postman', 'collections', 'Marlink PRA API v3.1.0');
const EXPORT_PATH = path.join(ROOT, 'postman', 'exports', 'Marlink PRA API v3.1.x.postman.collection.yaml');

const BASE_VARIABLES = {
  baseUrl: 'https://pra-api-pp.cdn-vas.net',
  accessKey: '',
  apiKey: '',
  jwtToken: '',
  tenantId: '1',
  transactionId: '',
};

const EXPLICIT_API_KEY_OPERATIONS = [
  {
    folder: 'access',
    name: 'Retrieve Access',
    method: 'GET',
    url: '{{baseUrl}}/access',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    queryParams: [
      { key: 'pageSize', value: '100', description: 'The number of items to include in a paginated response.', disabled: true },
      { key: 'pageNumber', value: '1', description: 'The 1-based index of the desired page.', disabled: true },
      { key: 'key', value: 'string', description: 'The key of the access.', disabled: true },
      { key: 'name', value: 'string', description: 'The name of the access.', disabled: true },
    ],
  },
  {
    folder: 'access',
    name: 'Create Access',
    method: 'POST',
    url: '{{baseUrl}}/access',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          key: 'ACCESS_KEY',
          name: 'Access Name',
          value: {
            businessUnits: ['MT'],
          },
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'access',
    name: 'Modify Access',
    method: 'PATCH',
    url: '{{baseUrl}}/access/{{id}}',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          key: 'ACCESS_KEY',
          name: 'Updated Access Name',
          value: {
            businessUnits: ['MT', 'OA'],
          },
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'access',
    name: 'Delete Access',
    method: 'DELETE',
    url: '{{baseUrl}}/access/{{id}}',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
  },
  {
    folder: 'auth',
    name: 'Auth Login',
    method: 'POST',
    url: '{{baseUrl}}/auth/login',
    headers: [{ key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' }],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          username: 'admin',
          password: 'password',
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'auth',
    name: 'Auth Profile',
    method: 'GET',
    url: '{{baseUrl}}/auth/profile',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
    ],
  },
  {
    folder: 'pra-users',
    name: 'Retrieve PRA Users',
    method: 'GET',
    url: '{{baseUrl}}/pra-users',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    queryParams: [
      { key: 'pageSize', value: '100', disabled: true },
      { key: 'pageNumber', value: '1', disabled: true },
      { key: 'id', value: '1', disabled: true },
      { key: 'username', value: 'string', disabled: true },
    ],
  },
  {
    folder: 'pra-users',
    name: 'Create PRA User',
    method: 'POST',
    url: '{{baseUrl}}/pra-users',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          username: 'string',
          password: 'string',
          email: 'user@example.com',
          role: 'Admin',
          displayName: 'User Display Name',
          businessUnit: 'MT',
          canManagePraUsers: true,
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'pra-users',
    name: 'Modify PRA User',
    method: 'PATCH',
    url: '{{baseUrl}}/pra-users/{{id}}',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          username: 'string',
          password: 'string',
          email: 'user@example.com',
          role: 'Admin',
          displayName: 'User Display Name',
          businessUnit: 'MT',
          canManagePraUsers: true,
          regeneratePassword: false,
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'pra-users',
    name: 'PRA User Forgot Password',
    method: 'POST',
    url: '{{baseUrl}}/pra-users/forgot-password',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
    body: {
      type: 'json',
      content: JSON.stringify(
        {
          email: 'user@example.com',
        },
        null,
        2,
      ),
    },
  },
  {
    folder: 'pra-users',
    name: 'Delete PRA User',
    method: 'DELETE',
    url: '{{baseUrl}}/pra-users/{{id}}',
    headers: [
      { key: 'X-API-Key', value: '{{apiKey}}', description: 'API key for internal PRA endpoints.' },
      { key: 'Authorization', value: 'Bearer {{jwtToken}}', description: 'JWT access token.' },
      {
        key: 'X-Transaction-Id',
        value: '{{transactionId}}',
        description: 'Optional identifier for tracing and correlating a transaction across services and logs.',
        disabled: true,
      },
    ],
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(text) {
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function segmentToFolderName(routePath) {
  const segment = routePath.replace(/^\//, '').split('/')[0] || 'app';
  return segment;
}

function openApiPathToUrlTemplate(routePath) {
  const converted = routePath.replace(/\{([A-Za-z0-9_]+)\}/g, '{{$1}}');
  return `{{baseUrl}}${converted === '' ? '/' : converted}`;
}

function buildPrimitivePlaceholder(schema) {
  if (!schema || typeof schema !== 'object') return 'string';
  if (Object.prototype.hasOwnProperty.call(schema, 'example')) return schema.example;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  switch (schema.type) {
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'string';
  }
}

function resolveSchema(schema, spec, seen = new Set()) {
  if (!schema) return {};

  if (schema.$ref) {
    const ref = schema.$ref;
    if (seen.has(ref)) return {};
    seen.add(ref);

    const refPath = ref.replace(/^#\//, '').split('/');
    let resolved = spec;
    for (const segment of refPath) {
      if (!resolved || typeof resolved !== 'object') return {};
      resolved = resolved[segment];
    }
    return resolveSchema(resolved, spec, seen);
  }

  if (schema.allOf && Array.isArray(schema.allOf)) {
    const merged = { type: 'object', properties: {}, required: [] };
    for (const part of schema.allOf) {
      const resolvedPart = resolveSchema(part, spec, new Set(seen));
      if (resolvedPart.properties) {
        Object.assign(merged.properties, resolvedPart.properties);
      }
      if (Array.isArray(resolvedPart.required)) {
        merged.required.push(...resolvedPart.required);
      }
    }
    merged.required = [...new Set(merged.required)];
    return merged;
  }

  return schema;
}

function schemaToExample(schema, spec, depth = 0) {
  if (!schema || depth > 4) return 'string';

  const resolved = resolveSchema(schema, spec);

  if (Object.prototype.hasOwnProperty.call(resolved, 'example')) {
    return resolved.example;
  }

  if (resolved.oneOf && Array.isArray(resolved.oneOf) && resolved.oneOf.length) {
    return schemaToExample(resolved.oneOf[0], spec, depth + 1);
  }

  if (resolved.anyOf && Array.isArray(resolved.anyOf) && resolved.anyOf.length) {
    return schemaToExample(resolved.anyOf[0], spec, depth + 1);
  }

  if (resolved.type === 'array') {
    return [schemaToExample(resolved.items || {}, spec, depth + 1)];
  }

  if (resolved.type === 'object' || resolved.properties) {
    const out = {};
    const properties = resolved.properties || {};
    const required = new Set(resolved.required || []);

    for (const [propName, propSchema] of Object.entries(properties)) {
      out[propName] = schemaToExample(propSchema, spec, depth + 1);
      if (!required.has(propName) && out[propName] === undefined) {
        out[propName] = buildPrimitivePlaceholder(propSchema);
      }
    }

    return out;
  }

  return buildPrimitivePlaceholder(resolved);
}

function varForHeader(headerName) {
  const byName = {
    'X-Access-Key': '{{accessKey}}',
    'X-API-Key': '{{apiKey}}',
    'X-Tenant-Id': '{{tenantId}}',
    'X-Transaction-Id': '{{transactionId}}',
  };
  return byName[headerName] || 'string';
}

function defaultValueForParam(param) {
  const schema = param.schema || {};

  if (param.in === 'path') return `{{${param.name}}}`;
  if (param.in === 'header') return varForHeader(param.name);

  if (Object.prototype.hasOwnProperty.call(schema, 'default')) return String(schema.default);
  if (Object.prototype.hasOwnProperty.call(schema, 'example')) return String(schema.example);
  if (Array.isArray(schema.enum) && schema.enum.length) return String(schema.enum[0]);

  if (schema.type === 'integer' || schema.type === 'number') return '1';
  if (schema.type === 'boolean') return 'false';

  return 'string';
}

function makeRequestName(method, routePath, operation) {
  const source = operation.summary || operation.operationId || `${method.toUpperCase()} ${routePath}`;
  return sanitizeFileName(titleCase(source));
}

function writeYamlFile(filePath, data) {
  fs.writeFileSync(filePath, yaml.dump(data, { sortKeys: false, noRefs: true, lineWidth: 120 }), 'utf8');
}

function generateCollectionFromSpec() {
  const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));

  fs.rmSync(COLLECTION_DIR, { recursive: true, force: true });
  ensureDir(path.join(COLLECTION_DIR, '.resources'));

  const folderMap = new Map();
  const variableSet = new Set(Object.keys(BASE_VARIABLES));

  for (const [routePath, pathItem] of Object.entries(spec.paths || {})) {
    const commonParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
      const operation = pathItem[method];
      if (!operation) continue;

      const folder = segmentToFolderName(routePath);
      if (!folderMap.has(folder)) folderMap.set(folder, []);

      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const parameters = [...commonParams, ...opParams];

      const urlTemplate = openApiPathToUrlTemplate(routePath);
      const queryParams = [];
      const headers = [];

      for (const param of parameters) {
        if (!param || typeof param !== 'object') continue;

        const entry = {
          key: param.name,
          value: defaultValueForParam(param),
        };

        if (param.description) entry.description = param.description;
        if (!param.required) entry.disabled = true;

        if (param.in === 'query') {
          queryParams.push(entry);
        } else if (param.in === 'header') {
          headers.push(entry);
        } else if (param.in === 'path') {
          variableSet.add(param.name);
        }
      }

      const req = {
        $kind: 'http-request',
        description: operation.description || operation.summary || undefined,
        url: urlTemplate,
        method: method.toUpperCase(),
      };

      if (headers.length) req.headers = headers;
      if (queryParams.length) req.queryParams = queryParams;

      const requestBody = operation.requestBody;
      if (requestBody && requestBody.content && requestBody.content['application/json']) {
        const media = requestBody.content['application/json'];
        const schema = media.schema || {};
        const exampleBody = schemaToExample(schema, spec);

        req.body = {
          type: 'json',
          content: JSON.stringify(exampleBody, null, 2),
        };
      }

      folderMap.get(folder).push({
        request: req,
        name: makeRequestName(method, routePath, operation),
        order: folderMap.get(folder).length + 1,
      });
    }
  }

  const rootVariables = { ...BASE_VARIABLES };
  for (const variable of [...variableSet].sort()) {
    if (!Object.prototype.hasOwnProperty.call(rootVariables, variable)) {
      rootVariables[variable] = '1';
    }
  }

  writeYamlFile(path.join(COLLECTION_DIR, '.resources', 'definition.yaml'), {
    $kind: 'collection',
    description:
      'Complete PRA API v3.1.x collection including all endpoints. ' +
      'X-Access-Key and X-API-Key values are variable-based for easy global configuration.',
    variables: rootVariables,
  });

  let folderOrder = 1000;
  for (const folder of [...folderMap.keys()].sort()) {
    const folderPath = path.join(COLLECTION_DIR, folder);
    ensureDir(path.join(folderPath, '.resources'));

    writeYamlFile(path.join(folderPath, '.resources', 'definition.yaml'), {
      $kind: 'collection',
      description: `Endpoints for /${folder}`,
      order: folderOrder,
    });

    folderOrder += 1000;

    for (const reqMeta of folderMap.get(folder)) {
      reqMeta.request.order = reqMeta.order * 1000;
      const fileName = `${reqMeta.name}.request.yaml`;
      writeYamlFile(path.join(folderPath, fileName), reqMeta.request);
    }
  }

  for (const op of EXPLICIT_API_KEY_OPERATIONS) {
    if (!folderMap.has(op.folder)) {
      folderMap.set(op.folder, []);
    }

    variableSet.add('apiKey');
    if ((op.headers || []).some((h) => h.key === 'Authorization')) {
      variableSet.add('jwtToken');
    }

    const reqFilePath = path.join(COLLECTION_DIR, op.folder, `${sanitizeFileName(op.name)}.request.yaml`);
    ensureDir(path.join(COLLECTION_DIR, op.folder, '.resources'));

    const requestData = {
      $kind: 'http-request',
      description: 'Internal endpoint (X-API-Key protected). Included for full internal PRA testing.',
      url: op.url,
      method: op.method,
      headers: op.headers,
      queryParams: op.queryParams,
      body: op.body,
      order: (folderMap.get(op.folder).length + 1) * 1000,
    };

    if (!requestData.queryParams) delete requestData.queryParams;
    if (!requestData.body) delete requestData.body;

    writeYamlFile(reqFilePath, requestData);
    folderMap.get(op.folder).push({ name: op.name, request: requestData });
  }

  writeYamlFile(path.join(COLLECTION_DIR, '.resources', 'definition.yaml'), {
    $kind: 'collection',
    description:
      'Complete PRA API v3.1.x collection including all endpoints. ' +
      'X-Access-Key and X-API-Key values are variable-based for easy global configuration.',
    variables: Object.fromEntries(
      Object.entries({ ...rootVariables, ...Object.fromEntries([...variableSet].sort().map((k) => [k, rootVariables[k] ?? '1'])) }),
    ),
  });

  return { spec, folderMap };
}

function readCollectionRequestFiles() {
  const folders = fs
    .readdirSync(COLLECTION_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '.resources')
    .map((d) => d.name)
    .sort();

  const collectionFolders = [];
  for (const folder of folders) {
    const folderPath = path.join(COLLECTION_DIR, folder);
    const files = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.request.yaml'))
      .map((d) => d.name)
      .sort();

    const items = [];
    for (const file of files) {
      const requestData = yaml.load(fs.readFileSync(path.join(folderPath, file), 'utf8'), {
        schema: yaml.FAILSAFE_SCHEMA,
      });
      items.push({
        name: file.replace('.request.yaml', ''),
        data: requestData,
      });
    }

    collectionFolders.push({ name: folder, items });
  }

  return collectionFolders;
}

function toPostmanRequest(item) {
  const req = item.data;
  const postmanReq = {
    method: req.method || 'GET',
    url: {
      raw: req.url,
      host: ['{{baseUrl}}'],
      path: (req.url || '')
        .replace(/^\{\{baseUrl\}\}/, '')
        .split('?')[0]
        .split('/')
        .filter(Boolean),
    },
  };

  if (Array.isArray(req.queryParams) && req.queryParams.length) {
    postmanReq.url.query = req.queryParams.map((q) => {
      const out = { key: String(q.key || ''), value: String(q.value || '') };
      if (q.description) out.description = String(q.description);
      if (q.disabled) out.disabled = true;
      return out;
    });
  }

  if (Array.isArray(req.headers) && req.headers.length) {
    postmanReq.header = req.headers.map((h) => {
      const out = { key: String(h.key || ''), value: String(h.value || '') };
      if (h.description) out.description = String(h.description);
      if (h.disabled) out.disabled = true;
      return out;
    });
  }

  if (req.body && req.body.type === 'json') {
    postmanReq.body = {
      mode: 'raw',
      raw: req.body.content || '{}',
      options: { raw: { language: 'json' } },
    };
  }

  return postmanReq;
}

function isApiKeyRequest(item) {
  const headers = Array.isArray(item.data.headers) ? item.data.headers : [];
  return headers.some((h) => String(h.key || '').toLowerCase() === 'x-api-key');
}

function generateFilteredExportYaml() {
  const rootDefinition = yaml.load(fs.readFileSync(path.join(COLLECTION_DIR, '.resources', 'definition.yaml'), 'utf8'), {
    schema: yaml.FAILSAFE_SCHEMA,
  });

  const folders = readCollectionRequestFiles();
  const postmanItems = [];

  for (const folder of folders) {
    const filtered = folder.items.filter((item) => !isApiKeyRequest(item));
    if (!filtered.length) continue;

    postmanItems.push({
      name: folder.name,
      item: filtered.map((item) => ({
        name: item.name,
        request: toPostmanRequest(item),
      })),
    });
  }

  const postmanCollection = {
    info: {
      _postman_id: crypto.randomUUID(),
      name: 'Marlink PRA API v3.1.x (Export Without X-API-Key Endpoints)',
      description:
        'Complete PRA API v3.1.x export without X-API-Key protected endpoints. ' +
        'X-Access-Key endpoints are included.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: postmanItems,
    variable: Object.entries(rootDefinition.variables || {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  };

  ensureDir(path.dirname(EXPORT_PATH));
  fs.writeFileSync(EXPORT_PATH, yaml.dump(postmanCollection, { sortKeys: false, noRefs: true, lineWidth: 120 }), 'utf8');

  return {
    folderCount: postmanItems.length,
    requestCount: postmanItems.reduce((sum, folder) => sum + folder.item.length, 0),
  };
}

function main() {
  const { folderMap } = generateCollectionFromSpec();
  const exportStats = generateFilteredExportYaml();

  const fullRequests = [...folderMap.values()].reduce((sum, list) => sum + list.length, 0);

  console.log(`Collection generated: ${COLLECTION_DIR}`);
  console.log(`Folders: ${folderMap.size}`);
  console.log(`Requests (all endpoints): ${fullRequests}`);
  console.log(`Filtered YAML export: ${EXPORT_PATH}`);
  console.log(`Export folders: ${exportStats.folderCount}`);
  console.log(`Export requests (without X-API-Key): ${exportStats.requestCount}`);
}

main();
