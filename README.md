# ChemForge — Gemini-ready source package

This is a portable starter version of the ChemForge research workspace. It separates the user interface from the AI provider and uses the official Google Gen AI JavaScript SDK on the server.

## What is included

- Split-screen ChemForge Agent + live 3D workspace
- Three.js molecular viewer with orbit, zoom, atom labels and JSON export
- Gemini-powered chat endpoint (`server.js`)
- Gemini function calling to publish structured atoms and bonds to the viewer
- Local browser conversation history
- Server-side API key handling
- Chemistry-specific system instructions and scientific-validation caveats

## Run locally

1. Install Node.js 20 or newer.
2. Extract this folder.
3. Open a terminal in this folder and run:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Create a Gemini API key in Google AI Studio and place it in `.env`:

   ```env
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

**Keep the real `.env` file private. Never put the API key in frontend JavaScript, HTML, a public repository, or a prompt shared with others.**

## Moving this into Google AI Studio

Google AI Studio's Build experience can generate and edit an app from a project description and source files. Import/upload support can vary by current interface. If direct ZIP import is not offered, extract this ZIP and provide the files to the Build workspace, or paste the README and source files in stages.

Use this instruction in AI Studio:

> Continue this existing ChemForge codebase rather than replacing its design. Preserve the split-screen chat and Three.js workspace. Use the official Gemini API from server-side code only. Keep the `publish_chemistry_workspace` function call contract compatible with `public/app.js`. Improve the agent's reasoning, conversational reliability, tool execution, error handling and scientific grounding. Do not expose the Gemini key in browser code. Add tests before claiming features work.

## API contract

`POST /api/chat`

Request:

```json
{
  "message": "Create a water molecule",
  "history": [
    {"role": "user", "text": "Earlier question"},
    {"role": "model", "text": "Earlier answer"}
  ],
  "workspaceContext": null
}
```

Success response:

```json
{
  "ok": true,
  "answer": "Here is an explanation...",
  "workspace": {
    "kind": "molecule",
    "title": "Water",
    "formula": "H2O",
    "atoms": [],
    "bonds": [],
    "validation": "Illustrative preview only..."
  }
}
```

`GET /api/health` reports whether the server has a Gemini key configured.

## Important scientific limitation

The current 3D viewer displays the coordinates returned by the AI. It is not a chemistry validation engine and does not independently calculate molecular geometry, energetics, electron density, or material properties. Add a real chemistry toolkit (for example RDKit or Open Babel) before presenting generated structures as validated.

## Suggested next development phases

1. Add server-side persistent projects and conversations.
2. Add a chemistry validation layer and standard structure formats.
3. Add import/export for SDF, MOL, XYZ and CIF where appropriate.
4. Add a proper material/crystal model distinct from molecular ball-and-stick structures.
5. Add automated tests for Gemini tool calls, malformed output, retries and session continuity.
