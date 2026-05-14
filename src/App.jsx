import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import './App.css'

const TRELLO_API_KEY = "4a96c23ac4cd6f8f9088b53390018b74"

function App() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [fileCount, setFileCount] = useState(0)
  const [isAuthorized, setIsAuthorized] = useState(false)
useEffect(() => {
  const script = document.createElement('script')
  script.src = 'https://p.trellocdn.com/power-up.min.js'

  script.onload = async () => {
    try {
      // ✅ Ensure Trello exists
      if (
        !window.TrelloPowerUp ||
        !window.TrelloPowerUp.iframe
      ) {
        console.log("Running outside Trello")
        return
      }

      const t = window.TrelloPowerUp.iframe({
        appKey: TRELLO_API_KEY,
        appName: "Attachments Downloader"
      })

      window.trelloClient = t

      // ✅ SAFE TOKEN CHECK
      try {
        const token = await t.getRestApi().getToken()
        setIsAuthorized(!!token)
      } catch {
        setIsAuthorized(false)
      }

    } catch (err) {
      console.error("Trello init failed:", err)
    }
  }

  script.onerror = () => {
    console.log("Script failed to load")
  }

  document.head.appendChild(script)
}, [])

  // ✅ AUTHORIZE FUNCTION
  const handleAuthorize = async () => {
    const t = window.trelloClient

    if (!t) {
      alert("Not inside Trello")
      return
    }

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

  // ✅ DOWNLOAD FUNCTION
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

        {!isAuthorized ? (
          <>
            <h3 className="title">Authorization</h3>
            <p className="count">
              We need your authorization to access attachments
            </p>

            <button className="download-btn" onClick={handleAuthorize}>
              Authorize
            </button>
          </>
        ) : (
          <>
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

            {status === 'loading' && (
              <p style={{ marginTop: '10px' }}>
                Preparing download... {progress}%
              </p>
            )}

            {status === 'done' && (
              <p style={{ marginTop: '10px' }}>
                ✅ Downloaded {fileCount} files
              </p>
            )}

            {status === 'error' && (
              <p style={{ marginTop: '10px' }}>
                ❌ Error occurred
              </p>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default App