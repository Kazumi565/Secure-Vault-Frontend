import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tokenService from '../api/tokenService';

export default function useAutoLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = tokenService.onUnauthorized(() => {
      navigate('/', { replace: true });
    });
    return unsubscribe;
  }, [navigate]);
}
