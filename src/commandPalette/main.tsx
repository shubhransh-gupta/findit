import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchInterface } from '../shared/components/SearchInterface';
import '../styles/global.css';

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get('q') ?? '';

document.documentElement.setAttribute('data-theme', 'dark');
document.body.style.background = 'transparent';
document.body.style.margin = '0';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '0', background: 'transparent' }}>
      <SearchInterface initialQuery={initialQuery} compact />
    </div>
  </StrictMode>
);

window.addEventListener('message', (e) => {
  if (e.data?.type === 'SET_QUERY') {
    // handled by SearchInterface via re-render if needed
  }
});
