using System;

namespace BackEnd.DTO.Order
{
    public class OrderItemDetailsDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal PricePerUnit { get; set; }
        public int Quantity { get; set; }
        public decimal SubTotal => PricePerUnit * Quantity;
    }
}

