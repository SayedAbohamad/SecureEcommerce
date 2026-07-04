using BackEnd.Models;
using Microsoft.AspNetCore.Identity;

namespace BackEnd.Services;

public static class IdentitySeeder
{
    private static readonly string[] DefaultRoles = ["Admin", "Manager", "Customer"];

    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration, ILogger logger)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var role in DefaultRoles)
        {
            if (await roleManager.RoleExistsAsync(role))
            {
                continue;
            }

            var roleResult = await roleManager.CreateAsync(new IdentityRole(role));
            if (roleResult.Succeeded)
            {
                logger.LogInformation("Seeded identity role {Role}.", role);
                continue;
            }

            logger.LogWarning(
                "Failed to seed identity role {Role}: {Errors}",
                role,
                string.Join("; ", roleResult.Errors.Select(error => error.Description)));
        }

        var adminEmail = configuration["AdminSeed:Email"];
        var adminPassword = configuration["AdminSeed:Password"];
        var adminFullName = configuration["AdminSeed:FullName"] ?? "Markety Admin";

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning("AdminSeed is enabled but AdminSeed:Email or AdminSeed:Password is missing. Admin user was not created.");
            return;
        }

        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = adminFullName,
                CreatedAt = DateTime.UtcNow,
                TwoFactorEnabled = false
            };

            var createResult = await userManager.CreateAsync(admin, adminPassword);
            if (!createResult.Succeeded)
            {
                logger.LogWarning(
                    "Failed to seed admin user {Email}: {Errors}",
                    adminEmail,
                    string.Join("; ", createResult.Errors.Select(error => error.Description)));
                return;
            }

            logger.LogInformation("Seeded admin user {Email}.", adminEmail);
        }

        if (!await userManager.IsInRoleAsync(admin, "Admin"))
        {
            var roleResult = await userManager.AddToRoleAsync(admin, "Admin");
            if (!roleResult.Succeeded)
            {
                logger.LogWarning(
                    "Failed to assign Admin role to {Email}: {Errors}",
                    adminEmail,
                    string.Join("; ", roleResult.Errors.Select(error => error.Description)));
                return;
            }
        }

        logger.LogInformation("Admin seed is ready for {Email}.", adminEmail);
    }
}
