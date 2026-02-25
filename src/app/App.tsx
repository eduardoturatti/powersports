import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
  useEffect(() => {
    // Inject PWA manifest
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);

    // Set theme color
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', '#22c55e');

    // Set page title and meta description
    document.title = 'Power Sports — Arena Força do Vale';

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      'Futebol amador do Vale do Taquari ao vivo. Placares, classificação, artilharia, cartões e estatísticas completas do Municipal de Encantado 2026. Power Sports — Arena Força do Vale.'
    );
  }, []);

  return <RouterProvider router={router} />;
}
