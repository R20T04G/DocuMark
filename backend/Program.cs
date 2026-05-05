using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// ==========================================
// DOCUMENT CONVERSION ENDPOINT
// ==========================================
app.MapPost("/api/convert", async ([FromForm] IFormFile? file, [FromForm] string? outputFormat) =>
{
    if (file == null || file.Length == 0)
    {
        return Results.BadRequest("No file was uploaded.");
    }

    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

    await using var uploadedFile = new MemoryStream();
    await file.CopyToAsync(uploadedFile);
    var fileBytes = uploadedFile.ToArray();
    var requestedOutputFormat = ParseRequestedOutputFormat(outputFormat);

    if (requestedOutputFormat == OutputFormat.CsvBundle && extension != ".xlsx")
    {
        return Results.BadRequest("CSV bundle export is only available for Excel workbooks.");
    }

    return extension switch
    {
        ".docx" => ConvertWordDocument(new MemoryStream(fileBytes), file.FileName),
        ".xlsx" => ConvertSpreadsheet(new MemoryStream(fileBytes), file.FileName, requestedOutputFormat),
        ".pptx" => ConvertPresentation(new MemoryStream(fileBytes), file.FileName),
        ".pdf" => ConvertPdf(new MemoryStream(fileBytes), file.FileName),
        _ => Results.BadRequest("Supported formats are .docx, .xlsx, .pptx, and .pdf.")
    };
})
.DisableAntiforgery();

app.Run();

static IResult ConvertWordDocument(Stream stream, string fileName)
{
    try
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }

        using var wordDocument = WordprocessingDocument.Open(stream, false);
        var body = wordDocument.MainDocumentPart?.Document.Body;

        if (body == null)
        {
            return Results.BadRequest("Could not read document body.");
        }

        var markdownBuilder = new StringBuilder();
        AppendConversionHeader(markdownBuilder, fileName, "Word document", new[]
        {
            "- Conversion mode: structured paragraph and table extraction",
            "- Output format: Markdown",
            "- Headings, lists, and tables are preserved where the document styles expose them"
        });

        foreach (var element in body.ChildElements)
        {
            switch (element)
            {
                case Paragraph paragraph:
                {
                    var paragraphMarkdown = RenderWordParagraph(paragraph);
                    if (!string.IsNullOrWhiteSpace(paragraphMarkdown))
                    {
                        markdownBuilder.AppendLine(paragraphMarkdown);
                        markdownBuilder.AppendLine();
                    }

                    break;
                }
                case DocumentFormat.OpenXml.Wordprocessing.Table table:
                {
                    var tableMarkdown = ConvertWordTable(table);
                    if (!string.IsNullOrWhiteSpace(tableMarkdown))
                    {
                        markdownBuilder.AppendLine(tableMarkdown);
                        markdownBuilder.AppendLine();
                    }

                    break;
                }
            }
        }

        var markdown = markdownBuilder.ToString().TrimEnd();

        return CreateMarkdownResult(fileName, "Word document", markdown, markdown);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error processing document: {ex.Message}");
    }
}

static IResult ConvertSpreadsheet(Stream stream, string fileName, OutputFormat outputFormat)
{
    try
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }

        using var spreadsheetDocument = SpreadsheetDocument.Open(stream, false);
        var workbookPart = spreadsheetDocument.WorkbookPart;

        if (workbookPart?.Workbook?.Sheets == null)
        {
            return Results.BadRequest("Could not read workbook sheets.");
        }

        var sharedStringTable = workbookPart.SharedStringTablePart?.SharedStringTable;
        var worksheetRowsBySheet = new List<(string SheetName, List<List<string>> Rows)>();
        var sheetExports = new List<SheetExport>();
        var sheetCount = 0;

        foreach (var sheet in workbookPart.Workbook.Sheets.OfType<Sheet>())
        {
            var relationshipId = sheet.Id?.Value;
            if (string.IsNullOrWhiteSpace(relationshipId))
            {
                continue;
            }

            sheetCount++;
            var worksheetPart = (WorksheetPart)workbookPart.GetPartById(relationshipId);
            var worksheetRows = ExtractWorksheetRows(worksheetPart, sharedStringTable);
            var sheetName = NormalizeSheetName(sheet.Name?.Value, sheetCount);

            worksheetRowsBySheet.Add((sheetName, worksheetRows));
            sheetExports.Add(new SheetExport(sheetName, worksheetRows.Count));
        }

        if (sheetCount == 0)
        {
            return Results.BadRequest("The workbook did not contain any readable sheets.");
        }

        if (outputFormat == OutputFormat.CsvBundle)
        {
            var (archiveBytes, csvSheetExports, preview) = BuildSpreadsheetCsvBundle(fileName, worksheetRowsBySheet);

            return CreateCsvBundleResult(fileName, "Excel workbook", preview, archiveBytes, csvSheetExports);
        }

        var markdownBuilder = new StringBuilder();
        AppendConversionHeader(markdownBuilder, fileName, "Excel workbook", new[]
        {
            "- Conversion mode: worksheet table extraction",
            "- Output format: Markdown",
            "- AI-friendly structure: each sheet is converted into a markdown table"
        });

        var sheetIndex = 0;
        foreach (var (sheetName, rows) in worksheetRowsBySheet)
        {
            sheetIndex++;
            markdownBuilder.AppendLine($"## Sheet {sheetIndex}: {sheetName}");
            markdownBuilder.AppendLine();

            if (rows.Count == 0)
            {
                markdownBuilder.AppendLine("_No readable rows were found in this sheet._");
                markdownBuilder.AppendLine();
                continue;
            }

            markdownBuilder.AppendLine(BuildMarkdownTable(rows));
            markdownBuilder.AppendLine();
        }

        var markdown = markdownBuilder.ToString().TrimEnd();

        return CreateMarkdownResult(fileName, "Excel workbook", markdown, markdown, sheetExports.ToArray());
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error processing spreadsheet: {ex.Message}");
    }
}

static IResult ConvertPresentation(Stream stream, string fileName)
{
    try
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }

        using var presentationDocument = PresentationDocument.Open(stream, false);
        var presentationPart = presentationDocument.PresentationPart;
        var slideIdList = presentationPart?.Presentation?.SlideIdList;

        if (presentationPart == null || slideIdList == null)
        {
            return Results.BadRequest("Could not read presentation slides.");
        }

        var markdownBuilder = new StringBuilder();
        AppendConversionHeader(markdownBuilder, fileName, "PowerPoint presentation", new[]
        {
            "- Conversion mode: slide text extraction",
            "- Output format: Markdown",
            "- AI-friendly structure: each slide becomes a titled bullet list"
        });

        var slideNumber = 0;
        foreach (var slideId in slideIdList.Elements<SlideId>())
        {
            var relationshipId = slideId.RelationshipId?.Value;
            if (string.IsNullOrWhiteSpace(relationshipId))
            {
                continue;
            }

            slideNumber++;
            var slidePart = (SlidePart)presentationPart.GetPartById(relationshipId);
            var slideText = ExtractSlideText(slidePart);

            markdownBuilder.AppendLine($"## Slide {slideNumber}: {(slideText.FirstOrDefault() ?? "Untitled Slide")}");
            markdownBuilder.AppendLine();

            var slideContent = slideText.Skip(1).ToList();
            if (slideContent.Count == 0)
            {
                markdownBuilder.AppendLine("_No readable text was found on this slide._");
                markdownBuilder.AppendLine();
                continue;
            }

            foreach (var line in slideContent)
            {
                markdownBuilder.AppendLine($"- {line}");
            }

            markdownBuilder.AppendLine();
        }

        var markdown = markdownBuilder.ToString().TrimEnd();

        return CreateMarkdownResult(fileName, "PowerPoint presentation", markdown, markdown);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error processing presentation: {ex.Message}");
    }
}

static IResult ConvertPdf(Stream stream, string fileName)
{
    try
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }

        var markdownBuilder = new StringBuilder();
        using var pdfDocument = PdfDocument.Open(stream);

        AppendConversionHeader(markdownBuilder, fileName, "PDF document", new[]
        {
            "- Conversion mode: page text extraction with paragraph normalization",
            "- Output format: Markdown",
            "- AI-friendly structure: each page becomes a labeled section"
        });

        var pageCount = 0;
        foreach (var page in pdfDocument.GetPages())
        {
            pageCount++;
            var pageText = FormatPdfPageText(page.Text);

            markdownBuilder.AppendLine($"## Page {pageCount}");
            markdownBuilder.AppendLine();

            if (string.IsNullOrWhiteSpace(pageText))
            {
                markdownBuilder.AppendLine("_No readable text was found on this page._");
                markdownBuilder.AppendLine();
                continue;
            }

            markdownBuilder.AppendLine(pageText);
            markdownBuilder.AppendLine();
        }

        if (pageCount == 0)
        {
            return Results.BadRequest("The PDF did not contain any readable pages.");
        }

        var markdown = markdownBuilder.ToString().TrimEnd();

        return CreateMarkdownResult(fileName, "PDF document", markdown, markdown);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error processing PDF file: {ex.Message}");
    }
}

static void AppendConversionHeader(StringBuilder markdownBuilder, string fileName, string formatLabel, IEnumerable<string> summaryLines, string contentHeading = "Extracted Content")
{
    markdownBuilder.AppendLine("# DocuMark Conversion Log");
    markdownBuilder.AppendLine();
    markdownBuilder.AppendLine($"- Source file: `{fileName}`");
    markdownBuilder.AppendLine($"- Input type: {formatLabel}");
    markdownBuilder.AppendLine("- Generated by: DocuMark");

    foreach (var line in summaryLines)
    {
        markdownBuilder.AppendLine(line);
    }

    markdownBuilder.AppendLine();
    markdownBuilder.AppendLine("---");
    markdownBuilder.AppendLine();
    markdownBuilder.AppendLine($"## {contentHeading}");
    markdownBuilder.AppendLine();
}

static IResult CreateMarkdownResult(string sourceFileName, string inputFormat, string markdown, string preview, SheetExport[]? sheets = null)
{
    return Results.Ok(new
    {
        message = "Conversion successful!",
        inputFormat,
        outputFormat = "markdown",
        fileName = CreateDownloadFileName(sourceFileName, "md"),
        contentType = "text/markdown; charset=utf-8",
        content = markdown,
        markdown,
        preview,
        sheets
    });
}

static IResult CreateCsvBundleResult(string sourceFileName, string inputFormat, string preview, byte[] archiveBytes, SheetExport[] sheets)
{
    return Results.Ok(new
    {
        message = "Conversion successful!",
        inputFormat,
        outputFormat = "csv-bundle",
        fileName = CreateDownloadFileName(sourceFileName, "zip", "csv-bundle"),
        contentType = "application/zip",
        content = (string?)null,
        contentBase64 = Convert.ToBase64String(archiveBytes),
        preview,
        sheets
    });
}

static OutputFormat ParseRequestedOutputFormat(string? value)
{
    return value?.Trim().ToLowerInvariant() switch
    {
        "csv" or "csv-bundle" or "csvbundle" or "zip" => OutputFormat.CsvBundle,
        _ => OutputFormat.Markdown
    };
}

static string CreateDownloadFileName(string sourceFileName, string extension, string? suffix = null)
{
    var baseName = Path.GetFileNameWithoutExtension(sourceFileName);
    if (string.IsNullOrWhiteSpace(baseName))
    {
        baseName = "output";
    }

    baseName = SanitizeFileName(baseName);

    return string.IsNullOrWhiteSpace(suffix)
        ? $"{baseName}.{extension}"
        : $"{baseName}-{suffix}.{extension}";
}

static string SanitizeFileName(string value)
{
    var invalidCharacters = Path.GetInvalidFileNameChars();
    var sanitizedBuilder = new StringBuilder(value.Length);

    foreach (var character in value)
    {
        sanitizedBuilder.Append(Array.IndexOf(invalidCharacters, character) >= 0 ? '_' : character);
    }

    var sanitized = sanitizedBuilder.ToString();

    return string.IsNullOrWhiteSpace(sanitized) ? "output" : sanitized.Trim().Trim('.');
}

static string NormalizeText(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return string.Empty;
    }

    return Regex.Replace(value, @"\s+", " ").Trim();
}

static string FormatPdfPageText(string pageText)
{
    if (string.IsNullOrWhiteSpace(pageText))
    {
        return string.Empty;
    }

    var paragraphBuilder = new StringBuilder();
    var paragraphs = new List<string>();

    foreach (var line in pageText.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n'))
    {
        var normalizedLine = NormalizeText(line);

        if (string.IsNullOrWhiteSpace(normalizedLine))
        {
            if (paragraphBuilder.Length > 0)
            {
                paragraphs.Add(paragraphBuilder.ToString().Trim());
                paragraphBuilder.Clear();
            }

            continue;
        }

        if (paragraphBuilder.Length > 0)
        {
            paragraphBuilder.Append(' ');
        }

        paragraphBuilder.Append(normalizedLine);
    }

    if (paragraphBuilder.Length > 0)
    {
        paragraphs.Add(paragraphBuilder.ToString().Trim());
    }

    return string.Join(Environment.NewLine + Environment.NewLine, paragraphs);
}

static string NormalizeSheetName(string? value, int sheetIndex)
{
    var sheetName = NormalizeText(value);

    if (string.IsNullOrWhiteSpace(sheetName))
    {
        return $"Sheet {sheetIndex}";
    }

    return sheetName;
}

static (byte[] ArchiveBytes, SheetExport[] SheetExports, string Preview) BuildSpreadsheetCsvBundle(string sourceFileName, IReadOnlyList<(string SheetName, List<List<string>> Rows)> sheets)
{
    using var archiveStream = new MemoryStream();
    var previewBuilder = new StringBuilder();

    AppendConversionHeader(previewBuilder, sourceFileName, "Excel workbook", new[]
    {
        "- Conversion mode: worksheet export",
        "- Output format: ZIP archive containing one CSV per sheet",
        "- Each sheet is exported with RFC 4180 CSV escaping"
    }, "Exported CSV Files");

    var usedFileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var sheetExports = new List<SheetExport>();

    using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, leaveOpen: true))
    {
        foreach (var (sheetName, rows) in sheets)
        {
            var safeSheetName = SanitizeFileName(sheetName);
            var csvFileName = EnsureUniqueFileName(safeSheetName, "csv", usedFileNames);
            var entry = archive.CreateEntry(csvFileName, CompressionLevel.Optimal);

            using (var entryStream = entry.Open())
            using (var writer = new StreamWriter(entryStream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true)))
            {
                foreach (var row in rows)
                {
                    writer.WriteLine(BuildCsvLine(row));
                }
            }

            sheetExports.Add(new SheetExport(sheetName, rows.Count, csvFileName));
            previewBuilder.AppendLine($"- {sheetName} -> {csvFileName} ({rows.Count} rows)");
        }
    }

    return (archiveStream.ToArray(), sheetExports.ToArray(), previewBuilder.ToString().TrimEnd());
}

static string EnsureUniqueFileName(string baseName, string extension, HashSet<string> usedFileNames)
{
    var candidate = $"{baseName}.{extension}";
    var suffix = 2;

    while (!usedFileNames.Add(candidate))
    {
        candidate = $"{baseName}-{suffix++}.{extension}";
    }

    return candidate;
}

static string BuildCsvLine(IEnumerable<string> values)
{
    return string.Join(",", values.Select(EscapeCsvCell));
}

static string EscapeCsvCell(string? value)
{
    var cellValue = value ?? string.Empty;

    var mustQuote = cellValue.Contains(',') || cellValue.Contains('"') || cellValue.Contains('\n') || cellValue.Contains('\r');

    if (mustQuote)
    {
        return $"\"{cellValue.Replace("\"", "\"\"")}\"";
    }

    return cellValue;
}

static string RenderWordParagraph(Paragraph paragraph)
{
    var text = NormalizeText(paragraph.InnerText);

    if (string.IsNullOrWhiteSpace(text))
    {
        return string.Empty;
    }

    var styleId = paragraph.ParagraphProperties?.ParagraphStyleId?.Val?.Value;
    var headingLevel = GetHeadingLevel(styleId);

    if (headingLevel > 0)
    {
        return $"{new string('#', headingLevel)} {text}";
    }

    var numberingLevel = paragraph.ParagraphProperties?.NumberingProperties?.NumberingLevelReference?.Val?.Value ?? 0;
    var isListItem = paragraph.ParagraphProperties?.NumberingProperties != null
        || (styleId?.Contains("List", StringComparison.OrdinalIgnoreCase) ?? false);

    if (isListItem)
    {
        return $"{new string(' ', numberingLevel * 2)}- {text}";
    }

    return text;
}

static string ConvertWordTable(DocumentFormat.OpenXml.Wordprocessing.Table table)
{
    var rows = new List<List<string>>();

    foreach (var row in table.Elements<TableRow>())
    {
        var rowValues = new List<string>();

        foreach (var cell in row.Elements<TableCell>())
        {
            rowValues.Add(NormalizeText(cell.InnerText));
        }

        if (rowValues.Any(value => !string.IsNullOrWhiteSpace(value)))
        {
            rows.Add(rowValues);
        }
    }

    return BuildMarkdownTable(rows);
}

static int GetHeadingLevel(string? styleId)
{
    if (string.IsNullOrWhiteSpace(styleId))
    {
        return 0;
    }

    if (styleId.Equals("Title", StringComparison.OrdinalIgnoreCase))
    {
        return 1;
    }

    if (styleId.Equals("Subtitle", StringComparison.OrdinalIgnoreCase))
    {
        return 2;
    }

    if (!styleId.StartsWith("Heading", StringComparison.OrdinalIgnoreCase))
    {
        return 0;
    }

    var digits = new string(styleId.Where(char.IsDigit).ToArray());

    return int.TryParse(digits, out var headingLevel)
        ? Math.Clamp(headingLevel, 1, 6)
        : 1;
}

static List<List<string>> ExtractWorksheetRows(WorksheetPart worksheetPart, SharedStringTable? sharedStringTable)
{
    var rows = new List<List<string>>();
    var sheetData = worksheetPart.Worksheet.Elements<SheetData>().FirstOrDefault();

    if (sheetData == null)
    {
        return rows;
    }

    foreach (var row in sheetData.Elements<Row>())
    {
        var rowValues = new List<string>();

        foreach (var cell in row.Elements<Cell>())
        {
            var columnIndex = GetColumnIndexFromCellReference(cell.CellReference?.Value);
            while (rowValues.Count <= columnIndex)
            {
                rowValues.Add(string.Empty);
            }

            rowValues[columnIndex] = GetCellText(cell, sharedStringTable);
        }

        while (rowValues.Count > 0 && string.IsNullOrWhiteSpace(rowValues[^1]))
        {
            rowValues.RemoveAt(rowValues.Count - 1);
        }

        if (rowValues.Any(value => !string.IsNullOrWhiteSpace(value)))
        {
            rows.Add(rowValues);
        }
    }

    return rows;
}

static string GetCellText(Cell cell, SharedStringTable? sharedStringTable)
{
    if (cell.DataType?.Value == CellValues.SharedString)
    {
        if (int.TryParse(cell.CellValue?.Text ?? cell.CellValue?.InnerText, out var sharedStringIndex) && sharedStringTable != null)
        {
            var sharedStringItem = sharedStringTable.Elements<SharedStringItem>().ElementAtOrDefault(sharedStringIndex);
            return sharedStringItem?.InnerText ?? string.Empty;
        }

        return cell.CellValue?.Text ?? string.Empty;
    }

    if (cell.DataType?.Value == CellValues.InlineString)
    {
        return cell.InnerText;
    }

    if (cell.DataType?.Value == CellValues.Boolean)
    {
        return cell.CellValue?.Text == "1" ? "TRUE" : "FALSE";
    }

    if (cell.CellValue != null)
    {
        return cell.CellValue.Text;
    }

    return cell.InnerText;
}

static string BuildMarkdownTable(List<List<string>> rows)
{
    if (rows.Count == 0)
    {
        return string.Empty;
    }

    var columnCount = rows.Max(row => row.Count);
    if (columnCount == 0)
    {
        return string.Empty;
    }

    var normalizedRows = rows
        .Select(row => row.Concat(Enumerable.Repeat(string.Empty, columnCount - row.Count)).ToList())
        .ToList();

    var headerRow = normalizedRows[0];
    var dataRows = normalizedRows.Skip(1).ToList();

    if (dataRows.Count == 0)
    {
        headerRow = Enumerable.Range(1, columnCount).Select(column => $"Column {column}").ToList();
        dataRows = normalizedRows;
    }

    var markdownTable = new StringBuilder();
    markdownTable.AppendLine("| " + string.Join(" | ", headerRow.Select(EscapeMarkdownCell)) + " |");
    markdownTable.AppendLine("| " + string.Join(" | ", Enumerable.Repeat("---", columnCount)) + " |");

    foreach (var row in dataRows)
    {
        markdownTable.AppendLine("| " + string.Join(" | ", row.Select(EscapeMarkdownCell)) + " |");
    }

    return markdownTable.ToString().TrimEnd();
}

static string EscapeMarkdownCell(string value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return string.Empty;
    }

    return value
        .Replace("|", "\\|")
        .Replace("\r\n", "<br>")
        .Replace("\r", "<br>")
        .Replace("\n", "<br>")
        .Trim();
}

static int GetColumnIndexFromCellReference(string? cellReference)
{
    if (string.IsNullOrWhiteSpace(cellReference))
    {
        return 0;
    }

    var columnIndex = 0;
    foreach (var character in cellReference)
    {
        if (!char.IsLetter(character))
        {
            break;
        }

        columnIndex = (columnIndex * 26) + (char.ToUpperInvariant(character) - 'A' + 1);
    }

    return Math.Max(columnIndex - 1, 0);
}

static List<string> ExtractSlideText(SlidePart slidePart)
{
    var slideLines = new List<string>();
    var slideTitle = string.Empty;

    foreach (var shape in slidePart.Slide.Descendants<A.Shape>())
    {
        var textBody = shape.GetFirstChild<A.TextBody>();
        if (textBody == null)
        {
            continue;
        }

        foreach (var paragraph in textBody.Elements<A.Paragraph>())
        {
            var text = NormalizeText(paragraph.InnerText);
            if (string.IsNullOrWhiteSpace(text))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(slideTitle))
            {
                slideTitle = text;
                continue;
            }

            var level = paragraph.ParagraphProperties?.Level?.Value ?? 0;
            slideLines.Add($"{new string(' ', level * 2)}- {text}");
        }
    }

    if (!string.IsNullOrWhiteSpace(slideTitle))
    {
        slideLines.Insert(0, slideTitle);
    }

    return slideLines;
}

enum OutputFormat
{
    Markdown,
    CsvBundle
}

record SheetExport(string SheetName, int RowCount, string? FileName = null);