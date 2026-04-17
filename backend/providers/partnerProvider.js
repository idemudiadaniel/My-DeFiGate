import dotenv from "dotenv";
dotenv.config();

const PartnerProvider = {
  name: "partner",

  async onramp({ user, amount, currency, channel, callbackUrl }) {
    return {
      provider: "partner",
      status: "pending",
      data: {
        reference: `partner-onramp-${Date.now()}`,
        amount,
        currency,
        channel,
        callback_url: callbackUrl,
      },
      kyc_required: true,
    };
  },

  async offramp({ user, amount, token, phone }) {
    return {
      provider: "partner",
      status: "pending",
      data: {
        reference: `partner-offramp-${Date.now()}`,
        amount,
        token,
        phone,
      },
      kyc_required: true,
    };
  },

  async getRates() {
    return {
      provider: "partner",
      rates: [
        { pair: "NGN/CELO", rate: 0.0001 },
        { pair: "NGN/USDC", rate: 0.00012 },
      ],
    };
  },

  async getTransactionStatus(txId) {
    return {
      provider: "partner",
      txId,
      status: "pending",
    };
  },

  verifyWebhook(req) {
    return true;
  },

  formatError(error) {
    return error?.message || "Partner provider request failed";
  },
};

export default PartnerProvider;
