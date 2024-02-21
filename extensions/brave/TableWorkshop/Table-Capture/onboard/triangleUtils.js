function clearTriangles(element) {
  element.style.backgroundImage = "";
}

function trianglifyElement(element, xColors, clobber = false) {
  function getDataUrl(xColors, useLocalStorage) {
    if (useLocalStorage && window.localStorage.loadingTriangles) {
      return window.localStorage.loadingTriangles;
    }

    const pattern = Trianglify({
      width: window.innerWidth + 300,
      height: window.innerHeight + 200,
      cell_size: 150,
      x_colors: xColors,
    });

    return pattern.canvas().toDataURL();
  }

  try {
    const dataUrl = getDataUrl(xColors, !clobber);
    element.style.backgroundImage = `url(${dataUrl})`;

    if (!window.localStorage.loadingTriangles || clobber) {
      window.localStorage.loadingTriangles = dataUrl;
    }
  } catch (err) {
    return Promise.reject(err);
  }
  return Promise.resolve();
}
