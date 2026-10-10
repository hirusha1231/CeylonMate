using System.Text;
using System.Text.Json.Serialization;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using CeylonMate.Api.Trips;
using CeylonMate.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

ProgramHelper.LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");
builder.Services.AddDbContext<CeylonMateDbContext>(options =>
{
    if (useInMemory)
    {
        options.UseInMemoryDatabase("CeylonMateDevDb")
               .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
    }
    else
    {
        var rawConnStr = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
            ?? Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? Environment.GetEnvironmentVariable("SUPABASE_DB_URL")
            ?? builder.Configuration["DATABASE_CONNECTION_STRING"]
            ?? builder.Configuration["DATABASE_URL"]
            ?? builder.Configuration.GetConnectionString("CeylonMate")
            ?? throw new InvalidOperationException("Supabase / PostgreSQL connection string is required.");

        var normalizedConnStr = ProgramHelper.NormalizePostgresConnectionString(rawConnStr);
        options.UseNpgsql(normalizedConnStr);
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173",
                  "http://127.0.0.1:5173",
                  "http://localhost:3000"
              )
              .SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173",
                  "http://127.0.0.1:5173",
                  "http://localhost:3000"
              )
              .SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(x => Encoding.UTF8.GetByteCount(x.SigningKey) >= 32,
        "Jwt:SigningKey must contain at least 32 UTF-8 bytes.")
    .ValidateOnStart();

builder.Services.AddOptions<SeedUsersOptions>()
    .Bind(builder.Configuration.GetSection(SeedUsersOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(x => !x.Enabled || x.Password.Length >= 12,
        "SeedUsers:Password is required and must be at least 12 characters when seeding is enabled.")
    .ValidateOnStart();
builder.Services.AddScoped<DevelopmentUserSeeder>();

builder.Services.AddHttpClient();
builder.Services.AddScoped<IRoutingAdapter, RoutingAdapter>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<TripService>();
builder.Services.AddScoped<ICapacityReservationService, CapacityReservationService>();
builder.Services.AddScoped<CeylonMate.Api.Destinations.DestinationService>();

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

builder.Services.AddControllers(options =>
{
    var jsonSerializerOptions = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
    jsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.OutputFormatters.RemoveType<Microsoft.AspNetCore.Mvc.Formatters.SystemTextJsonOutputFormatter>();
    options.OutputFormatters.Add(new StreamJsonOutputFormatter(jsonSerializerOptions));
}).AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

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

app.UseCors("AllowFrontend");

app.UseSwagger();
app.UseSwaggerUI();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
    if (db.Database.IsRelational())
    {
        try
        {
            await db.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Automatic migration error: {Message}", ex.Message);
        }

        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE IF EXISTS public.guide_availabilities ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""FullName"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""PhotoUrl"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""Bio"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""LanguagesSpoken"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""Specialties"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""LicenseType"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""IsChauffeur"" boolean NOT NULL DEFAULT false;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""DrivingLicenseClass"" text NULL;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""Rating"" numeric(18,2) NOT NULL DEFAULT 0;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""ReviewCount"" integer NOT NULL DEFAULT 0;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""DefaultDailyRateLkr"" numeric(18,2) NOT NULL DEFAULT 0;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""DailyRate"" numeric(18,2) NOT NULL DEFAULT 0;
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""Currency"" character varying(10) NOT NULL DEFAULT 'LKR';
                    ALTER TABLE IF EXISTS public.guide_profiles ADD COLUMN IF NOT EXISTS ""IsActive"" boolean NOT NULL DEFAULT true;
                    
                    CREATE TABLE IF NOT EXISTS public.guide_availabilities (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""LocalGuideUserId"" uuid NOT NULL,
                        ""GuideProfileId"" uuid NULL,
                        ""StartTimeUtc"" timestamp with time zone NOT NULL,
                        ""EndTimeUtc"" timestamp with time zone NOT NULL,
                        ""SlotType"" character varying(32) NOT NULL,
                        ""Status"" character varying(32) NOT NULL,
                        ""MaxCapacity"" integer NOT NULL DEFAULT 1,
                        ""BookedCapacity"" integer NOT NULL DEFAULT 0,
                        ""PriceAmount"" numeric(18,2) NOT NULL,
                        ""Currency"" character varying(3) NOT NULL DEFAULT 'LKR',
                        ""Notes"" character varying(500) NULL,
                        ""HeldUntilUtc"" timestamp with time zone NULL,
                        ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                        ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                        ""RowVersion"" bytea NOT NULL
                    );

                    ALTER TABLE IF EXISTS public.guide_availabilities ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS ""VehicleCatalogId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.transport_slots ADD COLUMN IF NOT EXISTS ""RouteDescription"" text NULL;
                    ALTER TABLE IF EXISTS public.attraction_slots ADD COLUMN IF NOT EXISTS ""HeldUntilUtc"" timestamp with time zone NULL;
                    
                    CREATE TABLE IF NOT EXISTS public.signature_journeys (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""Title"" character varying(250) NOT NULL,
                        ""Slug"" character varying(250) NOT NULL,
                        ""Tagline"" text NOT NULL,
                        ""Description"" text NOT NULL,
                        ""HeroImageUrl"" text NOT NULL,
                        ""GalleryImages"" text NOT NULL,
                        ""DurationDays"" integer NOT NULL,
                        ""DurationNights"" integer NOT NULL,
                        ""StartingPriceUsd"" numeric(18,2) NOT NULL,
                        ""StartingPriceLkr"" numeric(18,2) NOT NULL,
                        ""DestinationsCovered"" text NOT NULL,
                        ""Highlights"" text NOT NULL,
                        ""IsPublished"" boolean NOT NULL DEFAULT true,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NOT NULL
                    );

                    ALTER TABLE IF EXISTS public.vehicle_fleet_catalogs ADD COLUMN IF NOT EXISTS ""Currency"" character varying(10) NOT NULL DEFAULT 'USD';

                    CREATE TABLE IF NOT EXISTS public.vehicle_fleet_catalogs (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""CategoryBadge"" character varying(150) NOT NULL,
                        ""VehicleModel"" character varying(200) NOT NULL,
                        ""Description"" text NOT NULL,
                        ""ImageUrl"" text NOT NULL,
                        ""MaxPassengers"" integer NOT NULL,
                        ""FeatureHighlight"" text NOT NULL,
                        ""LuggageCapacity"" text NOT NULL,
                        ""DailyRateUsd"" numeric(18,2) NULL,
                        ""Currency"" character varying(10) NOT NULL DEFAULT 'USD',
                        ""IsActive"" boolean NOT NULL DEFAULT true,
                        ""DisplayOrder"" integer NOT NULL DEFAULT 0,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NOT NULL
                    );

                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleCapacityStatus"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectionReason"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectedByUserId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""CapacityRejectedAtUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""AgentNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteLkr"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteUsd"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""VehicleCatalogId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PackageId"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TripDurationDays"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PassengerCount"" integer NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""StartDate"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""PickupTime"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TravelerNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideAssignmentStatus"" text NOT NULL DEFAULT 'PENDING_GUIDE_ACCEPTANCE';
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideResponseMessage"" text NULL;
                    ALTER TABLE IF EXISTS public.""Bookings"" ADD COLUMN IF NOT EXISTS ""GuideRespondedAtUtc"" timestamp with time zone NULL;

                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleCapacityStatus"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectionReason"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectedByUserId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""CapacityRejectedAtUtc"" timestamp with time zone NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""AgentNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteLkr"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""FinalPriceQuoteUsd"" numeric(18,2) NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleSlotId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""VehicleCatalogId"" uuid NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PackageId"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""TripDurationDays"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PassengerCount"" integer NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""StartDate"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""PickupTime"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""TravelerNotes"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideAssignmentStatus"" text NOT NULL DEFAULT 'PENDING_GUIDE_ACCEPTANCE';
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideResponseMessage"" text NULL;
                    ALTER TABLE IF EXISTS public.bookings ADD COLUMN IF NOT EXISTS ""GuideRespondedAtUtc"" timestamp with time zone NULL;

                    CREATE TABLE IF NOT EXISTS public.guide_availability_slots (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""GuideProfileId"" uuid NOT NULL,
                        ""Date"" timestamp with time zone NOT NULL,
                        ""TimeWindow"" text NOT NULL,
                        ""Status"" text NOT NULL,
                        ""DailyRateLkr"" numeric(18,2) NOT NULL,
                        ""AssignedBookingId"" uuid NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL,
                        ""UpdatedAt"" timestamp with time zone NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS public.guide_field_reports (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""GuideProfileId"" uuid NOT NULL,
                        ""BookingId"" integer NULL,
                        ""Location"" text NOT NULL,
                        ""WeatherStatus"" text NOT NULL,
                        ""CrowdLevel"" text NOT NULL,
                        ""ConditionNote"" text NOT NULL,
                        ""CreatedAt"" timestamp with time zone NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS public.capacity_notifications (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""BookingId"" integer NOT NULL,
                        ""VehicleSlotId"" uuid NOT NULL,
                        ""Title"" text NOT NULL,
                        ""Message"" text NOT NULL,
                        ""IsRead"" boolean NOT NULL DEFAULT false,
                        ""CreatedAt"" timestamp with time zone NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS public.notifications (
                        ""Id"" uuid NOT NULL PRIMARY KEY,
                        ""RecipientUserId"" uuid NOT NULL,
                        ""RecipientRole"" text NOT NULL,
                        ""BookingId"" integer NOT NULL,
                        ""Type"" text NOT NULL,
                        ""Title"" text NOT NULL,
                        ""Message"" text NOT NULL,
                        ""IsRead"" boolean NOT NULL DEFAULT false,
                        ""CreatedAt"" timestamp with time zone NOT NULL
                    );
                    ALTER TABLE public.""Bookings"" ADD COLUMN IF NOT EXISTS ""TravelerUserId"" text;
                ");
        }
        catch (Npgsql.PostgresException pex)
        {
            app.Logger.LogWarning(pex, "PostgreSQL connection/authentication failed ({Message}). Set 'UseInMemoryDatabase: true' in appsettings.Development.json or update your PostgreSQL password in ConnectionStrings:CeylonMate.", pex.MessageText);
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Relational database migration skipped due to connection error: {Message}", ex.Message);
        }
    }
    else
    {
        await db.Database.EnsureCreatedAsync();
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Bookings\" ADD COLUMN IF NOT EXISTS \"TravelerUserId\" text;");
    }
    catch { }



    var seedOptions = scope.ServiceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<SeedUsersOptions>>().Value;
    if (seedOptions.Enabled)
    {
        await scope.ServiceProvider.GetRequiredService<DevelopmentUserSeeder>().SeedAsync();
    }
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();

public partial class Program;

public sealed class StreamJsonOutputFormatter : Microsoft.AspNetCore.Mvc.Formatters.TextOutputFormatter
{
    private readonly System.Text.Json.JsonSerializerOptions _jsonOptions;

    public StreamJsonOutputFormatter(System.Text.Json.JsonSerializerOptions options)
    {
        _jsonOptions = options;
        SupportedMediaTypes.Add(Microsoft.Net.Http.Headers.MediaTypeHeaderValue.Parse("application/json"));
        SupportedMediaTypes.Add(Microsoft.Net.Http.Headers.MediaTypeHeaderValue.Parse("text/json"));
        SupportedMediaTypes.Add(Microsoft.Net.Http.Headers.MediaTypeHeaderValue.Parse("*/*"));
        SupportedEncodings.Add(Encoding.UTF8);
    }

    protected override bool CanWriteType(Type? type) => true;

    public override async Task WriteResponseBodyAsync(Microsoft.AspNetCore.Mvc.Formatters.OutputFormatterWriteContext context, Encoding selectedEncoding)
    {
        var response = context.HttpContext.Response;
        var type = context.ObjectType ?? context.Object?.GetType() ?? typeof(object);
        await System.Text.Json.JsonSerializer.SerializeAsync(response.Body, context.Object, type, _jsonOptions, context.HttpContext.RequestAborted);
    }
}

public static partial class ProgramHelper
{
    public static void LoadDotEnv()
    {
        var currentDir = Directory.GetCurrentDirectory();
        var candidates = new[]
        {
            Path.Combine(currentDir, ".env"),
            Path.Combine(currentDir, "backend", ".env"),
            Path.Combine(currentDir, "..", ".env"),
            Path.Combine(AppContext.BaseDirectory, ".env"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "backend", ".env")
        };

        foreach (var path in candidates)
        {
            if (File.Exists(path))
            {
                foreach (var line in File.ReadAllLines(path))
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
                        continue;

                    var eqIdx = trimmed.IndexOf('=');
                    if (eqIdx > 0)
                    {
                        var key = trimmed.Substring(0, eqIdx).Trim();
                        var val = trimmed.Substring(eqIdx + 1).Trim().Trim('"', '\'');
                        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                        {
                            Environment.SetEnvironmentVariable(key, val);
                        }
                    }
                }
            }
        }
    }

    public static string NormalizePostgresConnectionString(string rawConnStr)
    {
        if (string.IsNullOrWhiteSpace(rawConnStr))
            return rawConnStr;

        rawConnStr = rawConnStr.Trim().Trim('"', '\'');

        if (rawConnStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            rawConnStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var schemeEnd = rawConnStr.IndexOf("://", StringComparison.Ordinal);
            var withoutScheme = rawConnStr.Substring(schemeEnd + 3);

            var queryIdx = withoutScheme.IndexOf('?');
            if (queryIdx >= 0)
            {
                withoutScheme = withoutScheme.Substring(0, queryIdx);
            }

            var atIdx = withoutScheme.LastIndexOf('@');
            if (atIdx >= 0)
            {
                var userInfo = withoutScheme.Substring(0, atIdx);
                var hostAndPath = withoutScheme.Substring(atIdx + 1);

                var colonIdx = userInfo.IndexOf(':');
                var user = colonIdx >= 0 ? userInfo.Substring(0, colonIdx) : userInfo;
                var password = colonIdx >= 0 ? userInfo.Substring(colonIdx + 1) : "";

                var slashIdx = hostAndPath.IndexOf('/');
                var hostPort = slashIdx >= 0 ? hostAndPath.Substring(0, slashIdx) : hostAndPath;
                var database = slashIdx >= 0 ? hostAndPath.Substring(slashIdx + 1) : "postgres";

                var hostColonIdx = hostPort.IndexOf(':');
                var host = hostColonIdx >= 0 ? hostPort.Substring(0, hostColonIdx) : hostPort;
                var port = hostColonIdx >= 0 ? hostPort.Substring(hostColonIdx + 1) : "5432";

                user = Uri.UnescapeDataString(user);
                password = Uri.UnescapeDataString(password);

                return $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
            }
        }

        if (!rawConnStr.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase) &&
            (rawConnStr.Contains("supabase.co", StringComparison.OrdinalIgnoreCase) ||
             rawConnStr.Contains("supabase.com", StringComparison.OrdinalIgnoreCase)))
        {
            rawConnStr += ";SSL Mode=Require;Trust Server Certificate=true;";
        }

        return rawConnStr;
    }
}
