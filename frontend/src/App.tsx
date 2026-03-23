// App.js
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Post from './pages/post';
import Get from './pages/get';


function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/post">post new team</Link>
        <p>    </p>
        <Link to="/get">get all team</Link>
      </nav>
      
      <Routes>
        <Route path="/post" element={<Post />} />
        <Route path="/get" element={<Get />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;