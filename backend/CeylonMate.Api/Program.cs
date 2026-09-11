using System.Text;
using System.Text.Json.Serialization;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CeylonMateDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("CeylonMate")
        ?? throw new InvalidOperationException(
            "ConnectionStrings:CeylonMate is required. Set ConnectionStrings__CeylonMate in the environment.")));
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(x => Encoding.UTF8.GetByteCount(x.SigningKey) >= 32,
        "Jwt:SigningKey must contain at least 32 UTF-8 bytes.")
    .ValidateOnStart();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOptions<SeedUsersOptions>()
        .Bind(builder.Configuration.GetSection(SeedUsersOptions.SectionName))
        .ValidateDataAnnotations()
        .Validate(x => !x.Enabled || x.Password.Length >= 12,
            "SeedUsers:Password is required and must be at least 12 characters when seeding is enabled.")
        .ValidateOnStart();
    builder.Services.AddScoped<DevelopmentUserSeeder>();
}

builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("JWT configuration is required.");
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "email",
            RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        };
    });
builder.Services.AddAuthorization(options =>
{
    foreach (var role in Enum.GetValues<UserRole>())
    {
        options.AddPolicy($"Require{role}", policy => policy.RequireRole(role.ToString()));
    }
});
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "CeylonMate API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = Array.Empty<string>()
    });
});
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    await using var scope = app.Services.CreateAsyncScope();
    var seedOptions = scope.ServiceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<SeedUsersOptions>>().Value;
    if (seedOptions.Enabled)
    {
        var db = scope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
        await db.Database.MigrateAsync();
        await scope.ServiceProvider.GetRequiredService<DevelopmentUserSeeder>().SeedAsync();
    }
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

public partial class Program;
