import type { ContactMethod } from "@/constants/site";

/** 公开可读的商家字段（不含 phone / wechat_id，见规格 13.6） */
export const PUBLIC_PROVIDER_COLUMNS =
  "id, city_id, source, name, category, categories, custom_service, sub_tags, service_areas, service_zips, has_wechat, languages, avatar_url, tagline, is_licensed, license_status, is_insured, emergency_24h, price_note, description, recommend_count, member_recommend_count, is_claimed, status, is_founding, founding_rank, founding_started_at, founding_expires_at, category_rank, approved_at, created_at, contact_methods, contact_pref";

export interface PublicProvider {
  id: string;
  city_id: string;
  source: string;
  name: string;
  /** 主营分类，等于 categories[0] */
  category: string;
  /** 1-3 个分类，第一个是主营 */
  categories: string[];
  custom_service: string | null;
  sub_tags: string[];
  service_areas: string[];
  service_zips: string[];
  has_wechat: boolean;
  languages: string[];
  avatar_url: string | null;
  tagline: string | null;
  is_licensed: boolean;
  license_status: string;
  is_insured: boolean;
  emergency_24h: boolean;
  price_note: string | null;
  description: string | null;
  recommend_count: number;
  /** 登录邻居的有效推荐数；为 0 且有推荐 = 全是匿名推荐，名片上显示“匿名推荐”小标志 */
  member_recommend_count: number;
  is_claimed: boolean;
  status: "pending" | "active" | "paused" | "hidden";
  is_founding: boolean;
  founding_rank: number | null;
  founding_started_at: string | null;
  founding_expires_at: string | null;
  category_rank: number | null;
  approved_at: string | null;
  created_at: string;
  contact_methods: ContactMethod[];
  contact_pref: ContactMethod;
}

export interface PublicRecommendation {
  id: string;
  provider_id: string;
  recommender_area: string;
  service_item: string | null;
  cost_approx: string | null;
  comment: string;
  created_at: string;
  /** 没登录的邻居写的 */
  is_anonymous?: boolean;
}
