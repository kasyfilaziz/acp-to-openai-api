# Content

> Understanding content blocks in the Agent Client Protocol

Content blocks represent displayable information that flows through ACP. They provide a structured way to handle various types of user-facing content.

Content blocks appear in:
- User prompts sent via `session/prompt`
- Language model output streamed through `session/update` notifications
- Progress updates and results from tool calls

The Agent Client Protocol uses the same `ContentBlock` structure as the Model Context Protocol (MCP).

## Content Types

### Text Content

Plain text messages form the foundation of most interactions.

```json
{"type": "text", "text": "What's the weather like today?"}
```

All Agents **MUST** support text content blocks.

### Image Content

Images can be included for visual context or analysis.

```json
{
  "type": "image",
  "mimeType": "image/png",
  "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB..."
}
```

Requires the `image` prompt capability.

### Audio Content

Audio data for transcription or analysis.

```json
{
  "type": "audio",
  "mimeType": "audio/wav",
  "data": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB..."
}
```

Requires the `audio` prompt capability.

### Embedded Resource

Complete resource contents embedded directly in the message.

```json
{
  "type": "resource",
  "resource": {
    "uri": "file:///home/user/script.py",
    "mimeType": "text/x-python",
    "text": "def hello():\n    print('Hello, world!')"
  }
}
```

This is the preferred way to include context in prompts. Requires the `embeddedContext` prompt capability.

### Resource Link

References to resources that the Agent can access.

```json
{
  "type": "resource_link",
  "uri": "file:///home/user/document.pdf",
  "name": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000
}
```

All Agents **MUST** support `ContentBlock::Text` and `ContentBlock::ResourceLink`.