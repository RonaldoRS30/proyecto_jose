import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { NavigationGuardProvider } from './contexts/NavigationGuardContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter basename="/sistema">
      <ThemeProvider>
        <ConfirmProvider>
          <NavigationGuardProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </NavigationGuardProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
