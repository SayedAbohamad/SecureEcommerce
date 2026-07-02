import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../../../utils/toast';
import { supportApi } from '../../../api';
import { executeRecaptcha } from '../../../utils/recaptcha';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
declare global {
  interface Window {
    WOW: any;
  }
}

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',

    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize WOW.js for animations
    const initWOW = () => {
      if (typeof window !== 'undefined' && (window as any).WOW) {
        const wow = new (window as any).WOW({
          boxClass: 'wow',
          animateClass: 'animated',
          offset: 0,
          mobile: true,
          live: true,
        });
        wow.init();
      }
    };

    if ((window as any).WOW) {
      initWOW();
    } else {
      const timer = setTimeout(() => {
        if ((window as any).WOW) {
          initWOW();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha('submit_support');
      await supportApi.submit({ ...formData, recaptchaToken });
      showToast.success('Thank you for your message! We will get back to you soon.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error(error);
      showToast.error('Failed to send your message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      {isSubmitting && <LoadingOverlay />}
      {/* Single Page Header start */}
      <div
        className="container-fluid page-header py-5"
        style={{
          backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.72), rgba(8, 11, 31, 0.78)), url(${process.env.PUBLIC_URL}/template/img/tech-page-header.svg)`,
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        }}
      >
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          Contact Us
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item">
            <Link to="/" className="text-white">
              Home
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/contact" className="text-white">
              Pages
            </Link>
          </li>
          <li className="breadcrumb-item active text-white">Contact</li>
        </ol>
      </div>
      {/* Single Page Header End */}

      {/* Contact Start */}
      <div className="container-fluid contact py-5">
        <div className="container py-5">
          <div className="p-5 bg-light rounded">
            <div className="row g-4">
              <div className="col-12">
                <div className="text-center mx-auto wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '900px' }}>
                  <h4 className="text-primary border-bottom border-primary border-2 d-inline-block pb-2">
                    Get in touch
                  </h4>
                  <p className="mb-5 fs-5 text-dark">
                    We are here for you! how can we help, We are here for you!
                  </p>
                </div>
              </div>
              <div className="col-lg-7">
                <h5 className="text-primary wow fadeInUp" data-wow-delay="0.1s">
                  Let's Connect
                </h5>
                <h1 className="display-5 mb-4 wow fadeInUp" data-wow-delay="0.3s">
                  Send Your Message
                </h1>
                <p className="mb-4 wow fadeInUp" data-wow-delay="0.5s">
                  We'd love to hear from you! Send us a message and we'll respond as soon as possible. Whether you have a
                  question about our products, need assistance with an order, or just want to say hello, we're here to help.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="row g-4 wow fadeInUp" data-wow-delay="0.1s">
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="name"
                          name="name"
                          placeholder="Your Name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="name">Your Name</label>
                      </div>
                    </div>
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          placeholder="Your Email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="email">Your Email</label>
                      </div>
                    </div>
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          placeholder="Phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="phone">Your Phone</label>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="form-floating">
                        <input
                          type="text"
                          className="form-control"
                          id="subject"
                          name="subject"
                          placeholder="Subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="subject">Subject</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-floating">
                        <textarea
                          className="form-control"
                          placeholder="Leave a message here"
                          id="message"
                          name="message"
                          style={{ height: '160px' }}
                          value={formData.message}
                          onChange={handleChange}
                          required
                        ></textarea>
                        <label htmlFor="message">Message</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary w-100 py-3">
                        Send Message
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="col-lg-12">
                <div className="row g-4 align-items-center justify-content-center">
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.1s">
                    <div className="rounded p-4">
                      <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                        style={{ width: '70px', height: '70px' }}
                      >
                        <i className="fas fa-map-marker-alt fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Address</h4>
                        <p className="mb-2">10th of Ramadan, Cairo, Egypt</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.3s">
                    <div className="rounded p-4">
                      <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                        style={{ width: '70px', height: '70px' }}
                      >
                        <i className="fas fa-envelope fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Mail Us</h4>
                        <p className="mb-2">info@markety.com</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.5s">
                    <div className="rounded p-4">
                      <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                        style={{ width: '70px', height: '70px' }}
                      >
                        <i className="fa fa-phone-alt fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Telephone</h4>
                        <p className="mb-2">(+20) 100 000 0000</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.7s">
                    <div className="rounded p-4">
                      <div
                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                        style={{ width: '70px', height: '70px' }}
                      >
                        <i className="fab fa-firefox-browser fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Website</h4>
                        <p className="mb-2">www.markety.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Contact End */}
    </>
  );
};
