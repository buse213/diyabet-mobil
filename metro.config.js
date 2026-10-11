const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// .onnx ve olası model ağırlık dosyalarının uzantılarını sisteme tanıtıyoruz
config.resolver.assetExts.push('onnx', 'ort', 'bin');

module.exports = config;