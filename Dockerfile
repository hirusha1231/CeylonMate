# Multi-stage Dockerfile for CeylonMate .NET 8 Web API
# For building from repo root on Render

# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore
COPY ["backend/CeylonMate.Api/CeylonMate.Api.csproj", "backend/CeylonMate.Api/"]
RUN dotnet restore "backend/CeylonMate.Api/CeylonMate.Api.csproj"

# Copy backend source and publish
COPY backend/ backend/
WORKDIR "/src/backend/CeylonMate.Api"
RUN dotnet publish "CeylonMate.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
EXPOSE 5084

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "CeylonMate.Api.dll"]
