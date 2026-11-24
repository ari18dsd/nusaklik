export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_book_format: number;
  sort_order: number;
  product_count?: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  is_book_format?: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  benefits: string;
  price: number;
  discount_price: number | null;
  is_free: number;
  allow_public_free_download: number;
  is_featured: number;
  is_popular: number;
  is_promo: number;
  is_active: number;
  allow_quantity: number;
  file_format: string;
  file_size_label: string;
  license_type: string;
  cover_url: string;
  cover_aspect_type: 'book' | 'digital';
  digital_file_name: string;
  has_digital_file?: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentStatus =
  | 'menunggu_pembayaran'
  | 'menunggu_verifikasi'
  | 'lunas'
  | 'ditolak';

export type PaymentMethod = 'transfer_bank' | 'qris';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  file_format: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  cover_url?: string;
}

export interface PaymentProof {
  id: number;
  order_id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface OrderStatusHistoryItem {
  id: number;
  order_id: number;
  status: string;
  note: string;
  changed_by: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  buyer_name: string;
  buyer_email: string;
  buyer_whatsapp: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: string;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  proofs?: PaymentProof[];
  status_history?: OrderStatusHistoryItem[];
  rejection_reason?: string;
  access_token?: string;
}

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface StoreSettings {
  store_name: string;
  tagline_main: string;
  tagline_sub: string;
  store_description: string;
  logo_url: string;
  logo_white_url: string;
  banner_hero_url: string;
  banner_promo_url: string;
  banner_promo_title: string;
  banner_promo_subtitle: string;
  watermark_url: string;
  favicon_url: string;
  whatsapp_number: string;
  email: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  qris_image_url: string;
  qris_nmid: string;
  social_instagram: string;
  social_tiktok: string;
  social_youtube: string;
  footer_text: string;
  policy_privacy: string;
  policy_terms: string;
  policy_refund: string;
  purchase_guide: string;
}

export interface AdminDashboardSummary {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  awaiting_payment_orders: number;
  awaiting_verification_orders: number;
  paid_orders: number;
  total_products: number;
  total_customers: number;
  recent_orders: Order[];
}
