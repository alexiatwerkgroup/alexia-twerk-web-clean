/**
 * WhatsApp Status Share Integration
 * Allows users to share videos to WhatsApp Status with one click
 * Uses Web Share API with fallback for older browsers
 */

(function() {
  'use strict';
  
  const WhatsAppShare = {
    init() {
      // Check if Web Share API is available
      if (!navigator.share) {
        console.warn('[WhatsApp Share] Web Share API not available');
        this.fallbackInit();
        return;
      }
      
      // Setup all share buttons
      document.querySelectorAll('[data-whatsapp-share]').forEach(btn => {
        btn.addEventListener('click', (e) => this.handleShare(e, btn));
      });
    },
    
    handleShare(event, button) {
      event.preventDefault();
      event.stopPropagation();
      
      const videoId = button.dataset.videoId || '';
      const videoTitle = button.dataset.videoTitle || 'Check this out on Twerkhub';
      const shareUrl = button.dataset.shareUrl || window.location.href;
      const thumbnail = button.dataset.thumbnail || '/logo-twerkhub.png';
      
      // Prepare share data
      const shareData = {
        title: videoTitle,
        text: `${videoTitle} - via Twerkhub 🎬`,
        url: shareUrl
      };
      
      // Track share event (optional)
      if (window.gtag) {
        gtag('event', 'share', {
          'method': 'whatsapp',
          'content_type': 'video',
          'content_id': videoId,
          'content_title': videoTitle
        });
      }
      
      navigator.share(shareData)
        .then(() => {
          console.log('[WhatsApp Share] Successfully shared');
          // Optional: Show success feedback
          this.showFeedback(button, 'Shared! 🎉');
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('[WhatsApp Share] Share failed:', err);
            this.fallbackShare(shareData);
          }
        });
    },
    
    fallbackShare(shareData) {
      // Fallback for browsers without Web Share API
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `${shareData.title}\n${shareData.url}`
      )}`;
      
      window.open(whatsappUrl, '_blank', 'width=600,height=600');
    },
    
    fallbackInit() {
      // For older browsers, add fallback button behavior
      document.querySelectorAll('[data-whatsapp-share]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const shareData = {
            title: btn.dataset.videoTitle || 'Check this out',
            url: btn.dataset.shareUrl || window.location.href
          };
          this.fallbackShare(shareData);
        });
      });
    },
    
    showFeedback(button, message) {
      const originalText = button.textContent;
      button.textContent = message;
      button.disabled = true;
      
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WhatsAppShare.init());
  } else {
    WhatsAppShare.init();
  }
})();
