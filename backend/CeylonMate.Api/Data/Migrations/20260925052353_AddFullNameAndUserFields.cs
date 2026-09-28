using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CeylonMate.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFullNameAndUserFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_attraction_slots_attractions_AttractionId",
                table: "attraction_slots",
                column: "AttractionId",
                principalTable: "attractions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_attraction_slots_attractions_AttractionId",
                table: "attraction_slots");

            migrationBuilder.DropColumn(
                name: "FullName",
                table: "users");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "users");
        }
    }
}
