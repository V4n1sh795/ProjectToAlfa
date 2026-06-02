using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class fix5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "archiveReason",
                table: "team");

            migrationBuilder.DropColumn(
                name: "status",
                table: "team");

            migrationBuilder.RenameColumn(
                name: "statusReason",
                table: "team",
                newName: "artifacts");

            migrationBuilder.Sql(@"
                ALTER TABLE team 
                ALTER COLUMN comments TYPE text[] 
                USING ARRAY[comments];
            ");

            migrationBuilder.AddColumn<float[]>(
                name: "grades",
                table: "team",
                type: "real[]",
                nullable: false,
                defaultValue: new float[0]);

            migrationBuilder.AddColumn<string>(
                name: "archiveReason",
                table: "Project",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Project",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "statusReason",
                table: "Project",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "profile",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "grades",
                table: "team");

            migrationBuilder.DropColumn(
                name: "archiveReason",
                table: "Project");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Project");

            migrationBuilder.DropColumn(
                name: "statusReason",
                table: "Project");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "profile");

            migrationBuilder.RenameColumn(
                name: "artifacts",
                table: "team",
                newName: "statusReason");

            migrationBuilder.Sql(@"
                ALTER TABLE team 
                ALTER COLUMN comments TYPE text 
                USING comments[1];
            ");

            migrationBuilder.AddColumn<string>(
                name: "archiveReason",
                table: "team",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "team",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
