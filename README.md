# DocuMark

DocuMark is a full-stack document conversion web app. Upload Word, Excel, PowerPoint, or PDF files and convert them into clean Markdown. Excel workbooks can also be exported as a ZIP bundle that contains one CSV file per worksheet.

## What It Does

- Converts `.docx`, `.pptx`, and `.pdf` files into structured Markdown
- Converts `.xlsx` workbooks into Markdown tables or CSV bundle exports
- Preserves headings, tables, slide structure, and page sections where the source format allows it
- Uses a Next.js frontend with drag-and-drop upload, preview, and download handling
- Uses a .NET 8 backend for the actual parsing and conversion work

## Supported Inputs And Outputs

| Input | Markdown | CSV bundle |
| --- | --- | --- |
| `.docx` | Yes | No |
| `.xlsx` | Yes | Yes |
| `.pptx` | Yes | No |
| `.pdf` | Yes | No |

Markdown exports are downloaded as `.md` files. CSV bundle exports are downloaded as `.zip` files that contain one CSV per worksheet.

## Local Development

### Backend

```bash
cd backend
dotnet restore
dotnet build
dotnet watch run --project DocuMark.Api.csproj
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

The frontend is available at `http://localhost:3000` and proxies conversion requests through its Next.js API route to the backend.

## Docker

```bash
docker compose build
docker compose up -d
```

Docker Compose starts the backend and frontend together. The frontend uses `BACKEND_URL=http://backend:8080` inside the compose network.

## API

### `POST /api/convert`

Send multipart form data with:

- `file` - the document to convert
- `outputFormat` - optional, use `markdown` or `csv-bundle`

Example Markdown conversion:

```bash
curl -X POST -F "file=@document.docx" http://localhost:5152/api/convert
```

Example Excel CSV-bundle conversion:

```bash
curl -X POST -F "file=@workbook.xlsx" -F "outputFormat=csv-bundle" http://localhost:5152/api/convert
```

### Response Shape

Successful conversions return JSON with fields such as:

- `message`
- `fileName`
- `contentType`
- `content`
- `contentBase64`
- `preview`
- `sheets`

Markdown responses include the converted text in `content` and `markdown`. CSV bundle responses include a base64-encoded ZIP archive in `contentBase64`.

## Implementation Notes

- The Next.js app forwards uploads to the backend through `/api/convert`
- Markdown output is formatted to preserve readable document structure instead of dumping raw text
- Spreadsheet CSV bundles contain one CSV file per worksheet
