# JSON → DDEX ERN

Converts release metadata JSON into a **DDEX ERN 4.3 `NewReleaseMessage`** for delivering music to DSPs. Output validates against the official ERN 4.3 XSD.

```bash
npm install
npm run dev   # http://localhost:3000
```

## Usage

- **Web UI** (`/`): paste or upload JSON, click *Convert*, then copy or download the XML.
- **API**: `POST /api/convert` with the JSON body.
  - `200` returns `application/xml`. Add `?format=json` to get `{ xml, issues }` instead.
  - `422` returns `{ xml: null, issues }` when validation fails.
  - `400` means the body is not valid JSON.

```bash
curl -X POST localhost:3000/api/convert -H "Content-Type: application/json" -d @release.json -o release.xml
```

## Input format

See [lib/ddex/types.ts](lib/ddex/types.ts) for the full definition and [lib/ddex/sample.ts](lib/ddex/sample.ts) for a complete example.

| Field | Notes |
| --- | --- |
| `messageHeader.sender` / `recipient` | `{ dpid, name }`. DPIDs start with `PADPIDA`. `isTest: true` sends a `TestMessage`. |
| `release.upc` | 12–14 digit UPC/EAN. |
| `release.type` | `Album`, `Single`, `EP`… Inferred from the track count if omitted. |
| `release.artists[]` | `{ name, role }`, where role is `MainArtist` (default) or `FeaturedArtist`. |
| `release.pLine` / `cLine` | `{ year, text }`. |
| `release.coverArt` | `{ uri, md5, width, height }`. 3000×3000 is recommended. |
| `tracks[].isrc` | 12 characters, no dashes. |
| `tracks[].duration` | Seconds, `"m:ss"`, `"h:mm:ss"` or `"PT3M25S"`. |
| `tracks[].contributors[]` | `{ name, role }`. Role can be one DDEX role or a list. `Producer`, `Songwriter`, `Writer` and `Mixer` are mapped to their DDEX equivalents. |
| `tracks[].discNumber` | Optional. Used to split a release across discs. |
| `tracks[].audioFile` | `{ uri, md5, codec }`. Codec defaults to `FLAC`. |
| `deals[]` | `{ commercialModel, useTypes[], territories[], startDate, endDate }`. Defaults to worldwide subscription, ad-supported streaming and download deals, starting on the release date. |

Tracks inherit `artists`, `genre` and `pLine` from the release when these are omitted.

## Code

- [lib/ddex/validate.ts](lib/ddex/validate.ts): input validation. Returns errors and warnings with JSON paths.
- [lib/ddex/ern43.ts](lib/ddex/ern43.ts): ERN 4.3 XML builder.
- [lib/ddex/xml.ts](lib/ddex/xml.ts): minimal XML serializer with no dependencies.
- [app/converter.tsx](app/converter.tsx): web UI. Conversion runs in the browser.
- [app/api/convert/route.ts](app/api/convert/route.ts): HTTP API.
