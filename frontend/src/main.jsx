import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [status, setStatus] = useState('Comprobando conexión…');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || !(await response.json()).ok) {
          throw new Error('Servicio no disponible');
        }
        setStatus('Listo para empezar.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setStatus('No se pudo conectar. Comprueba que el backend esté iniciado.');
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>OpenFunnel Kit</h1>
      <p role="status">{status}</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
