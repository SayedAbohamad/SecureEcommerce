import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const HomeHero = () => {
  return (
    <div className="container py-5">
      <div className="row align-items-center g-4">
        <motion.div
          className="col-lg-6"
          initial={{ x: -80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <span className="badge bg-primary rounded-pill px-3 py-2 mb-3">Trending Tech</span>
          <h1 className="display-4 fw-bold mb-3">
            Upgrade Your Tech Setup with <span className="text-primary">Markety</span>
          </h1>
          <p className="lead text-muted mb-4">
            Shop powerful laptops, gaming PCs, graphics cards, RAM, keyboards, mice, monitors, storage, and accessories — all in one place.
          </p>
          <div className="d-flex gap-3">
            <Link to="/shop" className="btn btn-primary btn-lg">Shop Now</Link>
            <Link to="/shop" className="btn btn-outline-secondary btn-lg">Build Your Setup</Link>
          </div>
        </motion.div>
        <motion.div
          className="col-lg-6"
          initial={{ x: 80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <div className="position-relative">
            <img
              src={`${process.env.PUBLIC_URL}/template/img/tech-hero.svg`}
              alt="Markety gaming and productivity setup"
              className="img-fluid rounded-4 shadow-lg"
            />
            <motion.div
              className="position-absolute bottom-0 start-0 m-4 p-3 bg-white rounded-3 shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true, amount: 0.6 }}
            >
              <h4 className="fw-bold mb-0 text-primary">Performance Ready</h4>
              <p className="mb-0 text-muted small">Trusted tech brands and setup essentials</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
