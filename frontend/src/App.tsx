// App.js
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Post from './pages/post';
import Get from './pages/get';
import Meet from './pages/meeting';


function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/post">post new team</Link>
        <p>    </p>
        <Link to="/get">get all team</Link>
        <p>    </p>
        <Link to="/meeting">post new meeting</Link>
      </nav>
      
      <Routes>
        <Route path="/post" element={<Post />} />
        <Route path="/get" element={<Get />} />
        <Route path="/meeting" element={<Meet />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;