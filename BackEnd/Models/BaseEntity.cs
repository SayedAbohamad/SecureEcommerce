namespace BackEnd.Models
{
    public class BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public String? CreatedBy { get; set; }
        public DateTime UpdatedAt { get; set; }
        public String? UpdatedBy { get; set; }

        public bool IsDeleted { get; set; } = false;

        public DateTime? DeletedAt { get; set; }

        public String? DeletedBy { get;set; }

        public bool IsActive { get; set; } = true;

    }

    
}
