import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import './App.css'

const TRELLO_API_KEY = import.meta.env.VITE_TRELLO_API_KEY

function App() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [fileCount, setFileCount] = useState(0)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://p.trellocdn.com/power-up.min.js'
    script.onload = () => {
      window.trelloClient = window.TrelloPowerUp.iframe()
    }
    document.head.appendChild(script)
  }, [])

  const handleDownload = async () => {
    const t = window.trelloClient
    if (!t) return

    try {
      setStatus('loading')
      setProgress(10)

      // Get board ID and token via REST API
      const board = await t.board('id')
      const token = await t.getRestApi().getToken()

      setProgress(20)

      // Fetch all cards with attachments
      const cardsRes = await fetch(
        `https://api.trello.com/1/boards/${board.id}/cards?attachments=true&key=${TRELLO_API_KEY}&token=${token}`
      )
      const cards = await cardsRes.json()

      setProgress(30)

      // Collect all attachments
      const attachments = []
      for (const card of cards) {
        if (card.attachments && card.attachments.length > 0) {
          for (const att of card.attachments) {
            attachments.push({ ...att, cardName: card.name })
          }
        }
      }

      if (attachments.length === 0) {
        setStatus('error')
        return
      }

      setFileCount(attachments.length)

      // Download and ZIP
      const zip = new JSZip()
      let downloaded = 0

      for (const att of attachments) {
        const response = await fetch(att.url)
        const blob = await response.blob()
        zip.file(`${att.cardName}/${att.name}`, blob)
        downloaded++
        setProgress(30 + Math.round((downloaded / attachments.length) * 60))
      }

      setProgress(95)

      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'trello-attachments.zip'
      a.click()
      URL.revokeObjectURL(url)

      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <div className="container">
      {status === 'idle' && (
        <>
          <p>Download all attachments from this board as a ZIP file.</p>
          <button onClick={handleDownload}>Download Attachments</button>
        </>
      )}

      {status === 'loading' && (
        <>
          <p>Preparing download... {progress}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <small>Do not close this popup.</small>
        </>
      )}

      {status === 'done' && (
        <p>✅ Downloaded {fileCount} attachments!</p>
      )}

      {status === 'error' && (
        <p>❌ No attachments found or an error occurred.</p>
      )}
    </div>
  )
}

export default App