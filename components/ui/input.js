import React from 'react'

export function Input({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  name,
  id,
  required = false,
  className = ''
}) {
  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      id={id}
      required={required}
      className={`${baseClasses} ${className}`}
    />
  )
}
