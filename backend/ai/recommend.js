module.exports = ({ ph }) => {
  if (ph < 6) return { recommended_crop: "Millets", explanation: "Low pH suitable" };
  if (ph <= 7) return { recommended_crop: "Wheat", explanation: "Neutral soil ideal" };
  return { recommended_crop: "Cotton", explanation: "High pH resistant" };
};
