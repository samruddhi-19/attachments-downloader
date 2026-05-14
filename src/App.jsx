import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import './App.css'

const TRELLO_API_KEY = import.meta.env.VITE_TRELLO_API_KEY

function App() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [fileCount, setFileCount] = useState(0)

  const [isAuthorized, setIsAuthorized] = useState(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://p.trellocdn.com/power-up.min.js'

    script.onload = async () => {
      const t = window.TrelloPowerUp.iframe({
        appKey: TRELLO_API_KEY,
        appName: "Attachments Downloader"
      })

      window.trelloClient = t

      try {
        const token = await t.getRestApi().getToken()

        if (token) {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
        }
      } catch (err) {
        console.error(err)
        setIsAuthorized(false)
      }
    }

    document.head.appendChild(script)
  }, [])

  // ✅ AUTHORIZE FUNCTION
  const handleAuthorize = async () => {
    const t = window.trelloClient

    try {
      await t.getRestApi().authorize({
        scope: 'read',
        expiration: 'never'
      })

      setIsAuthorized(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownload = async () => {
    const t = window.trelloClient
    if (!t) return

    try {
      setStatus('loading')
      setProgress(10)

      const board = await t.board('id')
      const token = await t.getRestApi().getToken()

      setProgress(20)

      const cardsRes = await fetch(
        `https://api.trello.com/1/boards/${board.id}/cards?attachments=true&key=${TRELLO_API_KEY}&token=${token}`
      )
      const cards = await cardsRes.json()

      setProgress(30)

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

      const zip = new JSZip()
      let downloaded = 0

      for (const att of attachments) {
        try {
          // 🔥 IMPORTANT FIX (for next bug also)
          const response = await fetch(t.signUrl(att.url))
          const blob = await response.blob()

          zip.file(`${att.cardName}/${att.name}`, blob)

          downloaded++
          setProgress(30 + Math.round((downloaded / attachments.length) * 60))
        } catch (e) {
          console.log("Skipped:", att.name)
        }
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
  <div className="popup">

    <div className="card">

      <h3 className="title">Downloader</h3>

      <p className="count">
        {fileCount || 0} attachments (2.4 GB)
      </p>

      <div className="options">

        <label>
          <input type="checkbox" defaultChecked />
          Split attachments into list folders
        </label>

        <label>
          <input type="checkbox" defaultChecked />
          Split attachments into card folders
        </label>

        <label>
          <input type="checkbox" />
          Skip duplicate files
        </label>

      </div>

      <div className="download-section">
        <select>
          <option>ZIP File (.zip)</option>
          <option>Google Drive</option>
          <option>Dropbox</option>
          <option>OneDrive</option>
        </select>
      </div>

      <button className="download-btn" onClick={handleDownload}>
        Start download
      </button>

    </div>

  </div>
)
}

export default App