import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Los estilos de la librería van ANTES de index.css: así los tokens del producto
// ganan en cualquier conflicto de variables.
import '@piensa-it/ui-library/styles.css';
import '@piensa-it/ui-library/fonts.css';
import './index.css';

const raiz = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Las páginas prerenderizadas traen el HTML armado: se hidratan. El
// cascarón SPA (/docs y rutas desconocidas) llega vacío: se monta de cero.
if (raiz.firstElementChild) hydrateRoot(raiz, app);
else createRoot(raiz).render(app);
