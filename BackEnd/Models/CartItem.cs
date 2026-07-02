namespace BackEnd.Models
{
    public class CartItem : BaseEntity
    {
        public Guid CartId { get; set; }//foreign key
        public Cart Cart { get; set; } //navigation

        public Guid ProductId { get; set; }
        public Product Product { get; set; }

        public  int Quantity { get; set; }
        public string? Size { get; set; } // Selected size for this cart item
    }

    
}
