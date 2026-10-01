using CeylonMate.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations;

[DbContext(typeof(CeylonMateDbContext))]
[Migration("20260929120000_AddTripDurationDaysToBooking")]
public partial class AddTripDurationDaysToBooking : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "TripDurationDays",
            table: "Bookings",
            type: "integer",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "TripDurationDays",
            table: "Bookings");
    }
}