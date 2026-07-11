import { Navigate, Route, Routes } from 'react-router-dom';
import { CartProvider } from './store/cart';
import { SessionProvider } from './store/session';
import { EntryScreen } from './screens/EntryScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CartScreen } from './screens/CartScreen';
import { TrackingScreen } from './screens/TrackingScreen';
import { RecoverScreen } from './screens/RecoverScreen';

export function App() {
  return (
    <SessionProvider>
      <CartProvider>
        <div className="mx-auto flex min-h-full max-w-md flex-col bg-surface">
          <Routes>
            <Route path="/" element={<EntryScreen />} />
            <Route path="/menu" element={<MenuScreen />} />
            <Route path="/cart" element={<CartScreen />} />
            <Route path="/order/:orderId" element={<TrackingScreen />} />
            <Route path="/recover" element={<RecoverScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </CartProvider>
    </SessionProvider>
  );
}
