using System.Text.Json.Serialization;

namespace BackEnd.Models
{
    public class OrderItem : BaseEntity
    {
        public Guid OrderId  { get; set; }
        [JsonIgnore]
        public Order Order { get; set; }

        public Guid ProductId { get; set; }
        public Product Product { get; set; }
        public int Quantity { get; set; }
        public  decimal Price { get; set; } 
    }

    
}
