'use client'

export default function MessageItem({ message, currentUser }) {
  const isSender = message.sender_id === currentUser.id

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isSender ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
        <p className="text-sm font-semibold mb-1">
          {isSender ? 'You' : message.sender.full_name}
        </p>
        <p>{message.message_text}</p>
        <p className={`text-xs mt-2 ${isSender ? 'text-green-200' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
