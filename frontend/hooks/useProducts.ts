import { useState, useEffect } from 'react'

export default function useProducts() {
  const [products, setProducts] = useState([])
  useEffect(() => {
    // placeholder
  }, [])
  return { products }
}
