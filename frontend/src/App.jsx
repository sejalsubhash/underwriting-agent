import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewAssessment from './pages/NewAssessment.jsx';
import AssessmentDetail from './pages/AssessmentDetail.jsx';

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [page, id] = hash.split('/');

  if (page === 'new') {
    return { page: 'new' };
  }

  if (page === 'assessment' && id) {
    return { page: 'assessment', id };
  }

  return { page: 'dashboard' };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const page = useMemo(() => {
    if (route.page === 'new') {
      return <NewAssessment />;
    }

    if (route.page === 'assessment') {
      return <AssessmentDetail assessmentId={route.id} />;
    }

    return <Dashboard />;
  }, [route]);

  return <Layout activePage={route.page}>{page}</Layout>;
}
