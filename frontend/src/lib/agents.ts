// Static mirror of the backend agent registry, used to render the team
// panel before any question is asked (and if the backend is offline).

export interface AgentMeta {
  key: string;
  name: string;
  name_hi: string;
  emoji: string;
  description: string;
}

export const AGENTS: AgentMeta[] = [
  {
    key: "crop",
    name: "Crop Advisor",
    name_hi: "फ़सल सलाहकार",
    emoji: "🌾",
    description: "Sowing, varieties, fertiliser, yield",
  },
  {
    key: "pest",
    name: "Pest & Disease Expert",
    name_hi: "कीट-रोग विशेषज्ञ",
    emoji: "🐛",
    description: "Identify and treat pests & diseases",
  },
  {
    key: "weather",
    name: "Weather & Irrigation",
    name_hi: "मौसम और सिंचाई",
    emoji: "🌦️",
    description: "Live 7-day forecast, spray timing",
  },
  {
    key: "market",
    name: "Mandi Price Analyst",
    name_hi: "मंडी भाव विश्लेषक",
    emoji: "📈",
    description: "Live mandi prices, when to sell",
  },
  {
    key: "schemes",
    name: "Govt Schemes Guide",
    name_hi: "सरकारी योजना गाइड",
    emoji: "🏛️",
    description: "PM-KISAN, KCC, insurance, subsidies",
  },
  {
    key: "soil",
    name: "Soil Health Advisor",
    name_hi: "मिट्टी सलाहकार",
    emoji: "🪱",
    description: "Soil testing, pH, nutrients",
  },
];

export const SAMPLE_QUESTIONS = [
  "गेहूं में पीले पत्ते आ रहे हैं, क्या करूं?",
  "What is today's onion price in Maharashtra?",
  "Pune me agle hafte barish hogi kya? Spray kab karun?",
  "PM-KISAN के लिए आवेदन कैसे करें?",
  "टमाटर की फसल के लिए कौन सी खाद डालें?",
  "My soil is too alkaline, how to fix it?",
];
