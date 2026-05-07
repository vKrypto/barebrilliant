import { Route, Routes } from 'react-router-dom'
import LeadPage from './pages/LeadPage.jsx'
import ThankYouPage from './pages/ThankYouPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LeadPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
    </Routes>
  )
}

export default App
