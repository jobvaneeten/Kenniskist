// Testpagina voor het werkblad (alleen dev, via /werkblad-test.html).
import { createRoot } from 'react-dom/client'
import '../theme.css'
import '../index.css'
import './ui.css'
import '../portaal/portaal.css'
import Werkblad from '../portaal/Werkblad.jsx'

createRoot(document.getElementById('root')).render(
  <div className="portaal"><div className="portaal-inhoud"><Werkblad klas={{ groepen: [7] }} /></div></div>
)
