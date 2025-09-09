export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  // Remove tracking parameters
  const urlObj = new URL(url);
  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ];

  trackingParams.forEach((param) => {
    urlObj.searchParams.delete(param);
  });

  return urlObj.toString();
}

export function validateApiKey(key: string, provider: string): boolean {
  if (provider === 'bitly') {
    // Bitly tokens are typically 40 characters
    return /^[a-zA-Z0-9]{40}$/.test(key);
  }
  return true;
}

export function isImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const pathname = parsedUrl.pathname.toLowerCase();
    return imageExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

export function getUrlType(url: string): 'image' | 'video' | 'document' | 'web' {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv'];
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    
    if (imageExtensions.some(ext => pathname.endsWith(ext))) return 'image';
    if (videoExtensions.some(ext => pathname.endsWith(ext))) return 'video';
    if (documentExtensions.some(ext => pathname.endsWith(ext))) return 'document';
    
    return 'web';
  } catch {
    return 'web';
  }
}