import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { DEMO_MODE } from './demo/config';
import { Provider } from './context';
import App from './App';
import './styles.css';

const Router = DEMO_MODE ? HashRouter : BrowserRouter;
createRoot(document.getElementById('root')).render(
  <Router>
    <Provider>
      <App />
    </Provider>
  </Router>,
);
