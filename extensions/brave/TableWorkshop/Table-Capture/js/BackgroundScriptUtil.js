
function isDomainMatch(host, url) {
  try {
    return new URL(url).host === host;
  } catch (err) {}
  return false;
}
