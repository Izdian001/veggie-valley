'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function StarRating({ rating }) {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.365-2.446a1 1 0 00-1.175 0l-3.365 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.35 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewItem({ review, onReplySubmitted }) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useState(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) {
      setError('Reply cannot be empty.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          seller_reply: replyText.trim(),
          seller_reply_date: new Date().toISOString()
        })
        .eq('id', review.id)

      if (updateError) throw updateError

      setReplyText('')
      setShowReplyForm(false)
      onReplySubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
            {review.buyer_name ? review.buyer_name.charAt(0).toUpperCase() : 'B'}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{review.buyer_name || 'Anonymous'}</p>
              <p className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
            <StarRating rating={review.rating} />
          </div>
          {review.review_text && (
            <p className="mt-2 text-gray-700">{review.review_text}</p>
          )}
        </div>
      </div>

      {/* Seller Reply */}
      {review.seller_reply && (
        <div className="mt-4 ml-14 pl-4 border-l-2 border-gray-200">
          <p className="font-semibold text-gray-800">Seller's Reply</p>
          <p className="text-sm text-gray-500">
            {new Date(review.seller_reply_date).toLocaleDateString()}
          </p>
          <p className="mt-2 text-gray-700">{review.seller_reply}</p>
        </div>
      )}

      {/* Reply Button & Form for Seller */}
      {user?.id === review.seller_id && !review.seller_reply && (
        <div className="mt-4 ml-14">
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            {showReplyForm ? 'Cancel' : 'Reply to this review'}
          </button>

          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="mt-4 space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                maxLength={500}
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Reply'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
