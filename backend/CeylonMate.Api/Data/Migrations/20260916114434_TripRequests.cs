using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TripRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "traveler_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitorCategory = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Preferences = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_traveler_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_traveler_profiles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trip_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TravelerProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    TravelerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Objective = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Budget = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    PartySize = table.Column<int>(type: "integer", nullable: false),
                    StartingLatitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    StartingLongitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    AccessibilityNeeds = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_requests", x => x.Id);
                    table.CheckConstraint("CK_trip_requests_budget_party", "\"Budget\" > 0 AND \"PartySize\" > 0 AND \"EndDate\" >= \"StartDate\"");
                    table.ForeignKey(
                        name: "FK_trip_requests_traveler_profiles_TravelerProfileId",
                        column: x => x.TravelerProfileId,
                        principalTable: "traveler_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trip_requests_users_TravelerId",
                        column: x => x.TravelerId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trip_request_status_histories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ToStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ChangedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_request_status_histories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trip_request_status_histories_trip_requests_TripRequestId",
                        column: x => x.TripRequestId,
                        principalTable: "trip_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trip_request_status_histories_users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "workflow_executions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_executions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_workflow_executions_trip_requests_TripRequestId",
                        column: x => x.TripRequestId,
                        principalTable: "trip_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_workflow_executions_users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_traveler_profiles_UserId",
                table: "traveler_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trip_request_status_histories_ChangedByUserId",
                table: "trip_request_status_histories",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_trip_request_status_histories_TripRequestId_ChangedAtUtc",
                table: "trip_request_status_histories",
                columns: new[] { "TripRequestId", "ChangedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_trip_requests_Status_StartDate",
                table: "trip_requests",
                columns: new[] { "Status", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_trip_requests_TravelerId_CreatedAtUtc",
                table: "trip_requests",
                columns: new[] { "TravelerId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_trip_requests_TravelerProfileId",
                table: "trip_requests",
                column: "TravelerProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_executions_RequestedByUserId",
                table: "workflow_executions",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_executions_TripRequestId_CreatedAtUtc",
                table: "workflow_executions",
                columns: new[] { "TripRequestId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trip_request_status_histories");

            migrationBuilder.DropTable(
                name: "workflow_executions");

            migrationBuilder.DropTable(
                name: "trip_requests");

            migrationBuilder.DropTable(
                name: "traveler_profiles");
        }
    }
}
