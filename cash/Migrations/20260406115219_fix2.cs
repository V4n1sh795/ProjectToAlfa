using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace cash.Migrations
{
    /// <inheritdoc />
    public partial class fix2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "tasks_id",
                table: "Project");

            migrationBuilder.AddColumn<int[]>(
                name: "Tasks",
                table: "team",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[] { });
            migrationBuilder.CreateTable(
                name: "task",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Status = table.Column<bool>(type: "boolean", nullable: false),
                    Startline = table.Column<DateTime>(type: "date", nullable: false),
                    Deadline = table.Column<DateTime>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_task", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "task");

            migrationBuilder.DropColumn(
                name: "Tasks",
                table: "team");

            migrationBuilder.AddColumn<List<int>>(
                name: "tasks_id",
                table: "Project",
                type: "integer[]",
                nullable: false);
        }
    }
}
