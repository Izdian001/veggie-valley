'use client'

import ReviewItem from './ReviewItem'

export default function ReviewList({ reviews, onReplySubmitted }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No reviews yet for this product.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Customer Reviews</h3>
      {
        reviews.map(review => (
          <ReviewItem 
            key={review.id} 
            review={review} 
            onReplySubmitted={onReplySubmitted} 
          />
        ))
      }
    </div>
  )
}
