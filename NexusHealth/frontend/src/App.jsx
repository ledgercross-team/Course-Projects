// frontend/src/App.jsx
import { RouterProvider } from 'react-router-dom';
import AuthBootstrap from '@/features/auth/AuthBootstrap';
import { router } from '@/app/router';

export default function App() {
  return (
    <AuthBootstrap>
      <RouterProvider router={router} />
    </AuthBootstrap>
  );
}
