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

var builder = WebApplication.CreateBuilder(args);

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
        var connStr = builder.Configuration.GetConnectionString("CeylonMate")
            ?? throw new InvalidOperationException("ConnectionStrings:CeylonMate is required.");
        options.UseNpgsql(connStr);
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<CeylonMateDbContext>();
    if (db.Database.IsRelational())
    {
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

    // Seed Initial Signature Journeys if empty
    try
    {
        if (!await db.SignatureJourneys.AnyAsync())
        {
            db.SignatureJourneys.AddRange(
                new CeylonMate.Api.Models.SignatureJourney
                {
                    Id = Guid.NewGuid(),
                    Title = "Cultural Triangle & Royal Heritage",
                    Slug = "cultural-triangle-royal-heritage",
                    Tagline = "A 7-Day Royal Expedition Across Ancient Capitals, Sacred Relics & High Tea Slopes",
                    Description = "Ascend to the ancient clouds of Sigiriya Rock Fortress before traversing lush emerald tea slopes in Ceylon's luxury highlands. Experience colonial heritage luxury in private tea planter bungalows combined with exclusive private chauffeur travel.",
                    HeroImageUrl = "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop",
                    GalleryImages = new List<string>
                    {
                        "https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=800&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=800&auto=format&fit=crop"
                    },
                    DurationDays = 7,
                    DurationNights = 6,
                    StartingPriceUsd = 2450.00m,
                    StartingPriceLkr = 750000.00m,
                    DestinationsCovered = "Sigiriya, Kandy, Nuwara Eliya, Colombo",
                    Highlights = new List<string>
                    {
                        "Private chartered helicopter option to Sigiriya Rock fortress",
                        "VIP access to Temple of the Tooth Relic sacred vault",
                        "Highland Tea Tasting Masterclass with a Senior Ceylon Planter",
                        "Private luxury chauffeur guide throughout the journey"
                    },
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.SignatureJourney
                {
                    Id = Guid.NewGuid(),
                    Title = "Wild Safaris & Southern Coastal Sanctuary",
                    Slug = "wild-safaris-southern-coastal",
                    Tagline = "Immerse in Leopard Trackings at Yala National Park & Luxury Cliffside Ocean Living",
                    Description = "Unrivalled luxury wildlife exploration paired with pristine Indian Ocean coastline retreat. Encounter leopards, sloth bears, and blue whales under expert private guide supervision.",
                    HeroImageUrl = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1600&auto=format&fit=crop",
                    GalleryImages = new List<string>
                    {
                        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=800&auto=format&fit=crop"
                    },
                    DurationDays = 10,
                    DurationNights = 9,
                    StartingPriceUsd = 3800.00m,
                    StartingPriceLkr = 1150000.00m,
                    DestinationsCovered = "Yala National Park, Weligama, Galle Fort, Mirissa",
                    Highlights = new List<string>
                    {
                        "Private 4x4 Leopard Tracker Game Drives in Yala Block 1",
                        "Exclusive sunset catamaran yacht trip along Mirissa coast",
                        "Private architectural walk inside 16th-century Galle Fort",
                        "Oceanfront villa accommodation with personal butler service"
                    },
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Signature journeys seeding failed: {Message}", ex.Message);
    }

    // Seed Initial Vehicle Fleet Catalog Showcase if empty
    try
    {
        if (!await db.VehicleFleetCatalogs.AnyAsync())
        {
            db.VehicleFleetCatalogs.AddRange(
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "EXECUTIVE VIP GROUP TRANSPORT",
                    VehicleModel = "Toyota KDH Super GL VIP Van",
                    Description = "Ideal for families and luxury groups. Dual climate control, plush leather reclining armchairs, high-speed onboard 5G Wi-Fi, and spacious luggage capacity.",
                    ImageUrl = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 6,
                    FeatureHighlight = "VIP Leather Interior & 5G Wi-Fi",
                    LuggageCapacity = "6 Large Luggage",
                    DailyRateUsd = 120.00m,
                    IsActive = true,
                    DisplayOrder = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "PRESTIGE EXECUTIVE SEDAN",
                    VehicleModel = "Mercedes-Benz E-Class Sedan",
                    Description = "Unmatched elegance for couples and solo executive travelers. Whisper-quiet cabin acoustics, leather seating, and smooth transit along coastal expressways.",
                    ImageUrl = "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 3,
                    FeatureHighlight = "Prestige Leather Comfort",
                    LuggageCapacity = "3 Large Luggage",
                    DailyRateUsd = 150.00m,
                    IsActive = true,
                    DisplayOrder = 2,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "4X4 SAFARI & EXPEDITION",
                    VehicleModel = "Toyota Land Cruiser V8 Safari",
                    Description = "Heavy-duty luxury 4x4 modified for Yala and Udawalawe national park tracking. High elevation seating with pop-up roof for wildlife photography.",
                    ImageUrl = "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 5,
                    FeatureHighlight = "High-Clearance 4x4",
                    LuggageCapacity = "4 Large Luggage",
                    DailyRateUsd = 180.00m,
                    IsActive = true,
                    DisplayOrder = 3,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "VIP COACH TRANSPORT",
                    VehicleModel = "Toyota Coaster VIP Minibus",
                    Description = "Ideal for private delegation groups. Equipped with dual AC, microphone, panoramic windows, and dedicated luggage compartment.",
                    ImageUrl = "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 14,
                    FeatureHighlight = "Panoramic VIP Coach",
                    LuggageCapacity = "12 Large Luggage",
                    DailyRateUsd = 250.00m,
                    IsActive = true,
                    DisplayOrder = 4,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "PREMIUM LUXURY SUV",
                    VehicleModel = "Range Rover Autobiography V8 SUV",
                    Description = "Supreme luxury for executive VIPs. All-wheel drive terrain response, massage executive seating, and ultra-quiet ride.",
                    ImageUrl = "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 4,
                    FeatureHighlight = "Executive Lounge Seating",
                    LuggageCapacity = "4 Large Luggage",
                    DailyRateUsd = 220.00m,
                    IsActive = true,
                    DisplayOrder = 5,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CeylonMate.Api.Models.VehicleFleetCatalog
                {
                    Id = Guid.NewGuid(),
                    CategoryBadge = "LUXURY DELEGATION BUS",
                    VehicleModel = "Volvo B11R Super VIP Coach",
                    Description = "Ultra-capacity luxury coach for large tour delegations with reclining leather seats, onboard lavatory, and climate zones.",
                    ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80",
                    MaxPassengers = 30,
                    FeatureHighlight = "Air Suspension & Sky Lounge",
                    LuggageCapacity = "25 Large Luggage",
                    DailyRateUsd = 350.00m,
                    IsActive = true,
                    DisplayOrder = 6,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Vehicle fleet catalog seeding failed: {Message}", ex.Message);
    }

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
