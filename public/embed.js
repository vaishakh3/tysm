/**
 * TYSM Wall of Love — one-line embed.
 * Usage: <script src="https://www.tysm.in/embed.js" data-tysm="your-slug" async></script>
 * Injects an auto-resizing iframe right where the script tag sits.
 */
(function () {
  var SITE = 'https://www.tysm.in'
  var self =
    document.currentScript ||
    (function () {
      var s = document.querySelectorAll('script[data-tysm]')
      return s[s.length - 1]
    })()
  if (!self) return
  var slug = self.getAttribute('data-tysm')
  if (!slug) return

  var iframe = document.createElement('iframe')
  iframe.src = SITE + '/embed/' + encodeURIComponent(slug)
  iframe.title = 'Testimonials'
  iframe.loading = 'lazy'
  iframe.setAttribute('scrolling', 'no')
  iframe.style.width = '100%'
  iframe.style.border = '0'
  iframe.style.display = 'block'
  iframe.style.overflow = 'hidden'
  iframe.height = '600'

  self.parentNode.insertBefore(iframe, self.nextSibling)

  window.addEventListener('message', function (e) {
    var d = e.data
    if (d && d.type === 'tysm-embed-height' && d.slug === slug && d.height) {
      iframe.height = Math.ceil(d.height)
    }
  })
})()
