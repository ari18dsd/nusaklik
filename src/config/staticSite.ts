export const IS_STATIC_SITE = import.meta.env.MODE === 'github-pages';

export const STATIC_SITE_CONFIG = {
  contactEmail: '',
  whatsappNumber: '',
  paymentInstructions: '',
};

export function siteAsset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
