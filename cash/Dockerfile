# Dockerfile
FROM --platform=linux/amd64 mcr.microsoft.com/dotnet/aspnet:10.0 AS base

ENV DOTNET_NUGET_SIGNATURE_VERIFICATION=flase

WORKDIR /app
EXPOSE 80

FROM --platform=linux/amd64 mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["cash.csproj", "./"]
COPY ["NuGet.config", "./"]
COPY . .
WORKDIR "/src"

RUN dotnet build "cash.csproj" -c $BUILD_CONFIGURATION -o /app/build 

FROM build AS publish
RUN dotnet publish "cash.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "cash.dll"]