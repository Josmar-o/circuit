(function() {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = '/img/favicon.jpg';  
  
    const existingLink = document.querySelector("link[rel*='icon']");
    if (existingLink) {
      existingLink.remove();
    }
  
    document.head.appendChild(link);
  })();
  