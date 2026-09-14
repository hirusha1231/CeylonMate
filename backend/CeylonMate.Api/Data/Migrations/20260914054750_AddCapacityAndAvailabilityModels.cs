using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCapacityAndAvailabilityModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "attraction_slots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AttractionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MaxCapacity = table.Column<int>(type: "integer", nullable: false),
                    BookedCapacity = table.Column<int>(type: "integer", nullable: false),
                    PriceAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attraction_slots", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "guide_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Bio = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LanguagesSpoken = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    LicenseNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    DailyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guide_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_guide_profiles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transport_options",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    VehicleType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    VehicleModel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LicensePlate = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    PassengerCapacity = table.Column<int>(type: "integer", nullable: false),
                    LuggageCapacity = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transport_options", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transport_options_users_ProviderUserId",
                        column: x => x.ProviderUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "guide_availabilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalGuideUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GuideProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SlotType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MaxCapacity = table.Column<int>(type: "integer", nullable: false),
                    BookedCapacity = table.Column<int>(type: "integer", nullable: false),
                    PriceAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guide_availabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_guide_availabilities_guide_profiles_GuideProfileId",
                        column: x => x.GuideProfileId,
                        principalTable: "guide_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_guide_availabilities_users_LocalGuideUserId",
                        column: x => x.LocalGuideUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transport_slots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransportOptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginDestinationId = table.Column<Guid>(type: "uuid", nullable: true),
                    DestinationId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndTimeUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    VehicleType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TotalSeats = table.Column<int>(type: "integer", nullable: false),
                    AvailableSeats = table.Column<int>(type: "integer", nullable: false),
                    PricePerSeat = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transport_slots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transport_slots_transport_options_TransportOptionId",
                        column: x => x.TransportOptionId,
                        principalTable: "transport_options",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_attraction_slots_AttractionId_StartTimeUtc_EndTimeUtc",
                table: "attraction_slots",
                columns: new[] { "AttractionId", "StartTimeUtc", "EndTimeUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_guide_availabilities_GuideProfileId",
                table: "guide_availabilities",
                column: "GuideProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_guide_availabilities_LocalGuideUserId_StartTimeUtc_EndTimeU~",
                table: "guide_availabilities",
                columns: new[] { "LocalGuideUserId", "StartTimeUtc", "EndTimeUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_guide_profiles_UserId",
                table: "guide_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transport_options_ProviderUserId",
                table: "transport_options",
                column: "ProviderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_transport_slots_TransportOptionId_StartTimeUtc_EndTimeUtc",
                table: "transport_slots",
                columns: new[] { "TransportOptionId", "StartTimeUtc", "EndTimeUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attraction_slots");

            migrationBuilder.DropTable(
                name: "guide_availabilities");

            migrationBuilder.DropTable(
                name: "transport_slots");

            migrationBuilder.DropTable(
                name: "guide_profiles");

            migrationBuilder.DropTable(
                name: "transport_options");
        }
    }
}
