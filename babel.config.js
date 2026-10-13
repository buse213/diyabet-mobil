module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Eğer başka eklentilerin varsa buraya yazılır
      'react-native-reanimated/plugin' // KESİNLİKLE EN SONDA OLMALI
    ],
  };
};