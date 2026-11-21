type Recaptcha = {
  ready(callback: () => void): void
  execute(key: string, options: { action: string }): Promise<string>
}
let loading: Promise<Recaptcha> | undefined

/** Acquire a fresh v3 token only when the server requests a CAPTCHA. */
export async function getLoginCaptchaToken(): Promise<string> {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!key) throw new Error('CAPTCHA_UNAVAILABLE')
  const scope = window as typeof window & { grecaptcha?: Recaptcha }
  if (!loading) {
    loading = new Promise<Recaptcha>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CAPTCHA_UNAVAILABLE')), 10000)
      const ready = () => {
        if (!scope.grecaptcha) { clearTimeout(timer); reject(new Error('CAPTCHA_UNAVAILABLE')); return }
        scope.grecaptcha.ready(() => { clearTimeout(timer); resolve(scope.grecaptcha!) })
      }
      if (scope.grecaptcha) return ready()
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`
      script.async = true
      script.onload = ready
      script.onerror = () => { clearTimeout(timer); reject(new Error('CAPTCHA_UNAVAILABLE')) }
      document.head.appendChild(script)
    }).catch(error => { loading = undefined; throw error })
  }
  const recaptcha = await loading
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CAPTCHA_UNAVAILABLE')), 10000)
    recaptcha.execute(key, { action: 'login' }).then(token => {
      clearTimeout(timer)
      if (token) resolve(token); else reject(new Error('CAPTCHA_UNAVAILABLE'))
    }, () => { clearTimeout(timer); reject(new Error('CAPTCHA_UNAVAILABLE')) })
  })
}
