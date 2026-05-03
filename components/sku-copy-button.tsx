'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  sku: string
}

export function SkuCopyButton({ sku }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sku)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy SKU:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-slate-600"
      title={`Click to copy SKU: ${sku}`}
    >
      SKU: {sku}
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}
