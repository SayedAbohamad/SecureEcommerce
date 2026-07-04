using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Models
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions options) : base(options)
        {
        }

        public DbSet<Category> categories { get; set; }
        public DbSet<Product> products { get; set; }
        public DbSet<Order> orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Review> productReviews { get; set; }

        public DbSet<Payment> Payments { get; set; }
        public DbSet<PendingRegistration> PendingRegistrations { get; set; }
        public DbSet<UserAddress> UserAddresses { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<PromoCode> PromoCodes { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<PendingEmailChange> PendingEmailChanges { get; set; }
        public DbSet<UserBehaviorEvent> UserBehaviorEvents { get; set; }
        public DbSet<UserPreference> UserPreferences { get; set; }
        public DbSet<HoneypotEvent> HoneypotEvents { get; set; }
        public DbSet<FailedLoginAttempt> FailedLoginAttempts { get; set; }
        public DbSet<BlockedIpAddress> BlockedIpAddresses { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Product>()
                   .HasMany(p => p.Reviews)
                   .WithOne(r => r.Product)
                   .HasForeignKey(r => r.ProductId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ApplicationUser>()
                   .HasMany(u => u.Reviews)
                   .WithOne(r => r.User)
                   .HasForeignKey(r => r.UserId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ApplicationUser>()
                   .Property(u => u.ReceiveSupportEmails)
                   .HasDefaultValue(true);

            builder.Entity<Review>()
                   .Property(r => r.Rating)
                   .HasColumnType("int");

            builder.Entity<Review>()
                   .Property(r => r.Comment)
                   .HasMaxLength(2000);

            builder.Entity<Order>()
                   .HasOne(o => o.User)
                   .WithMany()
                   .HasForeignKey(o => o.UserId);

            builder.Entity<OrderItem>()
                   .HasOne(oi => oi.Order)
                   .WithMany(o => o.Items)
                   .HasForeignKey(oi => oi.OrderId);

            // Configure decimal precision for financial fields
            builder.Entity<Product>().Property(p => p.Price).HasColumnType("decimal(18,2)");
            builder.Entity<Order>().Property(o => o.TotalAmount).HasColumnType("decimal(18,2)");
            builder.Entity<OrderItem>().Property(oi => oi.Price).HasColumnType("decimal(18,2)");
            builder.Entity<Payment>().Property(p => p.Amount).HasColumnType("decimal(18,2)");

            builder.Entity<UserBehaviorEvent>().HasIndex(e => new { e.UserId, e.OccurredAt });
            builder.Entity<UserBehaviorEvent>().HasIndex(e => new { e.SessionId, e.OccurredAt });
            builder.Entity<UserBehaviorEvent>().HasIndex(e => new { e.EventType, e.OccurredAt });
            builder.Entity<UserBehaviorEvent>().HasIndex(e => e.ProductId);
            builder.Entity<UserBehaviorEvent>().HasIndex(e => e.CategoryId);

            builder.Entity<UserBehaviorEvent>()
                   .HasOne(e => e.User)
                   .WithMany()
                   .HasForeignKey(e => e.UserId)
                   .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<UserBehaviorEvent>()
                   .HasOne(e => e.Product)
                   .WithMany()
                   .HasForeignKey(e => e.ProductId)
                   .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<UserBehaviorEvent>()
                   .HasOne(e => e.Category)
                   .WithMany()
                   .HasForeignKey(e => e.CategoryId)
                   .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<UserPreference>()
                   .HasIndex(p => new { p.UserId, p.CategoryId })
                   .IsUnique();

            builder.Entity<UserPreference>().Property(p => p.Score).HasColumnType("decimal(18,4)");

            builder.Entity<UserPreference>()
                   .HasOne(p => p.User)
                   .WithMany()
                   .HasForeignKey(p => p.UserId)
                   .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<UserPreference>()
                   .HasOne(p => p.Category)
                   .WithMany()
                   .HasForeignKey(p => p.CategoryId)
                   .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<HoneypotEvent>().HasIndex(e => e.CreatedAt);
            builder.Entity<HoneypotEvent>().HasIndex(e => e.IpAddress);
            builder.Entity<HoneypotEvent>().HasIndex(e => e.Path);

            builder.Entity<FailedLoginAttempt>().HasIndex(e => e.AttemptedAt);
            builder.Entity<FailedLoginAttempt>().HasIndex(e => e.IpAddress);

            builder.Entity<BlockedIpAddress>().HasIndex(e => e.IpAddress).IsUnique();
        }
    }
}
