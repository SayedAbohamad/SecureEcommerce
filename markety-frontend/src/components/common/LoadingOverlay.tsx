import { Spinner } from 'react-bootstrap';

export const LoadingOverlay = () => {
  return (
    <div className="d-flex justify-content-center align-items-center w-100 py-5">
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
};

