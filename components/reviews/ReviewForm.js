'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ReviewForm({ order, onReviewSubmitted }) {
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          order_id: order.id,
          buyer_id: user.id,
          seller_id: order.seller_id,
          product_id: order.product_id,
          reviewer_id: user.id,
          rating,
          review_text: reviewText.trim() || null
        })

      if (insertError) throw insertError

      // Update seller aggregate rating in seller_profiles
      try {
        const { data: store } = await supabase
          .from('seller_profiles')
          .select('rating, total_reviews')
          .eq('id', order.seller_id)
          .single()

        const prevCount = store?.total_reviews || 0
        const prevAvg = store?.rating || 0
        const newCount = prevCount + 1
        const newAvg = ((prevAvg * prevCount + rating) / newCount)

        await supabase
          .from('seller_profiles')
          .upsert({
            id: order.seller_id,
            rating: parseFloat(newAvg.toFixed(2)),
            total_reviews: newCount
          }, { onConflict: 'id' })
      } catch (aggErr) {
        // Non-blocking: rating aggregation failure should not block review submission
        console.warn('Failed to update seller aggregate rating', aggErr)
      }

      // Reset form
      setRating(0)
      setReviewText('')
      onReviewSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition-colors ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400`}
              >
                ⭐
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {rating > 0 && `${rating} star${rating > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review (Optional)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this order..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {reviewText.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || rating === 0}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
