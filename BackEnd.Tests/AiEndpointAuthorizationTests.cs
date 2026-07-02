using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using BackEnd.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BackEnd.Tests;

public sealed class AiEndpointAuthorizationTests : IClassFixture<TestApplicationFactory>
{
    private readonly TestApplicationFactory _factory;

    public AiEndpointAuthorizationTests(TestApplicationFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/summarize", "POST")]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/suggest-reply", "POST")]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/classify", "POST")]
    [InlineData("/api/admin/insights", "GET")]
    [InlineData("/api/admin/security-insights", "GET")]
    public async Task AiEndpoints_ReturnUnauthorized_WhenAnonymous(string url, string method)
    {
        var client = _factory.CreateClient();

        var response = await SendAsync(client, method, url);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/summarize", "POST")]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/suggest-reply", "POST")]
    [InlineData("/api/Support/11111111-1111-1111-1111-111111111111/ai/classify", "POST")]
    [InlineData("/api/admin/insights", "GET")]
    [InlineData("/api/admin/security-insights", "GET")]
    public async Task AiEndpoints_ReturnForbidden_ForCustomerRole(string url, string method)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, "Customer");

        var response = await SendAsync(client, method, url);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Manager")]
    public async Task SupportAiEndpoints_AllowAdminAndManagerRoles(string role)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);

        var response = await SendAsync(client, "POST", "/api/Support/11111111-1111-1111-1111-111111111111/ai/classify");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminInsightsEndpoint_ForbidsManagerRole()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, "Manager");

        var response = await SendAsync(client, "GET", "/api/admin/insights");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminInsightsEndpoint_AllowsAdminRole()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, "Admin");

        var response = await SendAsync(client, "GET", "/api/admin/insights");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string method, string url)
    {
        return method == "GET"
            ? client.GetAsync(url)
            : client.PostAsync(url, new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
    }
}

public sealed class TestApplicationFactory : WebApplicationFactory<Program>
{
    public TestApplicationFactory()
    {
        Environment.SetEnvironmentVariable("Jwt__Key", "TestJwtSigningKey_AtLeast32Characters_Long");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "TestIssuer");
        Environment.SetEnvironmentVariable("Jwt__Audience", "TestAudience");
        Environment.SetEnvironmentVariable("CatalogSeed__Enabled", "false");
        Environment.SetEnvironmentVariable("AllowedOrigins__0", "http://localhost:3000");
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Server=(localdb)\\mssqllocaldb;Database=MarketyTests;Trusted_Connection=True;");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "TestJwtSigningKey_AtLeast32Characters_Long",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
                ["CatalogSeed:Enabled"] = "false",
                ["ConnectionStrings:DefaultConnection"] = "Server=(localdb)\\mssqllocaldb;Database=MarketyTests;Trusted_Connection=True;",
                ["AllowedOrigins:0"] = "http://localhost:3000"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase($"MarketyAuthTests-{Guid.NewGuid()}"));

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                options.DefaultForbidScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }
}

public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string RoleHeader = "X-Test-Role";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(RoleHeader, out var roles) || string.IsNullOrWhiteSpace(roles))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "test-user"),
            new(ClaimTypes.Name, "Test User")
        };

        foreach (var role in roles.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
