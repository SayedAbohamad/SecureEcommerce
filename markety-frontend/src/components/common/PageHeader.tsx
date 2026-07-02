import { CSSProperties, ReactNode } from 'react';

const defaultHeroImage = `${process.env.PUBLIC_URL}/template/img/tech-page-header.svg`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  image?: string;
  eyebrow?: string;
  overlayClassName?: string;
}

export const PageHeader = ({ title, subtitle, action, image, eyebrow, overlayClassName }: PageHeaderProps) => {
  const heroStyle = {
    '--hero-image': `url(${image ?? defaultHeroImage})`,
  } as CSSProperties;

  return (
    <section className="page-hero" style={heroStyle}>
      <div className={`page-hero__overlay ${overlayClassName ?? ''}`} />
      <div className="page-hero__content container">
        {eyebrow && <span className="page-hero__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {action && <div className="page-hero__action">{action}</div>}
      </div>
    </section>
  );
};

