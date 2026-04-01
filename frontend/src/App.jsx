import { AuthProvider } from './context/AuthProvider';
import AppRouter from './routes/AppRouter';


const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;