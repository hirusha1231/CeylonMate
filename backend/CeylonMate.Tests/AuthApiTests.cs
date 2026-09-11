using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace CeylonMate.Tests;

public sealed class AuthApiTests : IClassFixture<AuthApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
    private readonly HttpClient _client;

    public AuthApiTests(AuthApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task RegisterLoginAndMe_ReturnExpectedResponses()
    {
        var email = $"traveler-{Guid.NewGuid():N}@example.com";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "StrongPassword!123",
            role = "TRAVELER"
        });

        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var registered = await register.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(registered);
        Assert.Equal(UserRole.TRAVELER, registered.User.Role);

        var login = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "StrongPassword!123"
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var authenticated = await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(authenticated);

        using var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authenticated.AccessToken);
        var me = await _client.SendAsync(meRequest);

        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var currentUser = await me.Content.ReadFromJsonAsync<UserResponse>(JsonOptions);
        Assert.NotNull(currentUser);
        Assert.Equal(email, currentUser.Email);
        Assert.Equal(UserRole.TRAVELER, currentUser.Role);
    }

    [Fact]
    public async Task InvalidRequests_ReturnCorrectStatusCodes()
    {
        var invalid = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "not-an-email",
            password = "short",
            role = "TRAVELER"
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var privileged = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"admin-{Guid.NewGuid():N}@example.com",
            password = "StrongPassword!123",
            role = "ADMIN"
        });
        Assert.Equal(HttpStatusCode.BadRequest, privileged.StatusCode);

        var badLogin = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "missing@example.com",
            password = "wrong"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, badLogin.StatusCode);

        var me = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task DuplicateEmail_ReturnsConflictIgnoringCase()
    {
        var email = $"duplicate-{Guid.NewGuid():N}@example.com";
        var body = new { email, password = "StrongPassword!123", role = "LOCAL_GUIDE" };

        Assert.Equal(HttpStatusCode.Created,
            (await _client.PostAsJsonAsync("/api/auth/register", body)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await _client.PostAsJsonAsync("/api/auth/register", new
            {
                email = email.ToUpperInvariant(),
                password = "StrongPassword!123",
                role = "LOCAL_GUIDE"
            })).StatusCode);
    }
}

public sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"auth-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:CeylonMate"] = "Host=unused",
                ["Jwt:Issuer"] = "CeylonMate.Tests",
                ["Jwt:Audience"] = "CeylonMate.Tests.Client",
                ["Jwt:SigningKey"] = "tests-only-signing-key-with-at-least-32-bytes",
                ["Jwt:ExpirationMinutes"] = "5"
            }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<CeylonMateDbContext>>();
            services.AddDbContext<CeylonMateDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));
        });
    }
}
