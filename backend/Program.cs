using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
// ADDED: The libraries needed to read Word docs and manipulate text
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using System.Text; 

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
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
// OUR UPDATED FILE UPLOAD ENDPOINT
// ==========================================
app.MapPost("/api/convert", async (IFormFile? file) =>
{
    if (file == null || file.Length == 0) return Results.BadRequest("No file was uploaded.");

    var extension = Path.GetExtension(file.FileName).ToLower();
    
    // Check if it's a Word document
    if (extension == ".docx")
    {
        try 
        {
            // 1. Copy the uploaded file into server memory
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0; // Reset stream position to the beginning

            // 2. Open the Word Document using OpenXML
            using var wordDocument = WordprocessingDocument.Open(memoryStream, false);
            var body = wordDocument.MainDocumentPart?.Document.Body;

            if (body == null) return Results.BadRequest("Could not read document body.");

            // 3. Extract the text and format it as basic Markdown
            var markdownBuilder = new StringBuilder();
            
            // Loop through every paragraph in the Word doc
            foreach (var para in body.Elements<Paragraph>())
            {
                var text = para.InnerText;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    // Basic Markdown: just text with a double line break
                    markdownBuilder.AppendLine(text);
                    markdownBuilder.AppendLine(); 
                }
            }

            // Return the extracted Markdown text!
            return Results.Ok(new { 
                message = "Conversion successful!", 
                markdown = markdownBuilder.ToString() 
            });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error processing document: {ex.Message}");
        }
    }

    return Results.BadRequest("Currently, only .docx files are supported for conversion.");
})
.DisableAntiforgery();

app.Run();