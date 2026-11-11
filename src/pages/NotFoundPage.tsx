import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage({ message = "The page you're looking for doesn't exist." }) {
  return (
    <div className="not-found">
      <EmptyState
        title="Page not found"
        description={message}
        action={
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
