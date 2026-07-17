import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function OAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    async function run() {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        await loginWithToken(token);
        toast.success('Sesión iniciada con Google');
        navigate('/', { replace: true });
      } catch {
        toast.error('No se pudo iniciar sesión con Google');
        navigate('/login', { replace: true });
      }
    }
    run();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      Iniciando sesión...
    </div>
  );
}

export default OAuthSuccessPage;
