using System.Text.Json;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services;

public static class CatalogSeeder
{
    private sealed record SeedProduct(
        string Name,
        string Slug,
        string Category,
        string Description,
        decimal Price,
        int Stock,
        string Image,
        string[]? Options = null);

    private static readonly string[] CategoryNames =
    [
        "Laptops",
        "Gaming PCs",
        "PC Components",
        "Graphics Cards",
        "RAM",
        "Keyboards",
        "Mice",
        "Monitors",
        "Storage",
        "Headsets & Accessories"
    ];

    private static SeedProduct P(
        string name,
        string slug,
        string category,
        string description,
        decimal price,
        int stock,
        string image,
        string[]? options = null) =>
        new(name, slug, category, description, price, stock, $"/images/catalog/{image}.svg", options);

    private static readonly SeedProduct[] Products =
    [
        P("ASUS ROG Strix G16 Gaming Laptop", "asus-rog-strix-g16-gaming-laptop", "Laptops", "High-performance 16-inch gaming laptop with an Intel Core i7 processor, NVIDIA RTX graphics, DDR5 memory, and a fast 165Hz display.", 78999m, 18, "laptops", ["16GB / 1TB", "32GB / 1TB"]),
        P("Lenovo Legion 5 Pro", "lenovo-legion-5-pro", "Laptops", "Powerful gaming and creation laptop with a color-accurate high-refresh display, advanced cooling, and premium RTX graphics.", 72499m, 15, "laptops", ["16GB / 1TB", "32GB / 1TB"]),
        P("Dell XPS 15", "dell-xps-15", "Laptops", "Premium productivity laptop featuring a sharp edge-to-edge display, strong performance, excellent build quality, and all-day portability.", 82000m, 10, "laptops", ["16GB / 512GB", "32GB / 1TB"]),
        P("HP Victus Gaming Laptop", "hp-victus-gaming-laptop", "Laptops", "Balanced gaming laptop with dedicated NVIDIA graphics, a fast 144Hz screen, responsive storage, and efficient cooling.", 48999m, 24, "laptops", ["16GB / 512GB", "16GB / 1TB"]),
        P("MacBook Air M2", "macbook-air-m2", "Laptops", "Thin and lightweight Apple laptop powered by the M2 chip with silent performance, a vivid Liquid Retina display, and long battery life.", 54999m, 12, "laptops", ["8GB / 256GB", "16GB / 512GB"]),
        P("Acer Nitro 5", "acer-nitro-5", "Laptops", "Accessible gaming laptop with RTX graphics, a high-refresh display, dual-fan cooling, and upgrade-friendly memory and storage.", 45500m, 20, "laptops", ["16GB / 512GB", "16GB / 1TB"]),

        P("Markety RTX Gaming PC", "markety-rtx-gaming-pc", "Gaming PCs", "Ready-to-play gaming desktop with RTX graphics, a modern multi-core processor, 32GB memory, and a fast 1TB NVMe SSD.", 69999m, 9, "gaming-pcs", ["RTX 4060", "RTX 4070"]),
        P("Ryzen 7 Custom Gaming Build", "ryzen-7-custom-gaming-build", "Gaming PCs", "Custom Ryzen 7 gaming tower tuned for smooth 1440p gameplay, streaming, and reliable thermals under sustained load.", 62500m, 8, "gaming-pcs", ["16GB / 1TB", "32GB / 2TB"]),
        P("Intel Core i7 Creator PC", "intel-core-i7-creator-pc", "Gaming PCs", "Creator-focused desktop with an Intel Core i7 processor, dedicated RTX graphics, generous memory, and quiet professional cooling.", 74999m, 7, "gaming-pcs", ["RTX 4060 Ti", "RTX 4070 Super"]),
        P("Budget Gaming PC GTX Edition", "budget-gaming-pc-gtx-edition", "Gaming PCs", "Affordable 1080p gaming desktop with capable GTX graphics, a six-core processor, SSD storage, and an upgrade-ready case.", 32999m, 14, "gaming-pcs", ["512GB SSD", "1TB SSD"]),

        P("AMD Ryzen 7 7800X3D Processor", "amd-ryzen-7-7800x3d-processor", "PC Components", "Eight-core AM5 gaming processor with 3D V-Cache technology and outstanding frame-rate performance.", 24999m, 21, "components"),
        P("Intel Core i7-14700K Processor", "intel-core-i7-14700k-processor", "PC Components", "High-end hybrid desktop processor designed for demanding games, content creation, and enthusiast builds.", 22500m, 17, "components"),
        P("ASUS TUF Gaming B650-PLUS WiFi", "asus-tuf-gaming-b650-plus-wifi", "PC Components", "Durable AM5 motherboard with PCIe 5.0 support, strong power delivery, Wi-Fi, and comprehensive cooling controls.", 11999m, 19, "components"),
        P("Corsair RM850e 850W Power Supply", "corsair-rm850e-850w-power-supply", "PC Components", "Fully modular 80 Plus Gold power supply with quiet operation and modern GPU support.", 7999m, 26, "components"),
        P("NZXT H5 Flow Mid-Tower Case", "nzxt-h5-flow-mid-tower-case", "PC Components", "Airflow-focused PC case with tempered glass, smart cable management, and support for powerful components.", 8499m, 16, "components", ["Black", "White"]),

        P("NVIDIA GeForce RTX 4060", "nvidia-geforce-rtx-4060", "Graphics Cards", "Efficient 1080p and 1440p graphics card with ray tracing, DLSS frame generation, AV1 encoding, and 8GB VRAM.", 22999m, 25, "graphics-cards"),
        P("NVIDIA GeForce RTX 4070 Super", "nvidia-geforce-rtx-4070-super", "Graphics Cards", "Powerful 1440p GPU delivering excellent ray-traced gaming, creator acceleration, and high-refresh performance.", 39999m, 13, "graphics-cards"),
        P("NVIDIA GeForce RTX 4080", "nvidia-geforce-rtx-4080", "Graphics Cards", "Enthusiast graphics card built for premium 4K gaming, accelerated rendering, and demanding AI workloads.", 79999m, 6, "graphics-cards"),
        P("AMD Radeon RX 7800 XT", "amd-radeon-rx-7800-xt", "Graphics Cards", "High-value 1440p gaming card with 16GB VRAM, strong raster performance, and efficient cooling.", 34999m, 11, "graphics-cards"),
        P("ASUS Dual RTX 3060", "asus-dual-rtx-3060", "Graphics Cards", "Reliable dual-fan graphics card with 12GB VRAM for smooth 1080p gaming and creative applications.", 18999m, 22, "graphics-cards"),

        P("Corsair Vengeance 16GB DDR4", "corsair-vengeance-16gb-ddr4", "RAM", "Reliable dual-channel DDR4 memory kit with strong everyday performance and low-profile heat spreaders.", 2499m, 48, "ram", ["3200MHz", "3600MHz"]),
        P("Kingston Fury Beast 32GB DDR5", "kingston-fury-beast-32gb-ddr5", "RAM", "Fast 32GB DDR5 desktop memory kit with stable performance and a clean heat-spreader design.", 5999m, 37, "ram", ["5200MHz", "6000MHz"]),
        P("Crucial 16GB Laptop RAM", "crucial-16gb-laptop-ram", "RAM", "Easy laptop memory upgrade that improves multitasking, application responsiveness, and productivity.", 2199m, 44, "ram", ["DDR4 3200MHz", "DDR5 4800MHz"]),
        P("G.Skill Trident Z RGB 32GB", "gskill-trident-z-rgb-32gb", "RAM", "Performance memory kit with customizable RGB lighting and excellent overclocking headroom.", 6499m, 28, "ram", ["DDR4 3600MHz", "DDR5 6000MHz"]),

        P("Logitech G Pro Mechanical Keyboard", "logitech-g-pro-mechanical-keyboard", "Keyboards", "Compact tournament-ready mechanical keyboard with responsive switches, detachable cable, and programmable lighting.", 5999m, 31, "keyboards", ["GX Blue", "GX Red"]),
        P("Redragon K552 RGB Keyboard", "redragon-k552-rgb-keyboard", "Keyboards", "Compact mechanical gaming keyboard with tactile switches, metal construction, and vibrant RGB lighting.", 1799m, 58, "keyboards", ["Black", "White"]),
        P("Razer BlackWidow V4", "razer-blackwidow-v4", "Keyboards", "Premium mechanical keyboard with immersive RGB, media controls, macro keys, and a wrist rest.", 7499m, 20, "keyboards", ["Green Switch", "Yellow Switch"]),
        P("HyperX Alloy Origins", "hyperx-alloy-origins", "Keyboards", "Full aluminum mechanical keyboard with compact dimensions, exposed RGB switches, and onboard profiles.", 4299m, 33, "keyboards", ["Aqua", "Red"]),

        P("Logitech G502 Hero", "logitech-g502-hero", "Mice", "Iconic wired gaming mouse with a high-precision sensor, adjustable weights, and programmable buttons.", 2699m, 52, "mice"),
        P("Razer DeathAdder V3", "razer-deathadder-v3", "Mice", "Lightweight ergonomic gaming mouse with an advanced optical sensor and fast switches.", 4499m, 29, "mice", ["Wired", "Wireless"]),
        P("SteelSeries Rival 3", "steelseries-rival-3", "Mice", "Durable lightweight gaming mouse with true 1-to-1 tracking and customizable RGB illumination.", 1899m, 46, "mice", ["Black", "White"]),
        P("Redragon M711 Cobra", "redragon-m711-cobra", "Mice", "Affordable programmable gaming mouse with adjustable DPI, seven buttons, and vivid RGB lighting.", 999m, 67, "mice"),

        P("Samsung Odyssey G5 27-inch", "samsung-odyssey-g5-27-inch", "Monitors", "Curved QHD gaming monitor with a fast 144Hz refresh rate, low response time, and adaptive sync.", 14999m, 18, "monitors"),
        P("LG UltraGear 24-inch 144Hz", "lg-ultragear-24-inch-144hz", "Monitors", "Responsive Full HD gaming display with 144Hz motion, low input lag, adaptive sync, and vivid IPS color.", 8999m, 27, "monitors"),
        P("ASUS TUF Gaming Monitor", "asus-tuf-gaming-monitor", "Monitors", "Fast gaming monitor with motion reduction, adaptive sync, ergonomic adjustment, and rich color.", 12499m, 16, "monitors", ["24-inch FHD", "27-inch QHD"]),
        P("Dell 27-inch IPS Monitor", "dell-27-inch-ips-monitor", "Monitors", "Clean productivity monitor with wide viewing angles, accurate IPS color, slim bezels, and versatile connectivity.", 10499m, 22, "monitors", ["Full HD", "QHD"]),

        P("Samsung 980 Pro 1TB NVMe SSD", "samsung-980-pro-1tb-nvme-ssd", "Storage", "High-speed PCIe 4.0 NVMe SSD with fast reads, strong sustained performance, and dependable thermals.", 5499m, 35, "storage", ["1TB", "2TB"]),
        P("Kingston NV2 1TB SSD", "kingston-nv2-1tb-ssd", "Storage", "Compact NVMe drive that delivers responsive boot times, fast game loading, and excellent value.", 3299m, 49, "storage", ["500GB", "1TB", "2TB"]),
        P("Crucial BX500 500GB SSD", "crucial-bx500-500gb-ssd", "Storage", "Affordable SATA SSD upgrade that improves startup, application loading, and file transfers.", 1899m, 61, "storage", ["500GB", "1TB"]),
        P("Seagate Barracuda 2TB HDD", "seagate-barracuda-2tb-hdd", "Storage", "Dependable high-capacity desktop hard drive for game libraries, media, and backups.", 2999m, 42, "storage", ["2TB", "4TB"]),

        P("HyperX Cloud II Gaming Headset", "hyperx-cloud-ii-gaming-headset", "Headsets & Accessories", "Comfortable gaming headset with virtual surround sound, a detachable microphone, and a durable aluminum frame.", 3999m, 34, "accessories", ["Black / Red", "Gunmetal"]),
        P("Logitech G435 Wireless Headset", "logitech-g435-wireless-headset", "Headsets & Accessories", "Lightweight wireless headset with low-latency connectivity, Bluetooth, and comfortable all-day wear.", 3499m, 30, "accessories", ["Black", "White"]),
        P("Razer Kraken X", "razer-kraken-x", "Headsets & Accessories", "Ultra-light gaming headset with clear positional audio, a flexible microphone, and memory-foam cushions.", 2299m, 39, "accessories"),
        P("RGB Extended Mouse Pad", "rgb-extended-mouse-pad", "Headsets & Accessories", "Large desk mat with smooth tracking, stitched edges, a non-slip base, and RGB edge lighting.", 899m, 73, "accessories", ["800mm", "900mm"]),
        P("Aluminum Laptop Cooling Stand", "aluminum-laptop-cooling-stand", "Headsets & Accessories", "Adjustable aluminum laptop stand that improves ergonomics and airflow while keeping your setup stable.", 1299m, 55, "accessories"),
        P("7-in-1 USB-C Hub", "7-in-1-usb-c-hub", "Headsets & Accessories", "Portable USB-C hub with HDMI, USB, card-reader, and power-delivery connections.", 1599m, 64, "accessories")
    ];

    public static async Task SynchronizeAsync(ApplicationDbContext context, ILogger logger)
    {
        if (!await context.Database.CanConnectAsync())
        {
            logger.LogWarning("Tech catalog synchronization skipped because the database is unavailable.");
            return;
        }

        var categories = await context.categories
            .OrderBy(category => category.CreatedAt)
            .ThenBy(category => category.Id)
            .ToListAsync();
        var products = await context.products
            .OrderBy(product => product.CreatedAt)
            .ThenBy(product => product.Id)
            .ToListAsync();

        var seedSlugs = Products.Select(product => product.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var alreadyConverted =
            CategoryNames.All(name => categories.Any(category => category.Name.Equals(name, StringComparison.OrdinalIgnoreCase))) &&
            products.Any(product =>
                !string.IsNullOrWhiteSpace(product.Slug) &&
                seedSlugs.Contains(product.Slug));

        if (alreadyConverted)
        {
            logger.LogInformation("Tech catalog is already initialized.");
            return;
        }

        var assignedCategoryIds = new HashSet<Guid>();
        var categoryMap = new Dictionary<string, Category>(StringComparer.OrdinalIgnoreCase);

        foreach (var name in CategoryNames)
        {
            var match = categories.FirstOrDefault(category =>
                !assignedCategoryIds.Contains(category.Id) &&
                category.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (match == null) continue;

            assignedCategoryIds.Add(match.Id);
            categoryMap[name] = match;
        }

        var reusableCategories = new Queue<Category>(
            categories.Where(category => !assignedCategoryIds.Contains(category.Id)));

        foreach (var name in CategoryNames)
        {
            if (categoryMap.ContainsKey(name)) continue;

            var category = reusableCategories.Count > 0 ? reusableCategories.Dequeue() : new Category();
            category.Name = name;
            category.IsActive = true;
            category.IsDeleted = false;
            category.DeletedAt = null;
            category.UpdatedAt = DateTime.UtcNow;
            if (context.Entry(category).State == EntityState.Detached)
                context.categories.Add(category);
            categoryMap[name] = category;
        }

        var productsBySeedSlug = products
            .Where(product => !string.IsNullOrWhiteSpace(product.Slug) && seedSlugs.Contains(product.Slug))
            .GroupBy(product => product.Slug, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        var reusableProducts = new Queue<Product>(
            products.Where(product => string.IsNullOrWhiteSpace(product.Slug) || !seedSlugs.Contains(product.Slug)));

        foreach (var seed in Products)
        {
            Product product;
            if (productsBySeedSlug.TryGetValue(seed.Slug, out var existing))
                product = existing;
            else if (reusableProducts.Count > 0)
                product = reusableProducts.Dequeue();
            else
            {
                product = new Product();
                context.products.Add(product);
            }

            product.Name = seed.Name;
            product.Slug = seed.Slug;
            product.CategoryId = categoryMap[seed.Category].Id;
            product.Description = seed.Description;
            product.Price = seed.Price;
            product.Stock = seed.Stock;
            product.ImageUrl = seed.Image;
            product.AdditionalImages = null;
            product.Sizes = seed.Options is { Length: > 0 } ? JsonSerializer.Serialize(seed.Options) : null;
            product.IsActive = true;
            product.IsDeleted = false;
            product.DeletedAt = null;
            product.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        logger.LogInformation(
            "Tech catalog initialized with {CategoryCount} categories and {ProductCount} products.",
            CategoryNames.Length,
            Products.Length);
    }
}
