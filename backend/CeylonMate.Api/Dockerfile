# Multi-stage Dockerfile for CeylonMate .NET 8 Web API
# Optimized for Render deployment

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["CeylonMate.Api/CeylonMate.Api.csproj", "CeylonMate.Api/"]
RUN dotnet restore "CeylonMate.Api/CeylonMate.Api.csproj"

# Copy the entire backend directory and publish
COPY . .
WORKDIR "/src/CeylonMate.Api"
RUN dotnet publish "CeylonMate.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Render uses the PORT environment variable (default 8080 or 10000)
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
EXPOSE 5084

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "CeylonMate.Api.dll"]
