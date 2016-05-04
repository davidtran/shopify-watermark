function getImageVersionBySrc(src) {
  var startPoint = src.indexOf('=');
  return src.substr(startPoint + 1);
}