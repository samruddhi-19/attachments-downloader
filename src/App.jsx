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
    <div className="container">

      {/* 🔄 Loading */}
      {isAuthorized === null && <p>Loading...</p>}

      {/* ❌ Not Authorized */}
      {isAuthorized === false && (
        <>
          <p>Please authorize to continue</p>
          <button onClick={handleAuthorize}>Authorize</button>
        </>
      )}

      {/* ✅ Authorized */}
      {isAuthorized === true && status === 'idle' && (
        <>
          <p>Download all attachments from this board</p>
          <button onClick={handleDownload}>Download Attachments</button>
        </>
      )}

      {/* ⏳ Loading */}
      {status === 'loading' && (
        <>
          <p>Preparing download... {progress}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {/* ✅ Done */}
      {status === 'done' && (
        <p>✅ Downloaded {fileCount} attachments!</p>
      )}

      {/* ❌ Error */}
      {status === 'error' && (
        <p>❌ No attachments found or error occurred</p>
      )}

    </div>
  )
}

export default App