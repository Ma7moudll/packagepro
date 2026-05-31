'use client'

import * as React from 'react'

function AspectRatio({
  ...props
}: React.ComponentProps<'div'> & { ratio?: number }) {
  return <div {...props} data-slot="aspect-ratio" />
}

export { AspectRatio }
