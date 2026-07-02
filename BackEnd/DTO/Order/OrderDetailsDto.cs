using System;
using System.Collections.Generic;

namespace BackEnd.DTO.Order
{
    public class OrderDetailsDto
    {
        public Guid Id { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int ItemsCount => Items.Count;
        public string? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? PromoCode { get; set; }
        public decimal DiscountAmount { get; set; }
        public List<OrderItemDetailsDto> Items { get; set; } = new();
    }
}

