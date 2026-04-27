import { useEffect, useState } from 'react'
import { getQRToken, getQRImage } from '../../services/api'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { Spinner, PageHeader } from '../../components/UI'
import toast from 'react-hot-toast'

export default function QRPage() {
  const [token,   setToken]   = useState(null)
  const [qrUrl,   setQrUrl]   = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [tokenRes, imgRes] = await Promise.all([getQRToken(), getQRImage()])
      setToken(tokenRes.data)
      const url = URL.createObjectURL(new Blob([imgRes.data], { type: 'image/png' }))
      setQrUrl(url)
    } catch { toast.error('Failed to load QR code') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function downloadQR() {
    if (!qrUrl) return
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `gym-qr-${token?.gym_id?.slice(0,8)}.png`
    a.click()
    toast.success('QR code downloaded!')
  }

  function printQR() {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Gym QR Code — ${token?.gym_name}</title>
      <style>
        body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Arial,sans-serif; }
        img { width:300px; height:300px; }
        h2 { margin:16px 0 4px; font-size:22px; }
        p { margin:0; color:#666; font-size:14px; }
        .box { border:3px solid #10B981; border-radius:16px; padding:32px; text-align:center; }
        .sub { margin-top:12px; font-size:12px; color:#999; }
      </style></head>
      <body>
        <div class="box">
          <img src="${qrUrl}" alt="Gym QR"/>
          <h2>${token?.gym_name}</h2>
          <p>Scan to check in your attendance</p>
          <p class="sub">Powered by FitNexus</p>
        </div>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="QR Code" sub="Members scan this to check in attendance">
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4"/> Refresh
        </button>
      </PageHeader>

      {loading ? <Spinner/> : (
        <div className="space-y-4">
          {/* QR Display Card */}
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="bg-white border-4 border-primary rounded-2xl p-4 mb-5 shadow-lg">
              {qrUrl ? (
                <img src={qrUrl} alt="Gym QR Code" className="w-56 h-56"/>
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  No QR available
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">{token?.gym_name}</h2>
            <p className="text-gray-500 text-sm mb-6">Members scan this QR code at the gym entrance to mark attendance</p>

            <div className="flex gap-3">
              <button onClick={downloadQR} className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4"/> Download PNG
              </button>
              <button onClick={printQR} className="btn-primary flex items-center gap-2">
                <Printer className="w-4 h-4"/> Print QR
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">How to use</h3>
            <div className="space-y-2 text-sm text-gray-600">
              {[
                '1. Print the QR code and stick it near your gym entrance',
                '2. Members open the FitNexus app on their phone',
                '3. They tap "Check In" and scan this QR code',
                '4. Attendance is recorded automatically with timestamp',
                '5. You can view all check-ins on the Attendance page',
              ].map(s => <p key={s}>{s}</p>)}
            </div>
          </div>

          {/* QR Token info */}
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-mono break-all">
              QR Token: {token?.qr_token}
            </p>
            <p className="text-xs text-gray-400 mt-1">This token is unique to your gym and never changes</p>
          </div>
        </div>
      )}
    </div>
  )
}
