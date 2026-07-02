const highlights = [
  {
    icon: 'fas fa-award',
    title: 'Premium Quality',
    description: 'Top-rated products from trusted brands, rigorously quality-checked.',
  },
  {
    icon: 'fas fa-shipping-fast',
    title: 'Free Express Shipping',
    description: 'Complimentary shipping on orders above 500 EGP.',
  },
  {
    icon: 'fas fa-undo',
    title: '30-Day Returns',
    description: 'Hassle-free returns & easy refund process on all orders.',
  },
];

export const Highlights = () => (
  <div className="container py-5">
    <div className="row g-4">
      {highlights.map((item) => (
        <div className="col-lg-4" key={item.title}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-start gap-3">
              <div className="btn btn-primary btn-lg-square rounded-circle">
                <i className={item.icon} />
              </div>
              <div>
                <h5 className="card-title">{item.title}</h5>
                <p className="card-text text-muted">{item.description}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
