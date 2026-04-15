# File System

> Client filesystem access methods

The filesystem methods allow Agents to read and write text files within the Client's environment.

## Checking Support

Before attempting to use filesystem methods, Agents **MUST** verify that the Client supports these capabilities by checking the `clientCapabilities` field in the `initialize` response:

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": 1,
    "clientCapabilities": {
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      }
    }
  }
}
```

If `readTextFile` or `writeTextFile` is `false` or not present, the Agent **MUST NOT** attempt to call the corresponding filesystem method.

## Reading Files

The `fs/read_text_file` method allows Agents to read text file contents:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "fs/read_text_file",
  "params": {
    "sessionId": "sess_abc123def456",
    "path": "/home/user/project/src/main.py",
    "line": 10,
    "limit": 50
  }
}
```

Parameters:
- `sessionId`: The Session ID for this request
- `path`: Absolute path to the file to read
- `line`: Optional line number to start reading from (1-based)
- `limit`: Optional maximum number of lines to read

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": "def hello_world():\n    print('Hello, world!')\n"
  }
}
```

## Writing Files

The `fs/write_text_file` method allows Agents to write or update text files:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "fs/write_text_file",
  "params": {
    "sessionId": "sess_abc123def456",
    "path": "/home/user/project/config.json",
    "content": "{\n  \"debug\": true,\n  \"version\": \"1.0.0\"\n}"
  }
}
```

Parameters:
- `sessionId`: The Session ID for this request
- `path`: Absolute path to the file to write (must create if doesn't exist)
- `content`: The text content to write to the file

Response (empty result on success):

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": null
}
```