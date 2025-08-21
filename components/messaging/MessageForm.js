'use client'

import { useState } from 'react'

export default function MessageForm({ onSendMessage }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    await onSendMessage(message.trim())
    setMessage('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex space-x-3">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !message.trim()}
        className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  )
}
