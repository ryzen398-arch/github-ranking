import Stripe from "stripe";

export const stripeEnabled = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

// キーが無くてもビルド・起動時にクラッシュしないよう、ダミーキーでフォールバック
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2024-06-20",
});
