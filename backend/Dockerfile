# Stage 1: Build the app using the heavy SDK
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and install dependencies (NuGet)
COPY ["DocuMark.Api.csproj", "./"]
RUN dotnet restore

# Copy the rest of the code and compile it
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Run the app using the lightweight runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Tell Docker how to start the app
ENTRYPOINT ["dotnet", "DocuMark.Api.dll"]