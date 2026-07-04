FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
WORKDIR /src

COPY BackEnd/BackEnd.csproj BackEnd/
RUN dotnet restore BackEnd/BackEnd.csproj

FROM restore AS source
COPY BackEnd/ BackEnd/

FROM source AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish BackEnd/BackEnd.csproj \
    -c $BUILD_CONFIGURATION \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM source AS migrate
ENV PATH="${PATH}:/root/.dotnet/tools"
RUN dotnet tool install --global dotnet-ef --version 8.*
ENTRYPOINT ["dotnet", "ef", "database", "update", "--project", "BackEnd/BackEnd.csproj"]

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

RUN mkdir -p /app/wwwroot/images/products /app/logs

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "BackEnd.dll"]
