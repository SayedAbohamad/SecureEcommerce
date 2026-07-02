namespace BackEnd.DTO.Cart
{
    public class CartItemDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; }
        public string ProductImage { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string? Size { get; set; } // Selected size

        public decimal MyTotal { get; set; } 
    }
}
