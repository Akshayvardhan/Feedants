declare module 'razorpay' {
  interface RazorpayOptions { key_id: string; key_secret: string; }
  interface Order { id: string; amount: number; currency: string; }
  class Razorpay {
    constructor(options: RazorpayOptions);
    orders: { create(options: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<Order> };
  }
  export = Razorpay;
}