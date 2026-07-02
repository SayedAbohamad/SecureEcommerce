using AutoMapper;
using BackEnd.DTO.Cart;
using BackEnd.DTO.Order;
using BackEnd.DTO.Product;
using BackEnd.DTO.PromoCode;
using BackEnd.Models;

namespace BackEnd.Helper
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {

            CreateMap<CreateProductDto, Product>()
                .ForMember(d=>d.ImageUrl,opt=>opt.Ignore())
                .ForMember(d=>d.AdditionalImages,opt=>opt.Ignore());
            CreateMap<UpdateProductDto, Product>()
                .ForMember(d=>d.ImageUrl,opt=>opt.Ignore())
                .ForMember(d=>d.AdditionalImages,opt=>opt.Ignore());
            CreateMap<Product, GetProductDto>().ForMember(p=>p.oldPrice,opt=>opt.MapFrom(src=>(src.Price)*1.1m));

            CreateMap<CartItem, CartItemDto>()
                .ForMember(d => d.ProductName, opt => opt.MapFrom(src => src.Product.Name))
                .ForMember(d => d.ProductImage, opt => opt.MapFrom(src => src.Product.ImageUrl))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Product.Price))
                .ForMember(dest => dest.MyTotal, opt => opt.MapFrom(src => src.Product.Price * src.Quantity));
                ;

            CreateMap<OrderItem, OrderItemDetailsDto>()
                .ForMember(d => d.ProductName, opt => opt.MapFrom(src => src.Product.Name))
                .ForMember(d => d.PricePerUnit, opt => opt.MapFrom(src => src.Price));

            CreateMap<Order, OrderSummaryDto>()
                .ForMember(d => d.CustomerId, opt => opt.MapFrom(src => src.UserId))
                .ForMember(d => d.CustomerName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName ?? src.User.UserName : string.Empty))
                .ForMember(d => d.CustomerEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : string.Empty))
                .ForMember(d => d.ItemsCount, opt => opt.MapFrom(src => src.Items.Count))
                .ForMember(d => d.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            CreateMap<Order, OrderDetailsDto>()
                .ForMember(d => d.CustomerId, opt => opt.MapFrom(src => src.UserId))
                .ForMember(d => d.CustomerName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName ?? src.User.UserName : string.Empty))
                .ForMember(d => d.CustomerEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : string.Empty))
                .ForMember(d => d.Items, opt => opt.MapFrom(src => src.Items))
                .ForMember(d => d.Status, opt => opt.MapFrom(src => src.Status.ToString()));

            // PromoCode mappings
            CreateMap<CreatePromoCodeDto, PromoCode>()
                .ForMember(d => d.DiscountType, opt => opt.Ignore()); // Parsed manually in controller
            CreateMap<PromoCode, GetPromoCodeDto>()
                .ForMember(d => d.DiscountType, opt => opt.MapFrom(src => src.DiscountType.ToString()));
        }
    }
}
