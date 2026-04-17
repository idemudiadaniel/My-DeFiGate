import KotaniProvider from "./kotaniProvider.js";
import PartnerProvider from "./partnerProvider.js";

const providers = {
  kotani: KotaniProvider,
  partner: PartnerProvider,
};

const providerName = process.env.RAMP_PROVIDER?.toLowerCase() || "kotani";
const selectedProvider = providers[providerName] || KotaniProvider;

export default selectedProvider;