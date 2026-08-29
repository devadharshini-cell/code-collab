import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Editorpage from './components/Editorpage';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <div>
        <Toaster position='top-right'></Toaster>
      </div>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />}></Route>
          <Route exact path="/" element={<ProtectedRoute><Home /></ProtectedRoute>}></Route>
          <Route exact path="/editor/:roomId" element={<ProtectedRoute><Editorpage /></ProtectedRoute>}></Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
